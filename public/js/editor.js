let categories = [];
let currentCategory = null;
const dragHandleSVG = `<span class="drag-handle" style="cursor: grab;">☰</span>`;

// DOM-Elemente
const categoryList = document.getElementById('categoryList');
const categoryForm = document.getElementById('categoryForm');
const categoryNameInput = document.getElementById('categoryName');
const questionList = document.getElementById('questionList');
const addQuestionBtn = document.getElementById('addQuestionBtn');
const cancelBtn = document.getElementById('cancelBtn');
const backBtn = document.getElementById('backBtn');
const deleteBtn = document.getElementById('deleteBtn');
const editorTitle = document.getElementById('editorTitle');
const addTeacherBtn = document.getElementById('addTeacherBtn');

// Drag & Drop für Fragen initialisieren
let questionSortable = null;
function initQuestionSortable() {
  if (questionSortable && questionSortable.destroy) questionSortable.destroy();
  questionSortable = new Sortable(questionList, {
    handle: '.drag-handle',
    animation: 150,
    ghostClass: 'sortable-ghost'
  });
}

// Initialisierung
document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  setupEventListeners();
});

async function loadCategories() {
  try {
    const response = await fetch('/api/categories');
    categories = await response.json();
    renderCategoryTree();
  } catch (error) {
    console.error('Fehler beim Laden der Kategorien:', error);
    alert('Kategorien konnten nicht geladen werden!');
  }
}

function renderCategoryTree() {
  categoryList.innerHTML = '';
  renderVerticalIndented(categories, categoryList, 0, '');
}

function renderVerticalIndented(items, parentUl, depth, parentPath) {
  items.forEach(item => {
    const li = document.createElement('li');
    li.style.paddingLeft = (depth * 16) + 'px';
    
    if (item.type === 'folder') {
      li.className = 'folder-node folder-collapsed';
      li.innerHTML = `
        <button class="action-btn folder-toggle" aria-label="Ordner auf/zu">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        <span class="folder-icon">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-7l-2-2H5a2 2 0 0 0-2 2z" fill="#90caf9"/>
          </svg>
        </span>
        <span class="folder-name">${item.name}</span>
        <div class="node-actions">
          <button class="action-btn btn-folder-rename" title="Ordner umbenennen">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M3 17.25V21h3.75l11-11.03-3.75-3.75L3 17.25z" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M14.75 6.04a1 1 0 0 1 1.41 0l1.8 1.8a1 1 0 0 1 0 1.41l-1.13 1.13-3.22-3.22 1.14-1.12z" fill="none" stroke="currentColor" stroke-width="2"/>
            </svg>
          </button>
          <button class="action-btn btn-folder-add" title="Unterordner anlegen">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
          </button>
          <button class="action-btn btn-category-add" title="Kategorie anlegen">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
          </button>
          <button class="action-btn btn-folder-delete" title="Ordner löschen">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M3 6h18M8 6v12a2 2 0 002 2h4a2 2 0 002-2V6m-6 0V4a2 2 0 012-2h0a2 2 0 012 2v2" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
          </button>
        </div>
      `;
      parentUl.appendChild(li);

      const childrenContainer = document.createElement('ul');
      childrenContainer.className = 'folder-children category-tree';
      childrenContainer.style.display = 'none';
      parentUl.appendChild(childrenContainer);

      li.querySelector('.folder-toggle').onclick = function(e) {
        e.stopPropagation();
        const isCollapsed = childrenContainer.style.display === 'none';
        childrenContainer.style.display = isCollapsed ? 'block' : 'none';
        li.querySelector('.folder-toggle svg').style.transform =
          isCollapsed ? 'rotate(90deg)' : '';
      };

      li.querySelector('.btn-folder-rename').onclick = async (e) => {
        e.stopPropagation();
        const newName = prompt('Neuer Name für Ordner:', item.name);
        if (!newName || newName === item.name) return;
        await fetch('/api/folders/rename', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldPath: item.path, newName })
        });
        loadCategories();
      };

      li.querySelector('.btn-folder-add').onclick = async (e) => {
        e.stopPropagation();
        const folderName = prompt('Name des neuen Unterordners:');
        if (!folderName) return;
        const newPath = (item.path ? item.path + '/' : '') + folderName;
        await fetch('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: newPath })
        });
        loadCategories();
      };

      li.querySelector('.btn-category-add').onclick = async (e) => {
        e.stopPropagation();
        const catName = prompt('Name der neuen Kategorie:');
        if (!catName) return;
        const catPath = (item.path ? item.path + '/' : '') + catName;
        await fetch(`/api/categories/${encodeURIComponent(catPath)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: catName, questions: [] })
        });
        loadCategories();
      };

      li.querySelector('.btn-folder-delete').onclick = async (e) => {
        e.stopPropagation();
        if (!confirm(`Ordner "${item.name}" und ALLE Inhalte wirklich löschen?`)) return;
        await fetch('/api/folders', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: item.path })
        });
        loadCategories();
      };

      renderVerticalIndented(item.children, childrenContainer, depth + 1, item.path);

    } else {
      li.className = 'category-node';
      li.innerHTML = `
        <span class="category-name">${item.name}</span>
        <div class="node-actions">
          <button class="action-btn btn-category-edit" title="Bearbeiten">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M17 3a2.828 2.828 0 0 1 4 4L7 21H3v-4L17 3z"/>
            </svg>
          </button>
          <button class="action-btn btn-category-delete" title="Löschen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-2 14H7L5 6"/>
              <path d="M10 11v6"/>
              <path d="M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      `;
      li.querySelector('.btn-category-edit').onclick = (e) => {
        e.stopPropagation();
        editCategory(item);
      };
      li.querySelector('.btn-category-delete').onclick = async (e) => {
        e.stopPropagation();
        if (!confirm(`Kategorie "${item.name}" wirklich löschen?`)) return;
        await fetch(`/api/categories/${encodeURIComponent(item.path)}`, {
          method: 'DELETE'
        });
        loadCategories();
        resetEditor();
      };
      li.querySelector('.category-name').onclick = () => editCategory(item);
      parentUl.appendChild(li);
    }
  });
}

function setupEventListeners() {
  // Prüfen, ob Elemente existieren bevor EventListener hinzugefügt werden
  if (addTeacherBtn) {
    addTeacherBtn.addEventListener('click', async () => {
      const folderName = prompt('Name des neuen Lehrers:');
      if (!folderName) return;
      await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderName })
      });
      loadCategories();
    });
  }

  if (addQuestionBtn) {
    addQuestionBtn.addEventListener('click', () => {
      addQuestionRow();
      initQuestionSortable();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => resetEditor());
  }

  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/';
    });
  }

  if (categoryForm) {
    categoryForm.addEventListener('submit', saveCategory);
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', deleteCurrentCategory);
  }
}

function addQuestionRow(question = '', answer = '', points = 100) {
  const row = document.createElement('div');
  row.className = 'question-row';
  row.innerHTML = `
    ${dragHandleSVG}
    <input type="text" class="question-input" placeholder="Frage" value="${question}" required>
    <input type="text" class="question-input" placeholder="Antwort" value="${answer}" required>
    <input type="number" class="question-input punkte-input" placeholder="Punkte" value="${points}" min="0" max="1000" step="100" required>
    <button type="button" class="remove-btn">Entfernen</button>
  `;
  row.querySelector('.remove-btn').addEventListener('click', () => {
    row.remove();
    initQuestionSortable();
  });
  questionList.appendChild(row);
  initQuestionSortable();
}

function editCategory(category) {
  currentCategory = category;
  categoryNameInput.value = category.name;
  questionList.innerHTML = '';
  (category.questions || []).forEach(q => addQuestionRow(q.question, q.answer, q.points));

  
  initQuestionSortable();
}


async function deleteCurrentCategory() {
  if (!currentCategory) {
    alert('Keine Kategorie zum Löschen ausgewählt!');
    return;
  }
  
  if (!confirm(`Kategorie "${currentCategory.name}" wirklich löschen?`)) return;

  try {
    const response = await fetch(`/api/categories/${encodeURIComponent(currentCategory.path)}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      alert('Kategorie erfolgreich gelöscht!'); // <-- Erfolgsmeldung anzeigen
      loadCategories();
      resetEditor();
    } else {
      const errorText = await response.text();
      throw new Error(`Serverfehler: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('Fehler beim Löschen:', error);
    alert('Kategorie konnte nicht gelöscht werden!');
  }
}

async function saveCategory(e) {
  e.preventDefault();
  const name = categoryNameInput.value.trim();
  if (!name) return alert('Bitte Namen eingeben!');
  const questions = [];
  const rows = questionList.querySelectorAll('.question-row');
  for (const row of rows) {
    const inputs = row.querySelectorAll('.question-input');
    const question = inputs[0].value.trim();
    const answer = inputs[1].value.trim();
    const points = parseInt(inputs[2].value, 10);
    if (question && answer && !isNaN(points)) {
      questions.push({ question, answer, points });
    }
  }
  if (questions.length === 0) return alert('Bitte mindestens eine Frage hinzufügen!');
  try {
    let newPath = name;
    if (currentCategory && currentCategory.path) {
      const pathParts = currentCategory.path.split('/');
      pathParts[pathParts.length - 1] = name; // Nur den letzten Teil (Dateiname) ersetzen
      newPath = pathParts.join('/');
    }
    await fetch(`/api/categories/${encodeURIComponent(newPath)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, questions })
    });

    if (currentCategory && currentCategory.name !== name) {
      await fetch(`/api/categories/${encodeURIComponent(currentCategory.path)}`, {
        method: 'DELETE'
      });
    }
    alert('Kategorie gespeichert!');
    loadCategories();
    resetEditor();
  } catch (error) {
    console.error('Fehler beim Speichern:', error);
    alert('Fehler beim Speichern der Kategorie!');
  }
}

function resetEditor() {
  categoryNameInput.value = '';
  questionList.innerHTML = '';
  currentCategory = null;
  initQuestionSortable();
}
