// app.js - Core logic for Game Ahead PWA

const API_BASE = "https://www.thesportsdb.com/api/v1/json/123/"; // Free demo key

// Load saved data from localStorage
let selectedTeams = JSON.parse(localStorage.getItem("selectedTeams")) || []; // array of {id, name, sport, league}
let userTimezone = localStorage.getItem("timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone;

// DOM elements
const menuBtn = document.getElementById("menu-btn");
const overlay = document.getElementById("settings-overlay");
const closeBtn = document.getElementById("close-settings");
const tzSelect = document.getElementById("tz-select");
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
loadGames(); // will show placeholder if no teams

// Hamburger menu open/close
menuBtn.addEventListener("click", () => {
  overlay.classList.remove("hidden");
  renderSelectedTeams();
});
closeBtn.addEventListener("click", () => overlay.classList.add("hidden"));
saveBtn.addEventListener("click", () => {
  localStorage.setItem("timezone", userTimezone);
  localStorage.setItem("selectedTeams", JSON.stringify(selectedTeams));
  updateTimezoneDisplay();
  loadGames();
  overlay.classList.add("hidden");
});

// Timezone picker
function populateTimezoneSelect() {
  const zones = [
    {value: "America/New_York", label: "Eastern Time (ET)"},
    {value: "America/Chicago", label: "Central Time (CT)"},
    {value: "America/Denver", label: "Mountain Time (MT)"},
    {value: "America/Los_Angeles", label: "Pacific Time (PT)"},
    {value: "America/Phoenix", label: "Arizona Time (MST no DST)"},
    {value: Intl.DateTimeFormat().resolvedOptions().timeZone, label: "Device Default"}
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
  const label = tzSelect.options[tzSelect.selectedIndex]?.textContent || userTimezone;
  currentTzSpan.textContent = label;
}

// Team search (debounced to avoid spamming API)
let searchTimer;
teamSearch.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    const query = teamSearch.value.trim();
    if (query.length < 3) {
      searchResults.innerHTML = "";
      return;
    }
    try {
      const res = await fetch(`${API_BASE}searchteams.php?t=${encodeURIComponent(query)}`);
      const data = await res.json();
      const teams = data.teams || [];
      renderSearchResults(teams);
    } catch (err) {
      searchResults.innerHTML = "<li>Search error – try again</li>";
    }
  }, 400);
});

function renderSearchResults(teams) {
  searchResults.innerHTML = "";
  if (teams.length === 0) {
    searchResults.innerHTML = "<li>No teams found</li>";
    return;
  }
  teams.forEach(team => {
    if (!team.idTeam) return;
    const li = document.createElement("li");
    li.textContent = `${team.strTeam} (${team.strSport || "?"} - ${team.strLeague || "?"})`;
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
    li.innerHTML = `${team.name} <small>(${team.sport} - ${team.league})</small>
      <button data-idx="${idx}">×</button>`;
    li.querySelector("button").addEventListener("click", (e) => {
      e.stopPropagation();
      selectedTeams.splice(idx, 1);
      renderSelectedTeams();
    });
    selectedList.appendChild(li);
  });
}

// Placeholder games load (shows loading or no teams message)
async function loadGames() {
  gamesContainer.innerHTML = "<p>Loading your upcoming games...</p>";

  if (selectedTeams.length === 0) {
    gamesContainer.innerHTML = "<p>Add teams in settings to see games!</p>";
    return;
  }

  // TODO: Fetch real games – stub for now
  gamesContainer.innerHTML = "<p>Selected teams loaded! (Games fetch coming next)</p>";
}
