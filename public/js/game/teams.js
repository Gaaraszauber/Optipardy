// teams.js

export const emojiOptions = [
  "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
  "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦆",
  "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌",
  "🐞", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞",
  "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓",
  "🦍", "🐘", "🦏", "🦛", "🐪", "🐫", "🦙", "🦒", "🐃", "🐂", "🐄"
];

let teams = [];
let currentTeam = 0;

export function initTeams() {
  renderTeamSettings();
  document.getElementById("teamCount").addEventListener("input", renderTeamSettings);
}

export function getTeams() {
  const count = Number(document.getElementById("teamCount").value);
  const result = [];
  for (let i = 0; i < count; i++) {
    const name = document.getElementById(`teamName${i}`)?.value || `Team ${i + 1}`;
    const logo = document.getElementById(`teamLogo${i}`)?.value || "😀";
    result.push({ name, logo, score: 0 });
  }
  teams = result;
  return result;
}

function renderTeamSettings() {
  const count = Number(document.getElementById("teamCount").value);
  const container = document.getElementById("teamSettings");
  container.innerHTML = "";
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem("teamSettings")) || [];
  } catch {}
  for (let i = 0; i < count; i++) {
    const div = document.createElement("div");
    div.className = "team-row";
    let emojiSelect = `<select id="teamLogo${i}" class="emoji-select">`;
    emojiOptions.forEach(emoji => {
      emojiSelect += `<option value="${emoji}">${emoji}</option>`;
    });
    emojiSelect += "</select>";
    div.innerHTML = `
      <input type="text" id="teamName${i}" placeholder="Team ${i + 1}" value="${saved[i]?.name || ""}">
      ${emojiSelect}
    `;
    if (saved[i]?.logo) {
      div.querySelector(`#teamLogo${i}`).value = saved[i].logo;
    }
    container.appendChild(div);
  }
}

export function renderTeams(teamsArr, currentIdx) {
  const el = document.getElementById("teams");
  el.innerHTML = "";
  teamsArr.forEach((team, idx) => {
    const isActive = idx === currentIdx;
    const badge = document.createElement("div");
    badge.className = "team-badge" + (isActive ? " active" : "");
    badge.innerHTML = `
      <span class="team-name">${team.logo} ${team.name}</span>
      <span class="team-score">${team.score}</span>
    `;
    el.appendChild(badge);
  });
}


export function showTeamPopup(teamsArr = teams, idx = currentTeam) {
  const popup = document.getElementById("teamPopup");
  if (!popup) return;
  const team = teamsArr[idx];
  popup.textContent = `${team.logo} ${team.name} ist dran!`;
  popup.classList.add("show");
  setTimeout(() => {
    popup.classList.remove("show");
  }, 2000);
}

export function setCurrentTeam(idx) {
  currentTeam = idx;
}

export function getTeamsState() {
  return teams;
}

export function getCurrentTeam() {
  return currentTeam;
}
