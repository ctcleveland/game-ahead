// app.js - Game Ahead PWA (balldontlie for Philadelphia NBA teams only)

const API_BASE = "https://www.thesportsdb.com/api/v1/json/123/";
const BDL_BASE = "https://www.balldontlie.io/api/v1";

// Hard-coded balldontlie NBA IDs — ONLY Philadelphia teams
const nbaPhillyTeamIds = {
  "Philadelphia 76ers": 23
  // No other Philly NBA team exists, so only this one
};

let selectedTeams = JSON.parse(localStorage.getItem("selectedTeams")) || [];
let userTimezone = localStorage.getItem("timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone;

// DOM elements
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

// Team search with city-mode fallback (unchanged)
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

    // Nickname → full name fallback (Philadelphia focus)
    const nicknameFallback = {
      "76ers":    "Philadelphia 76ers",
      "sixers":   "Philadelphia 76ers",
      "eagles":   "Philadelphia Eagles",
      "flyers":   "Philadelphia Flyers",
      "phillies": "Philadelphia Phillies",
      "union":    "Philadelphia Union"
    };

    const lower = query.toLowerCase();
    if (cityMode && nicknameFallback[lower]) {
      primaryQuery = nicknameFallback[lower];
    }

    try {
      let res = await fetch(`${API_BASE}searchteams.php?t=${encodeURIComponent(primaryQuery)}`);
      let data = await res.json();
      let teams = data.teams || [];

      if (cityMode && teams.length === 0) {
        res = await fetch(`${API_BASE}searchteams.php?t=${encodeURIComponent(query)}`);
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

// Load games: balldontlie for Philly NBA, TheSportsDB fallback for others
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
    console.log(`Fetching games for ${team.name} (league: ${team.league}, ID: ${team.id})`);

    if (team.league === "NBA" && nbaPhillyTeamIds[team.name]) {
      // balldontlie for Philadelphia 76ers only
      const bdlId = nbaPhillyTeamIds[team.name];
      try {
        const startDate = now.toISOString().split('T')[0];
        const res = await fetch(`${BDL_BASE}/games?team_ids[]=${bdlId}&start_date=${startDate}`);
        const data = await res.json();
        console.log(`balldontlie raw games for ${team.name}:`, data.data.length, data.data);

        for (const game of data.data) {
          const gameTime = new Date(game.datetime);
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
              homeTeam: game.home_team.full_name,
              awayTeam: game.visitor_team.full_name,
              localTime,
              broadcasts: "Check NBA League Pass / ESPN / local listings",
              league: "NBA"
            });
          }
        }
      } catch (err) {
        console.error(`balldontlie fetch failed for ${team.name}:`, err);
      }
    } else {
      // TheSportsDB fallback for all other teams (including Philly non-NBA)
      try {
        const res = await fetch(`${API_BASE}eventsnext.php?id=${team.id}`);
        const data = await res.json();
        const events = data.events || [];
        console.log(`TheSportsDB raw events for ${team.name}:`, events.length);

        for (const event of events) {
          const eventUTC = new Date(`${event.dateEvent}T${event.strTime || '00:00:00'}Z`);
          if (isNaN(eventUTC.getTime())) continue;

          if (eventUTC > now && eventUTC < in30days) {
            const localTime = eventUTC.toLocaleString("en-US", {
              timeZone: userTimezone,
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true
            });

            let broadcasts = "TBD / Check listings";
            try {
              const tvRes = await fetch(`${API_BASE}lookuptv.php?id=${event.idEvent}`);
              const tvData = await tvRes.json();
              const tvList = tvData.tv || [];
              if (tvList.length > 0) {
                broadcasts = tvList.map(t => t.strChannel).filter(Boolean).join(", ");
              }
            } catch {}

            allGames.push({
              homeTeam: event.strHomeTeam,
              awayTeam: event.strAwayTeam,
              localTime,
              broadcasts,
              league: team.league || event.strLeague
            });
          }
        }
      } catch (err) {
        console.error(`TheSportsDB fetch failed for ${team.name}:`, err);
      }
    }
  }

  allGames.sort((a, b) => new Date(a.localTime) - new Date(b.localTime));

  if (allGames.length === 0) {
    gamesContainer.innerHTML = "<p>No upcoming games found in the next 30 days (some sports have limited future data in free APIs).</p>";
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
