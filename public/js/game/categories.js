// categories.js

let allCategoriesTree = [];   // Baumstruktur aus /api/categories
let allCategoriesFlat = [];   // Flache Liste aus /api/game-categories
let selectedCategories = [];  // Ausgewählte Kategorien (Objekte)

/**
 * Lädt die komplette Kategorien-Baumstruktur vom Server (für das Popup).
 * @returns {Promise<Array>} Baumstruktur
 */
export async function loadCategoriesTree() {
  try {
    const response = await fetch('/api/categories');
    allCategoriesTree = await response.json();
    return allCategoriesTree;
  } catch (error) {
    console.error('Fehler beim Laden der Kategorien-Baumstruktur:', error);
    allCategoriesTree = [];
    return [];
  }
}

/**
 * Lädt die flache Liste aller Kategorien (mit Fragen) vom Server.
 * @returns {Promise<Array>} Flache Liste
 */
export async function loadCategoriesFlat() {
  try {
    const response = await fetch('/api/game-categories');
    allCategoriesFlat = await response.json();
    return allCategoriesFlat;
  } catch (error) {
    console.error('Fehler beim Laden der Kategorien-Liste:', error);
    allCategoriesFlat = [];
    return [];
  }
}

/**
 * Gibt die aktuell ausgewählten Kategorien (Objekte) zurück.
 * @returns {Array}
 */
export function getSelectedCategories() {
  return selectedCategories;
}

/**
 * Setzt die ausgewählten Kategorien (z.B. beim Spielstart).
 * @param {Array} categories - Array von Kategorie-Objekten
 */
export function setSelectedCategories(categories) {
  selectedCategories = categories;
}

/**
 * Fügt eine Kategorie zu den ausgewählten hinzu (keine Duplikate).
 * @param {Object} category
 */
export function addSelectedCategory(category) {
  if (!selectedCategories.some(cat => cat.name === category.name)) {
    selectedCategories.push(category);
  }
}

/**
 * Entfernt eine Kategorie aus den ausgewählten.
 * @param {String} name - Kategoriename
 */
export function removeSelectedCategory(name) {
  selectedCategories = selectedCategories.filter(cat => cat.name !== name);
}

/**
 * Rendert die aktuell ausgewählten Kategorien in den Bereich "Für das Spiel ausgewählt".
 * @param {HTMLElement} container - Ziel-Container
 */
export function renderSelectedCategories(container = document.getElementById('selectedCategories')) {
  if (!container) return;
  container.innerHTML = '';

  const selected = getSelectedCategories();

  selected.forEach(cat => {
    const item = document.createElement('div');
    item.className = 'selected-category-item';
    item.textContent = cat.name;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.setAttribute('aria-label', `Kategorie ${cat.name} entfernen`);
    removeBtn.innerHTML = '&times;';
    removeBtn.onclick = () => {
      removeSelectedCategory(cat.name);
      renderSelectedCategories(container);
      const startBtn = document.getElementById('startGame');
      if (startBtn) startBtn.disabled = getSelectedCategories().length === 0;
    };

    item.appendChild(removeBtn);
    container.appendChild(item);
  });

  const startBtn = document.getElementById('startGame');
  if (startBtn) startBtn.disabled = selected.length === 0;
}
