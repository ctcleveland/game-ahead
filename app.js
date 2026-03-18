// app.js - Game Ahead PWA using api-sports.io for all API calls

const API_KEY = "7ed34d0b99ba3829f677cb5483a76c15";  // Replace with your real API-Sports key

// Base URLs per sport
const BASE_URLS = {
  "NBA": "https://v2.nba.api-sports.io/",
  "NFL": "https://v1.american-football.api-sports.io/",
  "MLB": "https://v1.baseball.api-sports.io/",
  "NHL": "https://v1.hockey.api-sports.io/",
  "MLS": "https://v3.football.api-sports.io/"  // MLS under football
};

// League IDs for major US leagues (fixed for dropdown)
const LEAGUE_IDS = {
  "NBA": 1,  // Example NBA league ID - verify if needed
  "NFL": 1,  // NFL regular season ID
  "MLB": 1,  // MLB
  "NHL": 1,  // NHL
  "MLS": 253  // MLS ID in football API
};

let selectedTeams = JSON.parse(localStorage.getItem("selectedTeams")) || [];
let userTimezone = localStorage.getItem("timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone;

// DOM elements
const menuBtn = document.getElementById("menu-btn");
const overlay = document.getElementById("settings-overlay");
const closeBtn = document.getElementById("close-settings");
const tzSelect = document.getElementById("tz-select");
const leagueSelect = document.getElementById("league-select");
const leagueTeamsList = document.getElementById("league-teams-list");
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

// League selection (dynamic team list from api-sports.io)
// League selection - fetch teams for the selected sport
leagueSelect.addEventListener("change", async (e) => {
  const sport = e.target.value;
  leagueTeamsList.innerHTML = "";

  if (!sport) return;

  leagueTeamsList.innerHTML = "<li>Loading teams...</li>";

  const baseUrl = BASE_URLS[sport];
  if (!baseUrl) {
    leagueTeamsList.innerHTML = "<li>Invalid league selected</li>";
    return;
  }

  try {
    const headers = { "x-apisports-key": API_KEY };
    // For NBA: /teams (no league param needed)
    // For other sports, add ?league=ID if required - test individually
    let url = `${baseUrl}teams`;
    if (sport !== "NBA") {
      // Example for other sports - adjust ID per sport
      url += `?league=${LEAGUE_IDS[sport]}`;
    }

    const res = await fetch(url, { headers });
    const data = await res.json();
    console.log(`Teams fetch result for ${sport}:`, data);

    let teams = [];
    if (data.response) {
      teams = data.response;
    } else if (data.results) {
      teams = data.response || [];  // some APIs use different structure
    }

    if (teams.length === 0) {
      leagueTeamsList.innerHTML = "<li>No teams found for this league (check console)</li>";
      return;
    }

    // Sort alphabetically by name
    teams.sort((a, b) => (a.name || a.team?.name || "").localeCompare(b.name || b.team?.name || ""));

    renderLeagueTeams(teams);
  } catch (err) {
    leagueTeamsList.innerHTML = "<li>Error loading teams – check console or API key</li>";
    console.error("Team fetch error:", err);
  }
});

function renderLeagueTeams(teams) {
  leagueTeamsList.innerHTML = "";
  teams.forEach(team => {
    const teamName = team.name || team.team?.name || "Unknown";
    const teamId = team.id || team.team?.id;

    if (!teamId || !teamName) return;

    const li = document.createElement("li");
    li.textContent = teamName;
    li.addEventListener("click", () => {
      if (!selectedTeams.some(t => t.apiId === teamId)) {
        selectedTeams.push({
          name: teamName,
          league: leagueSelect.value,
          apiId: teamId
        });
        renderSelectedTeams();
      }
    });
    leagueTeamsList.appendChild(li);
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
    li.innerHTML = `${team.name} <small>(${team.league})</small>
      <button data-idx="${idx}">×</button>`;
    li.querySelector("button").addEventListener("click", (e) => {
      e.stopPropagation();
      selectedTeams.splice(idx, 1);
      renderSelectedTeams();
    });
    selectedList.appendChild(li);
  });
}

// Load games using API-Sports.io
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
    const baseUrl = BASE_URLS[team.league];
    if (!baseUrl) continue;

    console.log(`Fetching games for ${team.name} (${team.league}, API ID: ${team.apiId})`);

    try {
      const headers = { "x-apisports-key": API_KEY };
      const startDate = now.toISOString().split('T')[0];
      const res = await fetch(`${baseUrl}games?team=${team.apiId}&date=${startDate}`, { headers });
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
              league: team.league
            });
          }
        }
      }
    } catch (err) {
      console.error(`API-Sports fetch failed for ${team.name}:`, err);
    }
  }

  allGames.sort((a, b) => new Date(a.localTime) - new Date(b.localTime));

  if (allGames.length === 0) {
    gamesContainer.innerHTML = "<p>No upcoming games found in the next 30 days (check console for details).</p>";
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
