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

function showTeamPopup() {
  const popup = document.getElementById("teamPopup");
  const team = teams[currentTeam];
  popup.textContent = `${team.logo} ${team.name} ist dran!`;
  popup.classList.add("show");
  setTimeout(() => {
    popup.classList.remove("show");
  }, 2000);
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
    div.style.marginBottom = "0.5em";
    let emojiSelect = `<select id="teamLogo${i}" required>`;
    emojiOptions.forEach((e) => {
      emojiSelect += `<option value="${e}"${
        saved[i] && saved[i].logo === e ? " selected" : ""
      }>${e}</option>`;
    });
    emojiSelect += "</select>";
    div.innerHTML = `
      <label>Team ${i + 1} Name:
        <input type="text" id="teamName${i}" value="${
          saved[i] ? saved[i].name : "Team " + (i + 1)
        }" required style="width:120px;">
      </label>
      <label> Emoji-Logo: ${emojiSelect}</label>
    `;
    container.appendChild(div);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("teamCount")
    .addEventListener("input", renderTeamSettings);
  renderTeamSettings();
});

async function ladeKategorien() {
  const res = await fetch("/api/categories");
  kategorien = await res.json();
}

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
    badge.innerHTML = `
      <span class="team-name">${team.logo} ${team.name}</span>
      <span class="team-score">${team.score}</span>
    `;
    el.appendChild(badge);
  });
}

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
            cell.innerHTML = `<span class="team-logo-cell" title="${teams[q.answeredBy].name}">${teams[q.answeredBy].logo}</span>`;
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

function handleSkip() {
  if (timerExpired || waitForGamemaster) return;
  if (!allowSkip) return;
  if (currentTeam === selectingTeam && alreadyTriedTeams.length === 0) {
    return;
  }
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
        currentQuestion.q.answeredBy = null; // <-- Niemand richtig
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
    feedbackMsg.textContent = `Zeit abgelaufen! -${Math.floor(
      currentQuestion.q.points / 2
    )} Punkte für ${teams[currentTeam].name}`;
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

markCorrectBtn.onclick = function () {
  if (!waitForGamemaster) return;
  if (minuspunkte && alreadyTriedTeams.includes(currentTeam) && !dochRichtigUsed) {
    teams[currentTeam].score += Math.floor(currentQuestion.q.points / 2);
  }
  teams[currentTeam].score += currentQuestion.q.points;
  currentQuestion.q.answered = true;
  currentQuestion.q.answeredBy = currentTeam; // <-- NEU
  closeModal();
  currentTeam = nextStartingTeam;
  renderTeams();
  showTeamPopup();
  buildBoard();
  checkGameEnd();
  dochRichtigUsed = true;
};

function nextTeam() {
  currentTeam = (currentTeam + 1) % teams.length;
}

document.getElementById("submitAnswer").onclick = handleAnswer;
document.getElementById("skipAnswer").onclick = handleSkip;
continueBtn.onclick = handleContinue;

// ENTER-Taste im Antwortfeld löst "Antwort prüfen" aus
answerInput.addEventListener("keydown", function(e) {
  if (e.key === "Enter" && !document.getElementById("submitAnswer").disabled) {
    handleAnswer();
  }
});

document.getElementById("startGame").onclick = async function () {
  await ladeKategorienMitDragDrop();
  if (ausgewaehlteKategorien.length === 0) {
    alert("Bitte wähle mindestens eine Kategorie aus, bevor du das Spiel startest!");
    return;
  }
  kategorien = kategorien.filter(cat => ausgewaehlteKategorien.includes(cat.name));
  setupTeams(Number(document.getElementById("teamCount").value));
  minuspunkte = document.getElementById("allowNegative").checked;
  allowSkip = document.getElementById("allowSkip").checked;
  allowOthers = document.getElementById("allowOthers").checked;
  timerLimit = Number(document.getElementById("timerSetting").value);
  currentTeam = 0;
  gameStarted = true;
  kategorien.forEach((cat) => cat.questions.forEach((q) => {
    q.answered = false;
    q.answeredBy = null;
  }));
  buildBoard();
  renderTeams();
  showTeamPopup();
  document.getElementById("settings").style.display = "none";
  document.getElementById("gameArea").style.display = "";
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
// --- Drag & Drop Kategorie-Auswahl ---
let alleKategorienNamen = [];
let ausgewaehlteKategorien = [];

async function ladeKategorienMitDragDrop() {
  const res = await fetch("/api/categories");
  kategorien = await res.json();
  alleKategorienNamen = kategorien.map(cat => cat.name);
  ausgewaehlteKategorien = JSON.parse(localStorage.getItem("ausgewaehlteKategorien") || "[]");
  renderKategorieDragDrop();
}

function renderKategorieDragDrop() {
  const allBox = document.getElementById('allCategories');
  const selBox = document.getElementById('selectedCategories');
  if (!allBox || !selBox) return;
  allBox.querySelectorAll('.category-item').forEach(e => e.remove());
  selBox.querySelectorAll('.category-item').forEach(e => e.remove());
  alleKategorienNamen.forEach(cat => {
    if (!ausgewaehlteKategorien.includes(cat)) {
      allBox.appendChild(createCategoryItem(cat));
    }
  });
  ausgewaehlteKategorien.forEach(cat => {
    selBox.appendChild(createCategoryItem(cat));
  });
  // Button aktivieren/deaktivieren
  document.getElementById("startGame").disabled = ausgewaehlteKategorien.length === 0;
}

function createCategoryItem(name) {
  const div = document.createElement('div');
  div.className = 'category-item';
  div.textContent = name;
  div.draggable = true;
  div.addEventListener('dragstart', e => {
    div.classList.add('dragging');
    e.dataTransfer.setData('text/plain', name);
    e.dataTransfer.effectAllowed = 'move';
  });
  div.addEventListener('dragend', () => {
    div.classList.remove('dragging');
  });
  return div;
}

['allCategories', 'selectedCategories'].forEach(boxId => {
  document.addEventListener("DOMContentLoaded", () => {
    const box = document.getElementById(boxId);
    if (!box) return;
    box.addEventListener('dragover', e => {
      e.preventDefault();
      box.classList.add('drag-over');
    });
    box.addEventListener('dragleave', () => {
      box.classList.remove('drag-over');
    });
    box.addEventListener('drop', e => {
      e.preventDefault();
      box.classList.remove('drag-over');
      const catName = e.dataTransfer.getData('text/plain');
      if (boxId === 'selectedCategories') {
        if (!ausgewaehlteKategorien.includes(catName)) {
          ausgewaehlteKategorien.push(catName);
        }
      } else {
        ausgewaehlteKategorien = ausgewaehlteKategorien.filter(c => c !== catName);
      }
      localStorage.setItem("ausgewaehlteKategorien", JSON.stringify(ausgewaehlteKategorien));
      renderKategorieDragDrop();
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  ladeKategorienMitDragDrop();
});

function checkGameEnd() {
  // Alle Fragen aus allen ausgewählten Kategorien
  const allQuestions = kategorien.flatMap(cat => cat.questions);
  // Sind alle beantwortet?
  const allAnswered = allQuestions.every(q => q.answered);
  if (allAnswered) {
    showWinner();
  }
}

function showWinner() {
  // Finde das Team mit den meisten Punkten (score als Zahl!)
  let maxPoints = Math.max(...teams.map(team => Number(team.score) || 0));
  let winners = teams.filter(team => Number(team.score) === maxPoints);

  let msg = "";
  let emoji = "🎉";
  if (winners.length === 1) {
    msg = `<b>${winners[0].name}</b> hat mit <b>${maxPoints}</b> Punkten gewonnen!`;
    emoji = winners[0].logo || "🎉";
  } else {
    msg = `Unentschieden zwischen: ${winners.map(t => "<b>" + t.name + "</b>").join(", ")}<br>mit <b>${maxPoints}</b> Punkten!`;
    emoji = "🤝";
  }

  // Modal bauen
  const modal = document.createElement("div");
  modal.className = "win-modal";
  modal.innerHTML = `
    <div class="win-box">
      <div class="win-emoji">${emoji}</div>
      <div style="font-size:1.3em; font-weight:bold; margin-bottom:0.6em;">Spiel beendet!</div>
      <div style="margin-bottom:1.2em;">${msg}</div>
      <div class="win-btns">
        <button id="restartGameBtn">Neues Spiel</button>
        <button id="backToMenuBtn">Zurück zum Menü</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

   // Canvas erstellen und an body anhängen
// Konfetti-Canvas nur einmal pro Seite anlegen!
let confettiCanvas, myConfetti;
function initConfetti() {
  if (!confettiCanvas) {
    confettiCanvas = document.createElement('canvas');
    confettiCanvas.style.position = 'fixed';
    confettiCanvas.style.top = '0';
    confettiCanvas.style.left = '0';
    confettiCanvas.style.width = '100vw';
    confettiCanvas.style.height = '100vh';
    confettiCanvas.style.pointerEvents = 'none';
    confettiCanvas.style.zIndex = '100000';
    document.body.appendChild(confettiCanvas);
    myConfetti = confetti.create(confettiCanvas, { resize: true, useWorker: true });
  }
}

// Viel Konfetti für 3 Sekunden aus allen Richtungen!
function megaConfettiParty(duration = 3000) {
  initConfetti();
  const end = Date.now() + duration;
  (function frame() {
    // Links
    myConfetti({
      particleCount: 14,
      angle: 60,
      spread: 80,
      origin: { x: 0, y: Math.random() * 0.6 + 0.2 }
    });
    // Rechts
    myConfetti({
      particleCount: 14,
      angle: 120,
      spread: 80,
      origin: { x: 1, y: Math.random() * 0.6 + 0.2 }
    });
    // Mitte oben
    myConfetti({
      particleCount: 20,
      angle: 90,
      spread: 160,
      origin: { x: 0.5, y: 0 }
    });
    // Unten
    myConfetti({
      particleCount: 8,
      angle: 270,
      spread: 100,
      origin: { x: Math.random(), y: 1 }
    });
    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}
megaConfettiParty(1000); // 4 Sekunden Party!


  // Buttons
  document.getElementById("restartGameBtn").onclick = () => location.reload();
  document.getElementById("backToMenuBtn").onclick = () => window.location.href = "/";
}


    // Willkommensbildschirm-Button
    document.getElementById("backToWelcome").onclick = function () {
       window.location.href = "/";
    };


 
