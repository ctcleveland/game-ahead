// app.js - Game Ahead PWA with search-based team selection

const API_BASE = "https://www.thesportsdb.com/api/v1/json/123/";

let selectedTeams = JSON.parse(localStorage.getItem("selectedTeams")) || [];
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

// Timezone population (fixed)
function populateTimezoneSelect() {
  const zones = [
    {value: "America/New_York", label: "Eastern Time (ET)"},
    {value: "America/Chicago", label: "Central Time (CT)"},
    {value: "America/Denver", label: "Mountain Time (MT)"},
    {value: "America/Los_Angeles", label: "Pacific Time (PT)"},
    {value: "America/Phoenix", label: "Arizona Time (MST no DST)"},
    {value: "Pacific/Honolulu", label: "Hawaii Time (HST)"},
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
  const selectedOption = tzSelect.options[tzSelect.selectedIndex];
  currentTzSpan.textContent = selectedOption ? selectedOption.textContent : userTimezone;
}

// Team search (debounced)
let searchTimer;
teamSearch.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    const query = teamSearch.value.trim();
    searchResults.innerHTML = query.length >= 3 ? "<li>Loading...</li>" : "";
    if (query.length < 3) return;
    try {
      const res = await fetch(`${API_BASE}searchteams.php?t=${encodeURIComponent(query)}`);
      const data = await res.json();
      const teams = data.teams || [];
      renderSearchResults(teams);
    } catch (err) {
      searchResults.innerHTML = "<li>Error loading teams - try again</li>";
    }
  }, 500);
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

// Placeholder games
async function loadGames() {
  gamesContainer.innerHTML = selectedTeams.length === 0 
    ? "<p>Add teams in settings to see games!</p>"
    : "<p>Teams selected! Games coming next update.</p>";
}
