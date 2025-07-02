// main.js

import { initTeams, getTeams, renderTeams, showTeamPopup, setCurrentTeam } from './teams.js';
import { buildBoard, resetBoard } from './board.js';
import { 
  loadCategoriesTree, loadCategoriesFlat, 
  getSelectedCategories, renderSelectedCategories 
} from './categories.js';
import { setupPopup } from './popup.js';
import { shuffleArray } from './utils.js';
import { setupQuestionModal, openQuestion, bindQuestionModalEvents } from './questions.js';

// Globaler State (optional, kann auch in einzelnen Modulen gepflegt werden)
const state = {
  kategorien: [],
  teams: [],
  currentTeam: 0,
  minuspunkte: true,
  allowSkip: true,
  allowOthers: true,
  timerLimit: 30
};


// Initialisierung nach DOM-Load
document.addEventListener('DOMContentLoaded', async () => {
  // Teams-Eingabe initialisieren
  initTeams();

  // Popup für Kategorieauswahl vorbereiten
  setupPopup();

  // Frage-Modal-Handler binden
  bindQuestionModalEvents();

  // Kategorien laden und Anzeige aktualisieren
  await loadCategoriesTree();
  await loadCategoriesFlat();
  renderSelectedCategories();

  // Board zurücksetzen
  resetBoard();

  // Spiel starten
document.getElementById('startGame').addEventListener('click', async () => {
  // 1. Kategorien prüfen
  const selected = getSelectedCategories();
  if (!selected || selected.length === 0) {
    alert('Bitte wähle mindestens eine Kategorie aus!');
    return;
  }

  // 2. Teams prüfen
  const teams = getTeams();
  if (!teams || teams.length < 1) {
    alert('Bitte mindestens ein Team anlegen!');
    return;
  }

  // 3. Einstellungen übernehmen
  state.kategorien = selected.map(sel => ({
    ...sel,
    questions: sel.questions.map(q => ({ ...q, answered: false, answeredBy: null }))
  }));
  state.teams = teams;
  state.currentTeam = 0;
  state.minuspunkte = document.getElementById("allowNegative").checked;
  state.allowSkip = document.getElementById("allowSkip").checked;
  state.allowOthers = document.getElementById("allowOthers").checked;
  state.timerLimit = Number(document.getElementById("timerSetting").value);

  // 4. Board aufbauen
  buildBoard(state.kategorien, state.teams, openQuestion);

  // 5. Teams anzeigen (aktuelles Team hervorheben)
  renderTeams(state.teams, state.currentTeam);

  // 6. Frage-Modal konfigurieren
  setupQuestionModal({
    kategorien: state.kategorien,
    teams: state.teams,
    currentTeam: state.currentTeam,
    minuspunkte: state.minuspunkte,
    allowSkip: state.allowSkip,
    allowOthers: state.allowOthers,
    timerLimit: state.timerLimit,
    onTeamsUpdate: () => renderTeams(state.teams, state.currentTeam),
    onBoardUpdate: () => buildBoard(state.kategorien, state.teams, openQuestion),
    onGameEnd: showWinner,
    onTeamPopup: () => showTeamPopup(state.teams, state.currentTeam)
  });

  // 7. Frage-Modal-Events binden (falls noch nicht geschehen)
  bindQuestionModalEvents();

  // 8. Team-Popup anzeigen
  showTeamPopup(state.teams, state.currentTeam);

  // 9. UI umschalten: Lobby ausblenden, Spielfeld einblenden
  document.getElementById('settings').style.display = 'none';
  document.getElementById('gameArea').style.display = '';
});


  // "Zurück zu den Einstellungen"
  document.getElementById('backToStart').addEventListener('click', () => {
    document.getElementById('settings').style.display = '';
    document.getElementById('gameArea').style.display = 'none';
    gameStarted = false;
    resetBoard();
    renderTeams(getTeams(), 0);
    renderSelectedCategories();
  });
});

// Gewinner-Anzeige
function showWinner() {

  // Korrektur: Verwende state.teams statt teams
  const teamsArray = state.teams || [];
  
  // Finde das Maximum der Punkte
  const maxPoints = Math.max(...teamsArray.map(team => team.score || 0));
  
  // Finde alle Teams mit maxPoints
  const winners = teamsArray.filter(team => team.score === maxPoints);
  megaConfettiParty(4000, winners[0]); 
  // Erstelle die Gewinnermeldung
  let msg = "";
  let emoji = "🎉";
  
  if (winners.length === 1) {
    msg = `<b>${winners[0].name}</b> hat mit <b>${maxPoints}</b> Punkten gewonnen!`;
    emoji = winners[0].logo || "🎉";
  } else {
    const winnerNames = winners.map(team => `<b>${team.name}</b>`).join(", ");
    msg = `Unentschieden zwischen ${winnerNames} mit <b>${maxPoints}</b> Punkten!`;
    emoji = "🤝";
  }
  
  // Erstelle das Gewinner-Modal
// Modal anzeigen
const modal = document.createElement("div");
modal.className = "win-modal";
modal.innerHTML = `
  <div class="win-box">
    <div class="win-emoji">${emoji}</div>
    <div class="win-message">${msg}</div>
    <div class="win-btns">
      <button onclick="location.reload()">Neues Spiel</button>
    </div>
  </div>
`;
document.body.appendChild(modal);
}

let myConfetti = null;

let confettiCanvas = null;


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


function megaConfettiParty(duration = 4000, winner = null) {
  initConfetti();
  const end = Date.now() + duration;
  const partyColors = [
    '#ff0', '#0ff', '#f0f', '#0f0', '#f00', '#00f', '#fff200', '#ff7f50', '#ff1493'
  ];
  const partyEmojis = ['🎉', '🥳', '🏆', '🎈', '🍀', '🎊', '🦄', '🔥', '✨'];
  if (winner && winner.logo) partyEmojis.push(winner.logo);


  (function frame() {
    // Links
    myConfetti({
      particleCount: 12,
      angle: 60,
      spread: 90,
      origin: { x: 0, y: Math.random() * 0.6 + 0.2 },
      colors: partyColors,
      emojis: partyEmojis,
      emojiSize: 40,
      shapes: ['circle', 'square']
    });
    // Rechts
    myConfetti({
      particleCount: 12,
      angle: 120,
      spread: 90,
      origin: { x: 1, y: Math.random() * 0.6 + 0.2 },
      colors: partyColors,
      emojis: partyEmojis,
      emojiSize: 40,
      shapes: ['circle', 'square']
    });
    // Mitte oben
    myConfetti({
      particleCount: 20,
      angle: 90,
      spread: 160,
      origin: { x: 0.5, y: 0 },
      colors: partyColors,
      emojis: partyEmojis,
      emojiSize: 46,
      shapes: ['circle', 'square']
    });
    // Unten
    myConfetti({
      particleCount: 8,
      angle: 270,
      spread: 100,
      origin: { x: Math.random(), y: 1 },
      colors: partyColors,
      emojis: partyEmojis,
      emojiSize: 32,
      shapes: ['circle', 'square']
    });
    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

function removeConfetti() {
  if (confettiCanvas) {
    confettiCanvas.remove();
    confettiCanvas = null;
    myConfetti = null;
  }
}