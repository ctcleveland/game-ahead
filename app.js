// app.js - Game Ahead PWA with league cascading selector

const API_BASE = "https://www.thesportsdb.com/api/v1/json/123/";
let selectedTeams = JSON.parse(localStorage.getItem("selectedTeams")) || [];
let userTimezone = localStorage.getItem("timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone;

const leagues = [
  {id: "4391", name: "NFL"},
  {id: "4387", name: "NBA"},
  {id: "4424", name: "MLB"},
  {id: "4380", name: "NHL"},
  {id: "4346", name: "MLS"}
];

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
populateLeagueSelect();
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

// Timezone
function populateTimezoneSelect() { /* same as before */ }
tzSelect.addEventListener("change", (e) => { userTimezone = e.target.value; updateTimezoneDisplay(); });
function updateTimezoneDisplay() { /* same as before */ }

// Leagues dropdown
function populateLeagueSelect() {
  leagueSelect.innerHTML = '<option value="">Select a league</option>';
  leagues.forEach(l => {
    const opt = document.createElement("option");
    opt.value = l.id;
    opt.textContent = l.name;
    leagueSelect.appendChild(opt);
  });
}

leagueSelect.addEventListener("change", async (e) => {
  const leagueId = e.target.value;
  if (!leagueId) {
    leagueTeamsList.innerHTML = "";
    return;
  }
  try {
    const res = await fetch(`${API_BASE}lookup_all_teams.php?id=${leagueId}`);
    const data = await res.json();
    const teams = data.teams || [];
    renderLeagueTeams(teams.sort((a,b) => a.strTeam.localeCompare(b.strTeam)));
  } catch (err) {
    leagueTeamsList.innerHTML = "<li>Error loading teams</li>";
  }
});

function renderLeagueTeams(teams) {
  leagueTeamsList.innerHTML = "";
  teams.forEach(team => {
    if (!team.idTeam) return;
    const li = document.createElement("li");
    li.textContent = team.strTeam;
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
    });
    leagueTeamsList.appendChild(li);
  });
}

function renderSelectedTeams() { /* same as before */ }

// Placeholder loadGames
async function loadGames() { /* same as before */ }
