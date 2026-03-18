// app.js - Game Ahead PWA (with real upcoming games fetch)

const API_BASE = "https://www.thesportsdb.com/api/v1/json/123/";

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
  loadGames();  // refresh games after save
  overlay.classList.add("hidden");
});

// Timezone handling
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

// Team search with city-mode fallback
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

    // Nickname → full name fallback (expand as needed)
    const nicknameFallback = {
      "76ers":    "Philadelphia 76ers",
      "sixers":   "Philadelphia 76ers",
      "eagles":   "Philadelphia Eagles",
      "flyers":   "Philadelphia Flyers",
      "phillies": "Philadelphia Phillies",
      "union":    "Philadelphia Union",
      "lakers":   "Los Angeles Lakers",
      "celtics":  "Boston Celtics",
      "warriors": "Golden State Warriors",
      "knicks":   "New York Knicks",
      "nets":     "Brooklyn Nets",
      "heat":     "Miami Heat",
      "suns":     "Phoenix Suns",
      "nuggets":  "Denver Nuggets",
      // Add more teams here over time
    };

    const lower = query.toLowerCase();
    if (cityMode && nicknameFallback[lower]) {
      primaryQuery = nicknameFallback[lower];
    }

    try {
      let res = await fetch(`${API_BASE}searchteams.php?t=${encodeURIComponent(primaryQuery)}`);
      let data = await res.json();
      let teams = data.teams || [];

      // Fallback to original query if nothing found in city mode
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

// ────────────────────────────────────────────────
// Fetch and display upcoming games (next 7 days)
// ────────────────────────────────────────────────
async function loadGames() {
  if (selectedTeams.length === 0) {
    gamesContainer.innerHTML = "<p>Add teams in settings to see games!</p>";
    return;
  }

  gamesContainer.innerHTML = "<p>Loading upcoming games...</p>";

  const now = new Date();
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let allGames = [];

  for (const team of selectedTeams) {
    try {
      const res = await fetch(`${API_BASE}eventsnext.php?id=${team.id}`);
      const data = await res.json();
      const events = data.events || [];

      for (const event of events) {
        // Parse event date + time (API gives dateEvent + strTime in UTC)
        const eventUTC = new Date(`${event.dateEvent}T${event.strTime}Z`);
        if (isNaN(eventUTC.getTime())) continue; // skip invalid dates

        // Filter next 7 days
        if (eventUTC > now && eventUTC < in7days) {
          // Get local time in user's timezone
          const localTime = eventUTC.toLocaleString("en-US", {
            timeZone: userTimezone,
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true
          });

          // Fetch broadcast info
          let broadcasts = "TBD / Check listings";
          try {
            const tvRes = await fetch(`${API_BASE}lookuptv.php?id=${event.idEvent}`);
            const tvData = await tvRes.json();
            const tvList = tvData.tv || [];
            if (tvList.length > 0) {
              broadcasts = tvList.map(t => t.strChannel).filter(Boolean).join(", ");
            }
          } catch (tvErr) {
            console.warn("Broadcast fetch failed", tvErr);
          }

          allGames.push({
            ...event,
            localTime,
            broadcasts,
            homeTeam: event.strHomeTeam,
            awayTeam: event.strAwayTeam,
            league: team.league || event.strLeague
          });
        }
      }
    } catch (err) {
      console.error(`Failed to load games for team ${team.name}`, err);
    }
  }

  // Sort by date/time
  allGames.sort((a, b) => new Date(a.dateEvent + " " + a.strTime) - new Date(b.dateEvent + " " + b.strTime));

  // Render
  if (allGames.length === 0) {
    gamesContainer.innerHTML = "<p>No upcoming games in the next 7 days for your teams.</p>";
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
