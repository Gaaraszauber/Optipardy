let categories = [];
let aktuellerName = null;

async function ladeKategorien() {
  const res = await fetch('/api/categories');
  categories = await res.json();
  zeigeKategorien();
}

function zeigeKategorien() {
  const ul = document.getElementById('categoryList');
  ul.innerHTML = '';
  categories.forEach(cat => {
    const li = document.createElement('li');

    const nameSpan = document.createElement('span');
    nameSpan.className = 'category-name';
    nameSpan.textContent = cat.name;
    li.appendChild(nameSpan);

    const actions = document.createElement('div');
    actions.className = 'category-actions';

    // Bearbeiten (Stift Icon)
    const editBtn = document.createElement('button');
    editBtn.title = 'Bearbeiten';
    editBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
           stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit-2">
        <path d="M17 3a2.828 2.828 0 0 1 4 4L7 21H3v-4L17 3z"></path>
      </svg>`;
    editBtn.onclick = () => kategorieBearbeiten(cat.name);
    actions.appendChild(editBtn);

    // Löschen (Mülleimer Icon)
    const delBtn = document.createElement('button');
    delBtn.title = 'Löschen';
    delBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
           stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6l-2 14H7L5 6"></path>
        <path d="M10 11v6"></path>
        <path d="M14 11v6"></path>
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
      </svg>`;
    delBtn.onclick = () => kategorieLoeschen(cat.name);
    actions.appendChild(delBtn);

    li.appendChild(actions);
    ul.appendChild(li);
  });
}

function zeigeFragen(questions) {
  const qDiv = document.getElementById('questionList');
  qDiv.innerHTML = '';
  questions.forEach(q => {
    const row = document.createElement('div');
    row.innerHTML = `
      <input type="text" placeholder="Frage" value="${q.question || ''}" required>
      <input type="text" placeholder="Antwort" value="${q.answer || ''}" required>
      <input type="number" placeholder="Punkte" value="${q.points || 100}" min="0" step="100" required>
      <button type="button">Entfernen</button>
    `;
    row.querySelector('button').onclick = () => row.remove();
    qDiv.appendChild(row);
  });
}

document.getElementById('addQuestionBtn').onclick = function() {
  const qDiv = document.getElementById('questionList');
  const row = document.createElement('div');
  row.innerHTML = `
    <input type="text" placeholder="Frage" required>
    <input type="text" placeholder="Antwort" required>
    <input type="number" placeholder="Punkte" value="100" min="0" step="100" required>
    <button type="button">Entfernen</button>
  `;
  row.querySelector('button').onclick = () => row.remove();
  qDiv.appendChild(row);
};

document.getElementById('newCategoryBtn').onclick = function() {
  document.getElementById('categoryName').value = '';
  document.getElementById('questionList').innerHTML = '';
  aktuellerName = null;
};

document.getElementById('cancelBtn').onclick = function() {
  document.getElementById('categoryName').value = '';
  document.getElementById('questionList').innerHTML = '';
  aktuellerName = null;
};

async function kategorieBearbeiten(name) {
  const cat = categories.find(c => c.name === name);
  if (!cat) return;
  document.getElementById('categoryName').value = cat.name;
  zeigeFragen(cat.questions || []);
  aktuellerName = cat.name;
}

async function kategorieLoeschen(name) {
  if (!confirm(`Kategorie "${name}" wirklich löschen?`)) return;
  await fetch('/api/categories/' + encodeURIComponent(name), { method: 'DELETE' });
  ladeKategorien();
  document.getElementById('categoryName').value = '';
  document.getElementById('questionList').innerHTML = '';
  aktuellerName = null;
}

document.getElementById('categoryForm').onsubmit = async function(e) {
  e.preventDefault();
  const name = document.getElementById('categoryName').value.trim();
  if (!name) return alert("Bitte einen Kategorienamen eingeben!");
  const qRows = document.querySelectorAll('#questionList > div');
  const questions = [];
  for (let row of qRows) {
    const inputs = row.querySelectorAll('input');
    const question = inputs[0].value.trim();
    const answer = inputs[1].value.trim();
    const points = parseInt(inputs[2].value, 10);
    if (question && answer && !isNaN(points)) {
      questions.push({ question, answer, points });
    }
  }
  if (questions.length === 0) return alert("Bitte mindestens eine Frage eintragen!");

  // Speichern (anlegen oder überschreiben)
  await fetch('/api/categories/' + encodeURIComponent(name), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, questions })
  });

  // Umbenennen: Wenn der alte Name ungleich dem neuen Namen ist, alte Datei löschen!
  if (aktuellerName && aktuellerName !== name) {
    await fetch('/api/categories/' + encodeURIComponent(aktuellerName), {
      method: 'DELETE'
    });
  }

  alert('Kategorie gespeichert!');
  ladeKategorien();
  document.getElementById('categoryName').value = '';
  document.getElementById('questionList').innerHTML = '';
  aktuellerName = null;
};

ladeKategorien();