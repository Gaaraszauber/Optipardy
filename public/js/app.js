async function ladeKategorien() {
  const res = await fetch('/api/categories');
  return await res.json();
}

// Beispiel: Kategorien laden und anzeigen
ladeKategorien().then(kategorien => {
  // Hier kannst du das Spielfeld dynamisch bauen
  console.log(kategorien);
});
