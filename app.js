// app.js - Game Ahead PWA (dynamic team ID lookup with API-Sports.io)

const API_KEY = "7ed34d0b99ba3829f677cb5483a76c15";  // Replace with your real API-Sports key

// Base URLs per sport
const BASE_URLS = {
  "NBA": "https://v2.nba.api-sports.io/",
  "NFL": "https://v1.american-football.api-sports.io/",
  "MLB": "https://v1.baseball.api-sports.io/",
  "NHL": "https://v1.hockey.api-sports.io/",
  "MLS": "https://v3.football.api-sports.io/"  // MLS is under football API
};

let selectedTeams = JSON.parse(localStorage.getItem("selectedTeams")) || [];
let userTimezone = localStorage.getItem("timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone;

// DOM elements (same)
const menuBtn = document.getElementById("menu-btn");
const overlay = document.getElementById("settings-overlay");
const closeBtn = document.getElementById("close-settings");
const tzSelect = document.getElementById("tz-select");
const cityModeCheckbox = document.getElementById("city-mode");
const teamSearch = document.getElementById("team-search");
const searchResults = document.getElementById("search-results");
const selectedList = document.getElementById("selected-teams-list");
const saveBtn = document.getElementById("save-settings");
const gamesContainer = document.getElementById("games-container");
const currentTzSpan = document.getElementById("current-tz");

// Initial setup
updateTimezoneDisplay();
populateTimezoneSelect();
renderSelectedTeams();
loadGames();

menuBtn.addEventListener("click", () => { overlay.classList.remove("hidden"); renderSelectedTeams(); });
closeBtn.addEventListener("click", () => overlay.classList.add("hidden"));
saveBtn.addEventListener("click", () => {
  localStorage.setItem("timezone", userTimezone);
  localStorage.setItem("selectedTeams", JSON.stringify(selectedTeams));
  updateTimezoneDisplay();
  loadGames();
  overlay.classList.add("hidden");
});

// Timezone handling (unchanged)
function populateTimezoneSelect() {
  const zones = [
    { value: "America/New_York",     label: "Eastern Time (ET)" },
    { value: "America/Chicago",      label: "Central Time (CT)" },
    { value: "America/Denver",       label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles",  label: "Pacific Time (PT)" },
    { value: "America/Phoenix",      label: "Arizona Time (MST no DST)" },
    { value: "Pacific/Honolulu",     label: "Hawaii Time (HST)" },
    { value: Intl.DateTimeFormat().resolvedOptions().timeZone, label: "Device Default" }
  ];

  tzSelect.innerHTML = "";
  zones.forEach(z => {
    const opt = document.createElement("option");
    opt.value = z.value;
    opt.textContent = z.label;
    if (z.value === userTimezone) opt.selected = true;
    tzSelect.appendChild(opt);
  });
}

tzSelect.addEventListener("change", (e) => {
  userTimezone = e.target.value;
  updateTimezoneDisplay();
});

function updateTimezoneDisplay() {
  const selectedOption = tzSelect.options[tzSelect.selectedIndex];
  currentTzSpan.textContent = selectedOption ? selectedOption.textContent : userTimezone;
}

// Team search (unchanged)
let searchTimer;
teamSearch.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    let query = teamSearch.value.trim();
    searchResults.innerHTML = "";
    if (query.length < 3) return;

    searchResults.innerHTML = "<li>Loading...</li>";

    const cityMode = cityModeCheckbox.checked;
    let primaryQuery = query;

    const nicknameFallback = {
      "76ers":    "Philadelphia 76ers",
      "sixers":   "Philadelphia 76ers",
      "eagles":   "Philadelphia Eagles",
      "flyers":   "Philadelphia Flyers",
      "phillies": "Philadelphia Phillies",
      "union":    "Philadelphia Union",
      "lakers":   "Los Angeles Lakers"
    };

    const lower = query.toLowerCase();
    if (cityMode && nicknameFallback[lower]) {
      primaryQuery = nicknameFallback[lower];
    }

    try {
      let res = await fetch(`${THESPORTS_BASE}searchteams.php?t=${encodeURIComponent(primaryQuery)}`);
      let data = await res.json();
      let teams = data.teams || [];

      if (cityMode && teams.length === 0) {
        res = await fetch(`${THESPORTS_BASE}searchteams.php?t=${encodeURIComponent(query)}`);
        data = await res.json();
        teams = data.teams || [];
      }

      renderSearchResults(teams);
    } catch (err) {
      searchResults.innerHTML = "<li>Error loading teams – try again</li>";
      console.error(err);
    }
  }, 500);
});

function renderSearchResults(teams) {
  searchResults.innerHTML = "";
  if (teams.length === 0) {
    searchResults.innerHTML = "<li>No teams found – try city or full name</li>";
    return;
  }

  teams.forEach(team => {
    if (!team.idTeam) return;
    const li = document.createElement("li");
    li.textContent = `${team.strTeam} (${team.strLeague || team.strSport || 'Unknown'})`;
    li.addEventListener("click", () => {
      if (!selectedTeams.some(t => t.id === team.idTeam)) {
        selectedTeams.push({
          id: team.idTeam,
          name: team.strTeam,
          sport: team.strSport || "",
          league: team.strLeague || ""
        });
        renderSelectedTeams();
      }
      teamSearch.value = "";
      searchResults.innerHTML = "";
    });
    searchResults.appendChild(li);
  });
}

function renderSelectedTeams() {
  selectedList.innerHTML = "";
  if (selectedTeams.length === 0) {
    selectedList.innerHTML = "<li>No teams selected yet</li>";
    return;
  }

  selectedTeams.forEach((team, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `${team.name} <small>(${team.league || team.sport})</small>
      <button data-idx="${idx}">×</button>`;
    li.querySelector("button").addEventListener("click", (e) => {
      e.stopPropagation();
      selectedTeams.splice(idx, 1);
      renderSelectedTeams();
    });
    selectedList.appendChild(li);
  });
}

// Load games using API-Sports.io with dynamic team ID lookup
async function loadGames() {
  if (selectedTeams.length === 0) {
    gamesContainer.innerHTML = "<p>Add teams in settings to see games!</p>";
    return;
  }

  gamesContainer.innerHTML = "<p>Loading upcoming games...</p>";

  const now = new Date();
  const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let allGames = [];

  for (const team of selectedTeams) {
    const sport = team.league?.toLowerCase() || team.sport?.toLowerCase() || "";
    let baseUrl = "";
    let endpoint = "games";

    // Map sport to API-Sports base URL
    if (sport.includes("basketball") || sport === "nba") {
      baseUrl = "https://v2.nba.api-sports.io/";
    } else if (sport.includes("american football") || sport === "nfl") {
      baseUrl = "https://v1.american-football.api-sports.io/";
    } else if (sport.includes("baseball") || sport === "mlb") {
      baseUrl = "https://v1.baseball.api-sports.io/";
    } else if (sport.includes("hockey") || sport === "nhl") {
      baseUrl = "https://v1.hockey.api-sports.io/";
    } else if (sport.includes("soccer") || sport === "mls") {
      baseUrl = "https://v3.football.api-sports.io/";
    } else {
      gamesContainer.innerHTML += `<p>Unsupported sport for ${team.name} (${sport})</p>`;
      continue;
    }

    console.log(`Looking up API-Sports ID for ${team.name} (${sport})`);

    // Step 1: Dynamic lookup of team ID by name
    let apiTeamId = null;
    try {
      const headers = { "x-apisports-key": API_KEY };
      const res = await fetch(`${baseUrl}teams?search=${encodeURIComponent(team.name)}`, { headers });
      const data = await res.json();
      console.log(`Team search result for ${team.name}:`, data);

      if (data.response && data.response.length > 0) {
        // Take the first match (usually correct if name is unique)
        apiTeamId = data.response[0].id;
        console.log(`Found API-Sports ID ${apiTeamId} for ${team.name}`);
      } else {
        console.warn(`No team ID found for ${team.name} in ${sport}`);
      }
    } catch (err) {
      console.error(`Team ID lookup failed for ${team.name}:`, err);
    }

    if (!apiTeamId) continue;

    // Step 2: Fetch games using the dynamic ID
    try {
      const headers = { "x-apisports-key": API_KEY };
      const startDate = now.toISOString().split('T')[0];
      const res = await fetch(`${baseUrl}${endpoint}?team=${apiTeamId}&date=${startDate}`, { headers });
      const data = await res.json();
      console.log(`API-Sports raw games for ${team.name}:`, data.response?.length || 0, data.response);

      if (data.response) {
        for (const game of data.response) {
          const gameTime = new Date(game.date.start || game.date);
          if (isNaN(gameTime.getTime())) continue;

          if (gameTime > now && gameTime < in30days) {
            const localTime = gameTime.toLocaleString("en-US", {
              timeZone: userTimezone,
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true
            });

            allGames.push({
              homeTeam: game.teams.home.name || game.teams.home,
              awayTeam: game.teams.visitors.name || game.teams.away,
              localTime,
              broadcasts: "Check local listings / League Pass / ESPN / Fox / CBS",
              league: team.league || sport.toUpperCase()
            });
          }
        }
      }
    } catch (err) {
      console.error(`Games fetch failed for ${team.name}:`, err);
    }
  }

  allGames.sort((a, b) => new Date(a.localTime) - new Date(b.localTime));

  if (allGames.length === 0) {
    gamesContainer.innerHTML = "<p>No upcoming games found in the next 30 days (check console for API details).</p>";
    return;
  }

  gamesContainer.innerHTML = "";
  allGames.forEach(game => {
    const card = document.createElement("div");
    card.className = "game-card";
    card.innerHTML = `
      <div class="game-header">
        <div class="teams">${game.awayTeam} @ ${game.homeTeam}</div>
        <div class="time">${game.localTime}</div>
      </div>
      <div class="league">${game.league}</div>
      <div class="broadcast"><strong>Watch:</strong> ${game.broadcasts}</div>
    `;
    gamesContainer.appendChild(card);
  });
}
