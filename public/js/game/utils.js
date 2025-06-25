// utils.js

/**
 * Mischt ein Array in-place (Fisher-Yates-Shuffle).
 * @param {Array} arr
 * @returns {Array} Das gemischte Array (Referenz bleibt gleich)
 */
export function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Gibt eine Zufallszahl im Bereich [min, max) zurück.
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Wandelt einen String in einen "Slug" um (z.B. für Dateinamen oder URLs).
 * @param {string} str
 * @returns {string}
 */
export function slugify(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')           // Leerzeichen durch Bindestrich
    .replace(/[^\w\-]+/g, '')       // Nicht-Wortzeichen entfernen
    .replace(/\-\-+/g, '-')         // Mehrere Bindestriche zu einem
    .replace(/^-+/, '')             // Am Anfang entfernen
    .replace(/-+$/, '');            // Am Ende entfernen
}

/**
 * Deep-Copy eines Objekts oder Arrays.
 * @param {any} obj
 * @returns {any}
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Formatiert eine Zeit in Sekunden als mm:ss.
 * @param {number} seconds
 * @returns {string}
 */
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
