const emojiOptions = [
  "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
  "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦆",
  "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌",
  "🐞", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞",
  "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓",
  "🦍", "🐘", "🦏", "🦛", "🐪", "🐫", "🦙", "🦒", "🐃", "🐂", "🐄"
];

let kategorien = [];
let teams = [];
let currentTeam = 0;
let minuspunkte = true;
let allowSkip = true;
let allowOthers = true;
let timerLimit = 30;
let timerInterval;
let currentQuestion = null;
let alreadyTriedTeams = [];
let gameStarted = false;
let selectingTeam = 0;
let nextStartingTeam = 0;
let lastTeamSettings = [];
let timerExpired = false;
let waitForGamemaster = false;
let dochRichtigUsed = false;

const markCorrectBtn = document.getElementById("markCorrectBtn");
const continueBtn = document.getElementById("continueBtn");
const feedbackMsg = document.getElementById("feedbackMsg");
const correctAnswerDiv = document.getElementById("correctAnswer");
const answerInput = document.getElementById("answerInput");

// --- Kategorien-Auswahl nur über Popup ---
let ausgewaehlteKategorien = [];

function renderSelectedCategories() {
  const container = document.getElementById("selectedCategories");
  container.innerHTML = '';
  ausgewaehlteKategorien.forEach(cat => {
    const item = document.createElement("div");
    item.className = "category-item";
    item.textContent = cat.name;
    container.appendChild(item);
  });
  document.getElementById("startGame").disabled = ausgewaehlteKategorien.length === 0;
}

// Wird vom Popup aufgerufen
window.addToSelectedCategories = function(category) {
  // Keine Duplikate
  if (!ausgewaehlteKategorien.some(c => c.name === category.name)) {
    ausgewaehlteKategorien.push(category);
    renderSelectedCategories();
  }
};

// --- Ordnerauswahl-Logik ---
document.addEventListener("DOMContentLoaded", () => {
  // Modal-Elemente
  const folderModal = document.getElementById("folderModal");
  const folderTree = document.getElementById("folderTree");
  const closeBtn = document.querySelector("#folderModal .close");

  document.getElementById("folderSelectorBtn").addEventListener("click", async () => {
    try {
      const response = await fetch('/api/categories');
      const treeData = await response.json();
      renderFolderTree(treeData);
      folderModal.style.display = "flex";
    } catch (error) {
      alert("Ordnerstruktur konnte nicht geladen werden!");
    }
  });

  closeBtn.addEventListener("click", () => folderModal.style.display = "none");
  window.addEventListener("click", (e) => {
    if (e.target === folderModal) folderModal.style.display = "none";
  });

  function renderFolderTree(data, parentElement = folderTree) {
    parentElement.innerHTML = '';
    if (!data.length) {
      parentElement.innerHTML = '<div class="empty">Keine Kategorien gefunden</div>';
      return;
    }
    data.forEach(item => {
      const node = document.createElement("div");
      node.className = "folder-node";
      if (item.type === "folder") {
        node.innerHTML = `<span class="toggle">▶</span> ${item.name}`;
        const childrenContainer = document.createElement("div");
        childrenContainer.className = "folder-children";
        node.appendChild(childrenContainer);
        node.querySelector(".toggle").addEventListener("click", () => {
          childrenContainer.classList.toggle("expanded");
          node.querySelector(".toggle").textContent = childrenContainer.classList.contains("expanded") ? "▼" : "▶";
        });
        if (item.children) renderFolderTree(item.children, childrenContainer);
      } else if (item.type === "file") {
        node.innerHTML = `${item.name} <button class="select-category" data-category='${JSON.stringify(item)}'>Auswählen</button>`;
      }
      parentElement.appendChild(node);
    });
    // Kategorieauswahl
    folderTree.querySelectorAll(".select-category").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const category = JSON.parse(e.target.dataset.category);
        window.addToSelectedCategories(category);
        folderModal.style.display = "none";
      });
    });
  }
});

// --- Teams und Spiel-Logik ---
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
    div.style.marginBottom = "0.5em";
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
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("teamCount").addEventListener("input", renderTeamSettings);
  renderTeamSettings();
});

function setupTeams(count) {
  teams = [];
  for (let i = 0; i < count; i++) {
    const name = document.getElementById(`teamName${i}`).value || `Team ${i + 1}`;
    const logo = document.getElementById(`teamLogo${i}`).value || "😀";
    teams.push({ name, logo, score: 0 });
  }
}

function renderTeams() {
  const el = document.getElementById("teams");
  el.innerHTML = "";
  teams.forEach((team, idx) => {
    const badge = document.createElement("div");
    badge.className = "team-badge" + (idx === currentTeam ? " active" : "");
    badge.innerHTML = `<span class="team-name">${team.logo} ${team.name}</span>
      <span class="team-score">${team.score}</span>`;
    el.appendChild(badge);
  });
}

function showTeamPopup() {
  const popup = document.getElementById("teamPopup");
  const team = teams[currentTeam];
  popup.textContent = `${team.logo} ${team.name} ist dran!`;
  popup.classList.add("show");
  setTimeout(() => {
    popup.classList.remove("show");
  }, 2000);
}

// --- Spielstart ---
document.getElementById("startGame").onclick = async function () {
  if (ausgewaehlteKategorien.length === 0) {
    alert("Bitte wähle mindestens eine Kategorie aus!");
    return;
  }
  // Lade alle Kategorien vom Server und filtere nach Auswahl
  const res = await fetch('/api/game-categories');
  const allCategories = await res.json();
  kategorien = allCategories.filter(cat =>
    ausgewaehlteKategorien.some(sel => sel.name === cat.name)
  );
  setupTeams(Number(document.getElementById("teamCount").value));
  minuspunkte = document.getElementById("allowNegative").checked;
  allowSkip = document.getElementById("allowSkip").checked;
  allowOthers = document.getElementById("allowOthers").checked;
  timerLimit = Number(document.getElementById("timerSetting").value);
  currentTeam = 0;
  gameStarted = true;
  // Reset Fragen
  kategorien.forEach(cat => {
    cat.questions.forEach(q => {
      q.answered = false;
      q.answeredBy = null;
    });
  });
  buildBoard();
  renderTeams();
  showTeamPopup();
  document.getElementById("settings").style.display = "none";
  document.getElementById("gameArea").style.display = "";
  // Speichern
  lastTeamSettings = [];
  for (let i = 0; i < teams.length; i++) {
    lastTeamSettings.push({
      name: teams[i].name,
      logo: teams[i].logo,
    });
  }
  localStorage.setItem("teamSettings", JSON.stringify(lastTeamSettings));
};

document.getElementById("backToStart").onclick = function () {
  document.getElementById("settings").style.display = "";
  document.getElementById("gameArea").style.display = "none";
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem("teamSettings")) || [];
  } catch {}
  for (let i = 0; i < saved.length; i++) {
    if (document.getElementById(`teamName${i}`)) {
      document.getElementById(`teamName${i}`).value = saved[i].name;
      document.getElementById(`teamLogo${i}`).value = saved[i].logo;
    }
  }
};

// --- Spielfeld-Board bauen ---
function buildBoard() {
  const el = document.getElementById("board");
  let maxQuestions = Math.max(...kategorien.map((k) => k.questions.length));
  el.style.gridTemplateColumns = `repeat(${kategorien.length}, 1fr)`;
  el.style.gridTemplateRows = `repeat(${maxQuestions + 1}, auto)`;
  el.innerHTML = "";

  // Kategorie-Header
  kategorien.forEach((cat) => {
    const header = document.createElement("div");
    header.className = "board-cell category";
    header.textContent = cat.name;
    el.appendChild(header);
  });

  // Fragen
  for (let row = 0; row < maxQuestions; row++) {
    for (let col = 0; col < kategorien.length; col++) {
      const cat = kategorien[col];
      const q = cat.questions[row];
      const cell = document.createElement("div");
      cell.className = "board-cell";

      if (q) {
        // Teamlogo statt durchgestrichen, wenn beantwortet
        if (q.answered) {
          if (typeof q.answeredBy === "number" && teams[q.answeredBy]) {
            cell.classList.add("answered-team");
            cell.innerHTML = `<div class="team-logo-cell">${teams[q.answeredBy].logo}</div>`;
          } else {
            cell.classList.add("answered");
          }
        } else {
          cell.textContent = q.points;
          cell.onclick = () => openQuestion(col, row);
          cell.dataset.col = col;
          cell.dataset.row = row;
        }
      } else {
        cell.textContent = "";
        cell.style.background = "transparent";
        cell.style.cursor = "default";
      }
      el.appendChild(cell);
    }
  }
}

// --- Frage öffnen ---
function openQuestion(col, row) {
  if (!gameStarted) return;
  const q = kategorien[col].questions[row];
  if (q.answered) return;
  currentQuestion = { col, row, q };
  alreadyTriedTeams = [];
  selectingTeam = currentTeam;
  nextStartingTeam = (currentTeam + 1) % teams.length;
  timerExpired = false;
  waitForGamemaster = false;
  dochRichtigUsed = false;
  correctAnswerDiv.style.display = "none";
  showModal(q.question, timerLimit);
}

// --- Frage-Modal anzeigen ---
function showModal(question, timerSec) {
  document.getElementById("questionText").textContent = question;
  document.getElementById("answerInput").value = "";
  document.getElementById("questionModal").style.display = "flex";
  document.getElementById("timer").textContent = timerSec + "s";
  continueBtn.style.display = "none";
  markCorrectBtn.style.display = "none";
  document.getElementById("submitAnswer").disabled = false;
  document.getElementById("answerInput").disabled = false;
  feedbackMsg.textContent = "";
  correctAnswerDiv.style.display = "none";

  if (!allowSkip) {
    document.getElementById("skipAnswer").style.display = "none";
  } else if (currentTeam === selectingTeam && alreadyTriedTeams.length === 0) {
    document.getElementById("skipAnswer").style.display = "none";
  } else {
    document.getElementById("skipAnswer").style.display = "inline-block";
  }

  let t = timerSec;
  timerInterval = setInterval(() => {
    t--;
    document.getElementById("timer").textContent = t + "s";
    if (t <= 0) {
      clearInterval(timerInterval);
      timerExpired = true;
      document.getElementById("timer").textContent = "Zeit abgelaufen!";
      continueBtn.style.display = "inline-block";
      document.getElementById("submitAnswer").disabled = true;
      document.getElementById("answerInput").disabled = true;
      document.getElementById("skipAnswer").disabled = true;
      feedbackMsg.textContent = "";
      markCorrectBtn.style.display = "none";
      waitForGamemaster = true;
      if (!alreadyTriedTeams.includes(currentTeam)) {
        alreadyTriedTeams.push(currentTeam);
      }
    }
  }, 1000);
}

// --- Modal schließen ---
function closeModal() {
  document.getElementById("questionModal").style.display = "none";
  clearInterval(timerInterval);
  continueBtn.style.display = "none";
  markCorrectBtn.style.display = "none";
  document.getElementById("submitAnswer").disabled = false;
  document.getElementById("answerInput").disabled = false;
  document.getElementById("skipAnswer").disabled = false;
  feedbackMsg.textContent = "";
  correctAnswerDiv.style.display = "none";
  waitForGamemaster = false;
}

// --- Richtige Antwort anzeigen ---
function showCorrectAnswer() {
  correctAnswerDiv.textContent = `Richtige Antwort: ${currentQuestion.q.answer}`;
  correctAnswerDiv.style.display = "block";
  continueBtn.style.display = "inline-block";
  feedbackMsg.textContent = "";
  markCorrectBtn.style.display = "none";
  waitForGamemaster = true;
  document.getElementById("submitAnswer").disabled = true;
  document.getElementById("answerInput").disabled = true;
  document.getElementById("skipAnswer").disabled = true;
}

// --- Antwort prüfen ---
function handleAnswer() {
  if (timerExpired || waitForGamemaster) return;
  const answer = document.getElementById("answerInput").value.trim().toLowerCase();
  const correct = currentQuestion.q.answer.trim().toLowerCase();

  if (answer === correct) {
    teams[currentTeam].score += currentQuestion.q.points;
    currentQuestion.q.answered = true;
    currentQuestion.q.answeredBy = currentTeam;
    closeModal();
    currentTeam = nextStartingTeam;
    renderTeams();
    showTeamPopup();
    buildBoard();
    checkGameEnd();
  } else {
    if (minuspunkte) {
      teams[currentTeam].score -= Math.floor(currentQuestion.q.points / 2);
    }
    alreadyTriedTeams.push(currentTeam);
    feedbackMsg.textContent = "Falsch!";
    markCorrectBtn.style.display = "inline-block";
    continueBtn.style.display = "inline-block";
    document.getElementById("submitAnswer").disabled = true;
    document.getElementById("answerInput").disabled = true;
    document.getElementById("skipAnswer").disabled = true;
    waitForGamemaster = true;
    clearInterval(timerInterval);
    dochRichtigUsed = false;
  }
}

// --- Überspringen ---
function handleSkip() {
  if (timerExpired || waitForGamemaster) return;
  if (!allowSkip) return;
  if (currentTeam === selectingTeam && alreadyTriedTeams.length === 0) return;

  alreadyTriedTeams.push(currentTeam);
  feedbackMsg.textContent = "";
  markCorrectBtn.style.display = "none";

  if (allowOthers) {
    if (alreadyTriedTeams.length < teams.length) {
      let found = false;
      let startTeam = currentTeam;
      do {
        currentTeam = (currentTeam + 1) % teams.length;
        if (!alreadyTriedTeams.includes(currentTeam)) {
          found = true;
          break;
        }
      } while (currentTeam !== startTeam);

      if (found) {
        renderTeams();
        showTeamPopup();
        document.getElementById("answerInput").value = "";
        document.getElementById("timer").textContent = timerLimit + "s";
        clearInterval(timerInterval);
        showModal(currentQuestion.q.question, timerLimit);
      } else {
        currentQuestion.q.answered = true;
        currentQuestion.q.answeredBy = null;
        buildBoard();
        checkGameEnd();
        showCorrectAnswer();
      }
    } else {
      currentQuestion.q.answered = true;
      currentQuestion.q.answeredBy = null;
      buildBoard();
      checkGameEnd();
      showCorrectAnswer();
    }
  } else {
    currentQuestion.q.answered = true;
    currentQuestion.q.answeredBy = null;
    buildBoard();
    checkGameEnd();
    showCorrectAnswer();
  }
}

// --- Weiter-Button (nach Antwort) ---
function handleContinue() {
  if (correctAnswerDiv.style.display === "block") {
    closeModal();
    currentQuestion.q.answered = true;
    currentQuestion.q.answeredBy = null;
    buildBoard();
    checkGameEnd();
    currentTeam = nextStartingTeam;
    renderTeams();
    showTeamPopup();
    return;
  }

  if (!waitForGamemaster && !timerExpired) return;

  if (timerExpired && minuspunkte) {
    teams[currentTeam].score -= Math.floor(currentQuestion.q.points / 2);
    feedbackMsg.textContent = `Zeit abgelaufen! -${Math.floor(currentQuestion.q.points / 2)} Punkte für ${teams[currentTeam].name}`;
  }

  markCorrectBtn.style.display = "none";
  continueBtn.style.display = "none";
  waitForGamemaster = false;
  timerExpired = false;

  if (allowOthers) {
    if (alreadyTriedTeams.length >= teams.length) {
      showCorrectAnswer();
    } else {
      do {
        currentTeam = (currentTeam + 1) % teams.length;
      } while (alreadyTriedTeams.includes(currentTeam));
      renderTeams();
      showTeamPopup();
      closeModal();
      showModal(currentQuestion.q.question, timerLimit);
    }
  } else {
    closeModal();
    currentQuestion.q.answered = true;
    currentQuestion.q.answeredBy = null;
    buildBoard();
    checkGameEnd();
    currentTeam = nextStartingTeam;
    renderTeams();
    showTeamPopup();
  }
}

// --- "Doch richtig!"-Button ---
markCorrectBtn.onclick = function () {
  if (!waitForGamemaster) return;
  if (minuspunkte && alreadyTriedTeams.includes(currentTeam) && !dochRichtigUsed) {
    teams[currentTeam].score += Math.floor(currentQuestion.q.points / 2);
  }
  teams[currentTeam].score += currentQuestion.q.points;
  currentQuestion.q.answered = true;
  currentQuestion.q.answeredBy = currentTeam;
  closeModal();
  currentTeam = nextStartingTeam;
  renderTeams();
  showTeamPopup();
  buildBoard();
  checkGameEnd();
  dochRichtigUsed = true;
};

// --- Weiter zum nächsten Team ---
function nextTeam() {
  currentTeam = (currentTeam + 1) % teams.length;
}

// --- Event-Handler ---
document.getElementById("submitAnswer").onclick = handleAnswer;
document.getElementById("skipAnswer").onclick = handleSkip;
continueBtn.onclick = handleContinue;

// ENTER-Taste im Antwortfeld löst "Antwort prüfen" aus
answerInput.addEventListener("keydown", function(e) {
  if (e.key === "Enter" && !document.getElementById("submitAnswer").disabled) {
    handleAnswer();
  }
});

// --- Spiel-Ende prüfen ---
function checkGameEnd() {
  const allQuestions = kategorien.flatMap(cat => cat.questions);
  const allAnswered = allQuestions.every(q => q.answered);
  if (allAnswered) {
    showWinner();
  }
}

// --- Gewinner anzeigen ---
function showWinner() {
  let maxPoints = Math.max(...teams.map(team => Number(team.score) || 0));
  let winners = teams.filter(team => Number(team.score) === maxPoints);
  let msg = "";
  let emoji = "🎉";
  if (winners.length === 1) {
    msg = `<b>${winners[0].name}</b> hat mit <b>${maxPoints}</b> Punkten gewonnen!`;
    emoji = winners[0].logo || "🎉";
  } else {
    msg = `Unentschieden zwischen: ${winners.map(t => "<b>" + t.name + "</b>").join(", ")} mit <b>${maxPoints}</b> Punkten!`;
    emoji = "🤝";
  }
  // Modal erstellen
  const modal = document.createElement("div");
  modal.className = "win-modal";
  modal.innerHTML = `
    <div class="win-box">
      <div class="win-emoji">${emoji}</div>
      <div class="win-message">${msg}</div>
      <div class="win-btns">
        <button onclick="location.reload()">Neues Spiel</button>
        <button onclick="document.querySelector('.win-modal').remove()">Schließen</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}
