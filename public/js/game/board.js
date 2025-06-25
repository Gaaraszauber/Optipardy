// board.js

/**
 * Baut das Spielfeld ("Jeopardy-Board") für die übergebenen Kategorien und Teams.
 * @param {Array} kategorien - Liste der Kategorie-Objekte (mit Fragen).
 * @param {Array} teams - Liste der Team-Objekte.
 * @param {Function} onQuestionClick - Callback, wenn eine Frage ausgewählt wird (z.B. openQuestion).
 */
export function buildBoard(kategorien, teams, onQuestionClick) {
  const el = document.getElementById("board");
  if (!el || !kategorien || kategorien.length === 0) {
    el.innerHTML = "<div style='text-align:center;padding:2em;'>Keine Kategorien ausgewählt.</div>";
    return;
  }

  // Maximale Fragenanzahl pro Kategorie bestimmen
  const maxQuestions = Math.max(...kategorien.map(k => k.questions.length));
  el.style.gridTemplateColumns = `repeat(${kategorien.length}, 1fr)`;
  el.style.gridTemplateRows = `repeat(${maxQuestions + 1}, auto)`;
  el.innerHTML = "";

  // Kategorie-Header
  kategorien.forEach(cat => {
    const header = document.createElement("div");
    header.className = "board-cell category";
    header.textContent = cat.name;
    el.appendChild(header);
  });

  // Fragen-Zellen
  for (let row = 0; row < maxQuestions; row++) {
    for (let col = 0; col < kategorien.length; col++) {
      const cat = kategorien[col];
      const q = cat.questions[row];
      const cell = document.createElement("div");
      cell.className = "board-cell";

      if (q) {
        if (q.answered) {
          // Zeige Teamlogo, wenn beantwortet
          if (typeof q.answeredBy === "number" && teams[q.answeredBy]) {
            cell.classList.add("answered-team");
            cell.innerHTML = `<div class="team-logo-cell">${teams[q.answeredBy].logo}</div>`;
          } else {
            cell.classList.add("answered");
          }
        } else {
          cell.textContent = q.points;
          cell.onclick = () => onQuestionClick(col, row);
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

/**
 * Setzt das Board zurück (z.B. beim Start oder Spielende).
 */
export function resetBoard() {
  const el = document.getElementById("board");
  if (el) el.innerHTML = "";
}
