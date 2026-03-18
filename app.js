
// app.js - Game Ahead PWA (api-sports.io for everything + official team filtering)

const API_KEY = "7ed34d0b99ba3829f677cb5483a76c15";  // ← Replace with your real API-Sports key

const BASE_URLS = {
  "NBA": "https://v2.nba.api-sports.io/",
  "NFL": "https://v1.american-football.api-sports.io/",
  "MLB": "https://v1.baseball.api-sports.io/",
  "NHL": "https://v1.hockey.api-sports.io/",
  "MLS": "https://v3.football.api-sports.io/"
};

// Official current teams (only real franchises - no affiliates/minors)
const OFFICIAL_TEAMS = {
  "NBA": [
    "Atlanta Hawks","Boston Celtics","Brooklyn Nets","Charlotte Hornets","Chicago Bulls",
    "Cleveland Cavaliers","Dallas Mavericks","Denver Nuggets","Detroit Pistons",
    "Golden State Warriors","Houston Rockets","Indiana Pacers","Los Angeles Clippers",
    "Los Angeles Lakers","Memphis Grizzlies","Miami Heat","Milwaukee Bucks",
    "Minnesota Timberwolves","New Orleans Pelicans","New York Knicks",
    "Oklahoma City Thunder","Orlando Magic","Philadelphia 76ers","Phoenix Suns",
    "Portland Trail Blazers","Sacramento Kings","San Antonio Spurs","Toronto Raptors",
    "Utah Jazz","Washington Wizards"
  ],
  "NFL": [
    "Arizona Cardinals","Atlanta Falcons","Baltimore Ravens","Buffalo Bills","Carolina Panthers",
    "Chicago Bears","Cincinnati Bengals","Cleveland Browns","Dallas Cowboys","Denver Broncos",
    "Detroit Lions","Green Bay Packers","Houston Texans","Indianapolis Colts","Jacksonville Jaguars",
    "Kansas City Chiefs","Las Vegas Raiders","Los Angeles Chargers","Los Angeles Rams",
    "Miami Dolphins","Minnesota Vikings","New England Patriots","New Orleans Saints",
    "New York Giants","New York Jets","Philadelphia Eagles","Pittsburgh Steelers",
    "San Francisco 49ers","Seattle Seahawks","Tampa Bay Buccaneers","Tennessee Titans",
    "Washington Commanders"
  ],
  "MLB": [
    "Arizona Diamondbacks","Atlanta Braves","Baltimore Orioles","Boston Red Sox","Chicago Cubs",
    "Chicago White Sox","Cincinnati Reds","Cleveland Guardians","Colorado Rockies",
    "Detroit Tigers","Houston Astros","Kansas City Royals","Los Angeles Angels",
    "Los Angeles Dodgers","Miami Marlins","Milwaukee Brewers","Minnesota Twins",
    "New York Mets","New York Yankees","Oakland Athletics","Philadelphia Phillies",
    "Pittsburgh Pirates","San Diego Padres","San Francisco Giants","Seattle Mariners",
    "St. Louis Cardinals","Tampa Bay Rays","Texas Rangers","Toronto Blue Jays",
    "Washington Nationals"
  ],
  "NHL": [
    "Anaheim Ducks","Boston Bruins","Buffalo Sabres","Calgary Flames","Carolina Hurricanes",
    "Chicago Blackhawks","Colorado Avalanche","Columbus Blue Jackets","Dallas Stars",
    "Detroit Red Wings","Edmonton Oilers","Florida Panthers","Los Angeles Kings",
    "Minnesota Wild","Montreal Canadiens","Nashville Predators","New Jersey Devils",
    "New York Islanders","New York Rangers","Ottawa Senators","Philadelphia Flyers",
    "Pittsburgh Penguins","San Jose Sharks","Seattle Kraken","St. Louis Blues",
    "Tampa Bay Lightning","Toronto Maple Leafs","Utah Hockey Club","Vancouver Canucks",
    "Vegas Golden Knights","Washington Capitals","Winnipeg Jets"
  ],
  "MLS": [
    "Atlanta United","Austin FC","Charlotte FC","Chicago Fire","Colorado Rapids",
    "Columbus Crew","DC United","FC Cincinnati","FC Dallas","Houston Dynamo",
    "Inter Miami CF","LA Galaxy","Los Angeles FC","Minnesota United","CF Montréal",
    "Nashville SC","New England Revolution","New York City FC","New York Red Bulls",
    "Orlando City SC","Philadelphia Union","Portland Timbers","Real Salt Lake",
    "San Jose Earthquakes","Seattle Sounders FC","Sporting Kansas City","St. Louis City SC",
    "Toronto FC","Vancouver Whitecaps","Vancouver Whitecaps FC"
  ]
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

// Timezone handling
function populateTimezoneSelect() {
  const zones = [
    {value: "America/New_York", label: "Eastern Time (ET)"},
    {value: "America/Chicago", label: "Central Time (CT)"},
    {value: "America/Denver", label: "Mountain Time (MT)"},
    {value: "America/Los_Angeles", label: "Pacific Time (PT)"},
    {value: "America/Phoenix", label: "Arizona Time"},
    {value: "Pacific/Honolulu", label: "Hawaii Time"},
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

tzSelect.addEventListener("change", e => {
  userTimezone = e.target.value;
  updateTimezoneDisplay();
});

function updateTimezoneDisplay() {
  const opt = tzSelect.options[tzSelect.selectedIndex];
  currentTzSpan.textContent = opt ? opt.textContent : userTimezone;
}

// League → teams fetch + official filtering
leagueSelect.addEventListener("change", async e => {
  const sport = e.target.value;
  leagueTeamsList.innerHTML = "";

  if (!sport) return;
  leagueTeamsList.innerHTML = "<li>Loading teams...</li>";

  const baseUrl = BASE_URLS[sport];
  if (!baseUrl) {
    leagueTeamsList.innerHTML = "<li>Invalid league</li>";
    return;
  }

  try {
    const headers = {"x-apisports-key": API_KEY};
    let url = `${baseUrl}teams`;

    if (sport === "MLS") url += "?league=253";  // MLS league ID

    const res = await fetch(url, {headers});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log(`Teams fetch for ${sport}:`, data);

    let teams = data.response || [];

    // Filter to official franchises only
    const official = OFFICIAL_TEAMS[sport] || [];
    teams = teams.filter(t => {
      const name = t.name || t.team?.name || "";
      return official.includes(name);
    });

    if (teams.length === 0) {
      leagueTeamsList.innerHTML = "<li>No teams found (check console)</li>";
      return;
    }

    teams.sort((a,b) => (a.name || "").localeCompare(b.name || ""));
    renderLeagueTeams(teams);
  } catch (err) {
    leagueTeamsList.innerHTML = "<li>Error loading teams – check console</li>";
    console.error("Team fetch error:", err);
  }
});

function renderLeagueTeams(teams) {
  leagueTeamsList.innerHTML = "";
  teams.forEach(team => {
    const name = team.name || team.team?.name || "Unknown";
    const id = team.id || team.team?.id;

    const li = document.createElement("li");
    li.textContent = name;
    li.addEventListener("click", () => {
      if (!selectedTeams.some(t => t.name === name)) {
        selectedTeams.push({name, league: leagueSelect.value, apiId: id});
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
    li.innerHTML = `${team.name} <small>(${team.league})</small> <button data-idx="${idx}">×</button>`;
    li.querySelector("button").addEventListener("click", e => {
      e.stopPropagation();
      selectedTeams.splice(idx, 1);
      renderSelectedTeams();
    });
    selectedList.appendChild(li);
  });
}

// Games fetch using api-sports.io
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
    const sport = team.league;
    const baseUrl = BASE_URLS[sport];
    if (!baseUrl || !team.apiId) continue;

    console.log(`Fetching games for ${team.name} (${sport}, ID: ${team.apiId})`);

    try {
      const headers = {"x-apisports-key": API_KEY};
      const startDate = now.toISOString().split('T')[0];
      const res = await fetch(`${baseUrl}games?team=${team.apiId}&date=${startDate}`, {headers});
      const data = await res.json();
      console.log(`Games for ${team.name}:`, data.response?.length || 0);

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
              league: sport
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
    gamesContainer.innerHTML = "<p>No upcoming games in next 30 days (check console).</p>";
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
