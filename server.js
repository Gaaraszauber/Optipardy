const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

//aktuelle ip: 79.201.34.217

app.use(express.json());
app.use(express.static(__dirname + '/public'));

app.get('/game', (req, res) => res.sendFile(path.join(__dirname, 'public', 'game.html')));
app.get('/editor', (req, res) => res.sendFile(path.join(__dirname, 'public', 'editor.html')));
app.get('/credits', (req, res) => res.sendFile(path.join(__dirname, 'public', 'credits.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Alle Kategorien laden
app.get('/api/categories', (req, res) => {
  fs.readdir(path.join(__dirname, 'categories'), (err, files) => {
    if (err) {
      console.log("Fehler beim Laden der Kategorien:", err);
      return res.status(500).send('Fehler beim Laden!');
    }
    const categories = [];
    let readCount = 0;
    files = files.filter(f => f.endsWith('.json'));
    if (files.length === 0) return res.json([]);
    files.forEach(file => {
      fs.readFile(path.join(__dirname, 'categories', file), (err, data) => {
        readCount++;
        if (!err) categories.push(JSON.parse(data));
        if (readCount === files.length) {
          res.json(categories);
        }
      });
    });
  });
});

// Kategorie speichern/anlegen (überschreibt immer)
app.post('/api/categories/:name', (req, res) => {
  const file = path.join(__dirname, 'categories', req.params.name + '.json');
  const { name, questions } = req.body;
  fs.writeFile(file, JSON.stringify({ name, questions }, null, 2), err => {
    if (err) {
      console.log("Fehler beim Speichern:", err);
      return res.status(500).send('Fehler beim Speichern!');
    }
    res.sendStatus(200);
  });
});

// Kategorie löschen
app.delete('/api/categories/:name', (req, res) => {
  const file = path.join(__dirname, 'categories', req.params.name + '.json');
  fs.unlink(file, err => {
    if (err) {
      console.log("Fehler beim Löschen:", err);
      return res.status(404).send('Kategorie nicht gefunden oder konnte nicht gelöscht werden!');
    }
    res.sendStatus(200);
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
