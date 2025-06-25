// questions.js

import { renderTeams, showTeamPopup } from './teams.js';

let timerInterval = null;
let timerExpired = false;
let waitForGamemaster = false;
let dochRichtigUsed = false;
let alreadyTriedTeams = [];
let currentQuestion = null;
let selectingTeam = 0;
let nextStartingTeam = 0;

// questions.js

// Lokale State-Variablen
let kategorien = [];
let teams = [];
let currentTeam = 0;
let minuspunkte = true;
let allowSkip = true;
let allowOthers = true;
let timerLimit = 30;

// Callbacks, die von main.js gesetzt werden können
let onTeamsUpdate = () => {};
let onBoardUpdate = () => {};
let onGameEnd = () => {};
let onTeamPopup = () => {};

/**
 * Initialisiert das Frage-Modal und den State für die Fragerunde.
 * @param {Object} options - Übergibt alle nötigen Daten und Callbacks.
 *   - kategorien: Array der Kategorien
 *   - teams: Array der Teams
 *   - minuspunkte: Boolean
 *   - allowSkip: Boolean
 *   - allowOthers: Boolean
 *   - timerLimit: Number
 *   - onTeamsUpdate: Funktion, wird nach jedem Teamwechsel aufgerufen
 *   - onBoardUpdate: Funktion, wird nach jeder Board-Änderung aufgerufen
 *   - onGameEnd: Funktion, wird am Spielende aufgerufen
 *   - onTeamPopup: Funktion, zeigt das "Team X ist dran"-Popup an
 */
export function setupQuestionModal(options) {
  // Übernehme alle Optionen
  kategorien = options.kategorien;
  teams = options.teams;
  currentTeam = options.currentTeam || 0; // Wichtig: Standardwert setzen
  minuspunkte = options.minuspunkte;
  allowSkip = options.allowSkip;
  allowOthers = options.allowOthers;
  timerLimit = options.timerLimit;
  
  // Callbacks für UI-Updates
  onTeamsUpdate = options.onTeamsUpdate || (() => {});
  onBoardUpdate = options.onBoardUpdate || (() => {});
  onGameEnd = options.onGameEnd || (() => {});
  
  // Spezielles Callback für Team-Popup
  onTeamPopup = options.onTeamPopup || (() => {});
  
  // Stelle sicher, dass das initiale Team sofort korrekt angezeigt wird
  onTeamsUpdate();
  onTeamPopup();
}

export function openQuestion(col, row) {
  const q = kategorien[col].questions[row];
  if (q.answered) return;
  currentQuestion = { col, row, q };
  alreadyTriedTeams = [];
  selectingTeam = currentTeam;
  nextStartingTeam = (currentTeam + 1) % teams.length;
  timerExpired = false;
  waitForGamemaster = false;
  dochRichtigUsed = false;
  document.getElementById("correctAnswer").style.display = "none";
  showModal(q.question, timerLimit);
}

function showModal(question, timerSec) {
  document.getElementById("questionText").textContent = question;
  document.getElementById("answerInput").value = "";
  document.getElementById("questionModal").style.display = "flex";
  document.getElementById("timer").textContent = timerSec + "s";
  document.getElementById("continueBtn").style.display = "none";
  document.getElementById("markCorrectBtn").style.display = "none";
  document.getElementById("submitAnswer").disabled = false;
  document.getElementById("answerInput").disabled = false;
  document.getElementById("feedbackMsg").textContent = "";
  document.getElementById("correctAnswer").style.display = "none";

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
      document.getElementById("continueBtn").style.display = "inline-block";
      document.getElementById("submitAnswer").disabled = true;
      document.getElementById("answerInput").disabled = true;
      document.getElementById("skipAnswer").disabled = true;
      document.getElementById("feedbackMsg").textContent = "";
      document.getElementById("markCorrectBtn").style.display = "none";
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
  document.getElementById("continueBtn").style.display = "none";
  document.getElementById("markCorrectBtn").style.display = "none";
  document.getElementById("submitAnswer").disabled = false;
  document.getElementById("answerInput").disabled = false;
  document.getElementById("skipAnswer").disabled = false;
  document.getElementById("feedbackMsg").textContent = "";
  document.getElementById("correctAnswer").style.display = "none";
  waitForGamemaster = false;
}

function showCorrectAnswer() {
  document.getElementById("correctAnswer").textContent = `Richtige Antwort: ${currentQuestion.q.answer}`;
  document.getElementById("correctAnswer").style.display = "block";
  document.getElementById("continueBtn").style.display = "inline-block";
  document.getElementById("feedbackMsg").textContent = "";
  document.getElementById("markCorrectBtn").style.display = "none";
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
    
    // ⚠️ WICHTIGE KORREKTUR: Teamwechsel-Logik
    // 1. Aktuelles Team speichern (für Debugging)
    const oldTeam = currentTeam;
    
    // 2. Team WECHSELN (unbedingt VOR UI-Update)
    currentTeam = nextStartingTeam;
    
    // 3. Debug-Ausgabe
    console.log("Teamwechsel:", 
      `Altes Team: ${oldTeam}`, 
      `Neues Team: ${currentTeam}`, 
      `NextStartingTeam: ${nextStartingTeam}`
    );
    
    // 4. UI SOFORT mit NEUEM Team aktualisieren
    renderTeams(teams, currentTeam);
    showTeamPopup(teams, currentTeam);
    
    // 5. Board aktualisieren
    onBoardUpdate();
    checkGameEnd();
  } else {
    if (minuspunkte) {
      teams[currentTeam].score -= Math.floor(currentQuestion.q.points / 2);
    }
    alreadyTriedTeams.push(currentTeam);
    document.getElementById("feedbackMsg").textContent = "Falsch!";
    document.getElementById("markCorrectBtn").style.display = "inline-block";
    document.getElementById("continueBtn").style.display = "inline-block";
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
  if (currentTeam === selectingTeam && alreadyTriedTeams.length === 0) return;

  alreadyTriedTeams.push(currentTeam);
  document.getElementById("feedbackMsg").textContent = "";
  document.getElementById("markCorrectBtn").style.display = "none";

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
        onTeamsUpdate();
        showTeamPopup(teams, currentTeam);
        document.getElementById("answerInput").value = "";
        document.getElementById("timer").textContent = timerLimit + "s";
        clearInterval(timerInterval);
        showModal(currentQuestion.q.question, timerLimit);
      } else {
        currentQuestion.q.answered = true;
        currentQuestion.q.answeredBy = null;
        onBoardUpdate();
        checkGameEnd();
        showCorrectAnswer();
      }
    } else {
      currentQuestion.q.answered = true;
      currentQuestion.q.answeredBy = null;
      onBoardUpdate();
      checkGameEnd();
      showCorrectAnswer();
    }
  } else {
    currentQuestion.q.answered = true;
    currentQuestion.q.answeredBy = null;
    onBoardUpdate();
    checkGameEnd();
    showCorrectAnswer();
  }
}

function handleContinue() {
  if (document.getElementById("correctAnswer").style.display === "block") {
    closeModal();
    currentQuestion.q.answered = true;
    currentQuestion.q.answeredBy = null;
    onBoardUpdate();
    checkGameEnd();
    currentTeam = nextStartingTeam;
    onTeamsUpdate();
    showTeamPopup(teams, currentTeam);
    return;
  }

  if (!waitForGamemaster && !timerExpired) return;

  if (timerExpired && minuspunkte) {
    teams[currentTeam].score -= Math.floor(currentQuestion.q.points / 2);
    document.getElementById("feedbackMsg").textContent =
      `Zeit abgelaufen! -${Math.floor(currentQuestion.q.points / 2)} Punkte für ${teams[currentTeam].name}`;
  }

  document.getElementById("markCorrectBtn").style.display = "none";
  document.getElementById("continueBtn").style.display = "none";
  waitForGamemaster = false;
  timerExpired = false;

  if (allowOthers) {
    if (alreadyTriedTeams.length >= teams.length) {
      showCorrectAnswer();
    } else {
      do {
        currentTeam = (currentTeam + 1) % teams.length;
      } while (alreadyTriedTeams.includes(currentTeam));
      onTeamsUpdate();
      showTeamPopup(teams, currentTeam);
      closeModal();
      showModal(currentQuestion.q.question, timerLimit);
    }
  } else {
    closeModal();
    currentQuestion.q.answered = true;
    currentQuestion.q.answeredBy = null;
    onBoardUpdate();
    checkGameEnd();
    currentTeam = nextStartingTeam;
    onTeamsUpdate();
    showTeamPopup(teams, currentTeam);
  }
}

function handleMarkCorrect() {
  if (!waitForGamemaster) return;
  if (minuspunkte && alreadyTriedTeams.includes(currentTeam) && !dochRichtigUsed) {
    teams[currentTeam].score += Math.floor(currentQuestion.q.points / 2);
  }
  teams[currentTeam].score += currentQuestion.q.points;
  currentQuestion.q.answered = true;
  currentQuestion.q.answeredBy = currentTeam;
  closeModal();
  currentTeam = nextStartingTeam;
  onTeamsUpdate();
  showTeamPopup(teams, currentTeam);
  onBoardUpdate();
  checkGameEnd();
  dochRichtigUsed = true;
}

export function bindQuestionModalEvents() {
  document.getElementById("submitAnswer").onclick = handleAnswer;
  document.getElementById("skipAnswer").onclick = handleSkip;
  document.getElementById("continueBtn").onclick = handleContinue;
  document.getElementById("markCorrectBtn").onclick = handleMarkCorrect;
  document.getElementById("answerInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !document.getElementById("submitAnswer").disabled) {
      handleAnswer();
    }
  });
}

function checkGameEnd() {
  const allQuestions = kategorien.flatMap(cat => cat.questions);
  const allAnswered = allQuestions.every(q => q.answered);
  if (allAnswered) {
    onGameEnd();
  }
}
