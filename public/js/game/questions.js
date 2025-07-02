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
let isShowingAnswer = false;


// State-Variablen
let kategorien = [];
let teams = [];
let currentTeam = 0;
let minuspunkte = true;
let allowSkip = true;
let allowOthers = true;
let timerLimit = 30;

// Callbacks
let onTeamsUpdate = () => {};
let onBoardUpdate = () => {};
let onGameEnd = () => {};
let onTeamPopup = () => {};

export function setupQuestionModal(options) {
  kategorien = options.kategorien;
  teams = options.teams;
  currentTeam = options.currentTeam || 0;
  minuspunkte = options.minuspunkte;
  allowSkip = options.allowSkip;
  allowOthers = options.allowOthers;
  timerLimit = options.timerLimit;
  onTeamsUpdate = options.onTeamsUpdate || (() => {});
  onBoardUpdate = options.onBoardUpdate || (() => {});
  onGameEnd = options.onGameEnd || (() => {});
  onTeamPopup = options.onTeamPopup || (() => {});
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
  updateButtonVisibility(); 
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
    
    // Team wechseln und UI sofort aktualisieren
    currentTeam = nextStartingTeam;
    renderTeams(teams, currentTeam);
    showTeamPopup(teams, currentTeam);
    
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
  updateButtonVisibility(); 
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
        // ⭐⭐ UI SOFORT aktualisieren ⭐⭐
        renderTeams(teams, currentTeam);
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
  updateButtonVisibility(); 
}

function handleContinue() {
  // Wenn die Lösung gerade angezeigt wird, Modal schließen und alles wie gehabt
  if (isShowingAnswer) {
    isShowingAnswer = false;
    closeModal();
    currentQuestion.q.answered = true;
    currentQuestion.q.answeredBy = null;
    onBoardUpdate();
    checkGameEnd();

    currentTeam = nextStartingTeam;
    renderTeams(teams, currentTeam);
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
      // Alle Teams haben versucht: erst Lösung zeigen, dann Modal schließen
      if (!isShowingAnswer) {
        showCorrectAnswer();
        isShowingAnswer = true;
        return;
      }
      // Wenn Lösung schon gezeigt wurde, Modal schließen und weiter
      isShowingAnswer = false;
      closeModal();
      currentQuestion.q.answered = true;
      currentQuestion.q.answeredBy = null;
      onBoardUpdate();
      checkGameEnd();

      currentTeam = nextStartingTeam;
      renderTeams(teams, currentTeam);
      showTeamPopup(teams, currentTeam);
      return;
    } else {
      let newTeam = currentTeam;
      do {
        newTeam = (newTeam + 1) % teams.length;
      } while (alreadyTriedTeams.includes(newTeam));

      currentTeam = newTeam;
      renderTeams(teams, currentTeam);
      showTeamPopup(teams, currentTeam);

      closeModal();
      showModal(currentQuestion.q.question, timerLimit);
      return;
    }
  } else {
    // allowOthers == false: erst Lösung zeigen, dann Modal schließen
    if (!isShowingAnswer) {
      showCorrectAnswer();
      isShowingAnswer = true;
      return;
    }
    // Wenn Lösung schon gezeigt wurde, Modal schließen und weiter
    isShowingAnswer = false;
    currentTeam = nextStartingTeam;
    renderTeams(teams, currentTeam);
    showTeamPopup(teams, currentTeam);

    closeModal();
    currentQuestion.q.answered = true;
    currentQuestion.q.answeredBy = null;
    onBoardUpdate();
    checkGameEnd();
    return;
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
  
  // ⭐⭐ Team wechseln und UI SOFORT aktualisieren ⭐⭐
  currentTeam = nextStartingTeam;
  renderTeams(teams, currentTeam);
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


function updateButtonVisibility() {
  const submitBtn = document.getElementById("submitAnswer");
  const skipBtn = document.getElementById("skipAnswer");
  const continueBtn = document.getElementById("continueBtn");
  const markCorrectBtn = document.getElementById("markCorrectBtn");
  
  // Grundzustand: Antwort prüfen/Überspringen sichtbar, andere ausgeblendet
  submitBtn.style.display = "inline-block";
  skipBtn.style.display = "inline-block";
  continueBtn.style.display = "none";
  markCorrectBtn.style.display = "none";

  // Nach Antwortprüfung
  if (waitForGamemaster) {
    submitBtn.style.display = "none";
    skipBtn.style.display = "none";
    continueBtn.style.display = "inline-block";
    
    // "Doch richtig!" nur anzeigen wenn:
    // - Nicht alle Teams versucht haben
    // - Timer nicht abgelaufen ist
    if (!timerExpired && alreadyTriedTeams.length < teams.length) {
      markCorrectBtn.style.display = "inline-block";
    }
  }

  // Wenn alle Teams falsch lagen
  if (alreadyTriedTeams.length >= teams.length) {
    markCorrectBtn.style.display = "none";
  }

  // Überspringen-Button spezielle Regeln
  if (!allowSkip || (currentTeam === selectingTeam && alreadyTriedTeams.length === 0)) {
    skipBtn.style.display = "none";
  }
}

