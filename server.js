const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Hilfsfunktion für Zeitstempel
const getTimestamp = () => {
  return new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
};

// Basic Auth Middleware
const basicAuth = (req, res, next) => {
  console.log(`[${getTimestamp()}] Basic Auth Anfrage für: ${req.url}`);
  const auth = req.headers.authorization;
  if (!auth) {
    console.log(`[${getTimestamp()}] Keine Auth-Daten erhalten`);
    res.set('WWW-Authenticate', 'Basic realm="Protected Area"');
    return res.status(401).send('Authentifizierung erforderlich');
  }
  const [username, password] = Buffer.from(auth.split(' ')[1], 'base64')
    .toString().split(':');
  if (username === 'admin' && password === 'geheim') {
    console.log(`[${getTimestamp()}] Erfolgreiche Authentifizierung für: ${req.url}`);
    return next();
  }
  console.log(`[${getTimestamp()}] Ungültige Zugangsdaten für: ${req.url}`);
  res.set('WWW-Authenticate', 'Basic realm="Protected Area"');
  return res.status(401).send('Ungültige Zugangsdaten');
};

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Logging-Middleware für alle Anfragen
app.use((req, res, next) => {
  console.log(`[${getTimestamp()}] ${req.method} ${req.url}`);
  next();
});

// Routen
app.get('/', (req, res) => {
  console.log(`[${getTimestamp()}] Serving index.html`);
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/game', (req, res) => {
  console.log(`[${getTimestamp()}] Serving game.html`);
  res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

app.get('/editor', basicAuth, (req, res) => {
  console.log(`[${getTimestamp()}] Serving editor.html`);
  res.sendFile(path.join(__dirname, 'public', 'editor.html'));
});

app.get('/download', (req, res) => {
  console.log(`[${getTimestamp()}] Redirecting to GitHub`);
  res.redirect('https://github.com/Gaaraszauber/Optipardy');
});

app.get('/credits', (req, res) => {
  console.log(`[${getTimestamp()}] Serving credits.html`);
  res.sendFile(path.join(__dirname, 'public', 'credits.html'));
});

// API: Kategorien als Baumstruktur laden
app.get('/api/categories', (req, res) => {
  console.log(`[${getTimestamp()}] Lade Kategorien-Baumstruktur`);
  
  const readDir = (dir, basePath = '') => {
    const result = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    items.forEach(item => {
      const fullPath = path.join(dir, item.name);
      const relPath = basePath ? `${basePath}/${item.name}` : item.name;
      if (item.isDirectory()) {
        console.log(`[${getTimestamp()}] Verarbeite Ordner: ${relPath}`);
        result.push({
          type: 'folder',
          name: item.name,
          path: relPath,
          children: readDir(fullPath, relPath)
        });
      } else if (item.isFile() && item.name.endsWith('.json')) {
        try {
          console.log(`[${getTimestamp()}] Verarbeite Datei: ${relPath}`);
          const data = fs.readFileSync(fullPath, 'utf8');
          result.push({
            type: 'file',
            name: path.basename(item.name, '.json'),
            path: relPath.replace(/\.json$/, ''),
            ...JSON.parse(data)
          });
        } catch (e) {
          console.error(`[${getTimestamp()}] Fehler beim Lesen von ${fullPath}:`, e);
        }
      }
    });
    return result;
  };
  
  try {
    const categoriesDir = path.join(__dirname, 'categories');
    console.log(`[${getTimestamp()}] Starte Kategorieladen von: ${categoriesDir}`);
    const structure = readDir(categoriesDir);
    console.log(`[${getTimestamp()}] Kategorien erfolgreich geladen (${structure.length} Elemente)`);
    res.json(structure);
  } catch (err) {
    console.error(`[${getTimestamp()}] Fehler beim Laden der Kategorien:`, err);
    res.status(500).send('Serverfehler');
  }
});

// API: Kategorie speichern
app.post('/api/categories/:path(*)', (req, res) => {
  const name = req.params.path;
  const filePath = path.join(__dirname, 'categories', `${name}.json`);
  const dirPath = path.dirname(filePath);
  
  console.log(`[${getTimestamp()}] Speichere Kategorie: ${name}`);
  console.log(`[${getTimestamp()}] Zielpfad: ${filePath}`);

  if (!fs.existsSync(dirPath)) {
    console.log(`[${getTimestamp()}] Erstelle Verzeichnis: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  fs.writeFile(filePath, JSON.stringify(req.body, null, 2), (err) => {
    if (err) {
      console.error(`[${getTimestamp()}] Fehler beim Speichern von ${filePath}:`, err);
      return res.status(500).send('Speichern fehlgeschlagen');
    }
    console.log(`[${getTimestamp()}] Datei erfolgreich gespeichert: ${filePath}`);
    res.sendStatus(200);
  });
});

// API: Kategorie löschen
app.delete('/api/categories/:path(*)', (req, res) => {
  const filePath = path.join(__dirname, 'categories', `${req.params.path}.json`);
  console.log(`[${getTimestamp()}] Lösche Kategorie: ${filePath}`);

  fs.unlink(filePath, (err) => {
    if (err) {
      if (!fs.existsSync(filePath)) {
        console.log(`[${getTimestamp()}] Datei bereits gelöscht: ${filePath}`);
        return res.sendStatus(200);
      }
      console.error(`[${getTimestamp()}] Fehler beim Löschen von ${filePath}:`, err);
      return res.status(500).send('Löschen fehlgeschlagen');
    }
    
    console.log(`[${getTimestamp()}] Datei erfolgreich gelöscht: ${filePath}`);
    res.sendStatus(200);
  });
});

// API: Ordner erstellen
app.post('/api/folders', (req, res) => {
  const folderPath = path.join(__dirname, 'categories', req.body.path);
  console.log(`[${getTimestamp()}] Erstelle Ordner: ${folderPath}`);

  fs.mkdir(folderPath, { recursive: true }, (err) => {
    if (err) {
      console.error(`[${getTimestamp()}] Fehler beim Erstellen von ${folderPath}:`, err);
      return res.status(500).send('Ordner konnte nicht erstellt werden');
    }
    console.log(`[${getTimestamp()}] Ordner erfolgreich erstellt: ${folderPath}`);
    res.sendStatus(200);
  });
});

// API: Ordner löschen
app.delete('/api/folders', (req, res) => {
  const folderPath = path.join(__dirname, 'categories', req.body.path);
  console.log(`[${getTimestamp()}] Lösche Ordner rekursiv: ${folderPath}`);

  fs.rm(folderPath, { recursive: true, force: true }, (err) => {
    if (err) {
      console.error(`[${getTimestamp()}] Fehler beim Löschen von ${folderPath}:`, err);
      return res.status(500).send('Ordner konnte nicht gelöscht werden');
    }
    console.log(`[${getTimestamp()}] Ordner erfolgreich gelöscht: ${folderPath}`);
    res.sendStatus(200);
  });
});

// API: Ordner umbenennen
app.post('/api/folders/rename', (req, res) => {
  const { oldPath, newName } = req.body;
  if (!oldPath || !newName) {
    console.log(`[${getTimestamp()}] Ungültige Umbenennungsanfrage: oldPath=${oldPath}, newName=${newName}`);
    return res.status(400).send('Pfad und neuer Name erforderlich');
  }
  
  const baseDir = path.join(__dirname, 'categories');
  const absOldPath = path.join(baseDir, oldPath);
  const absNewPath = path.join(baseDir, path.dirname(oldPath), newName);
  
  console.log(`[${getTimestamp()}] Versuche Umbenennung: ${absOldPath} -> ${absNewPath}`);

  if (!fs.existsSync(absOldPath)) {
    console.log(`[${getTimestamp()}] Altes Verzeichnis existiert nicht: ${absOldPath}`);
    return res.status(404).send('Alter Ordner existiert nicht');
  }
  
  if (fs.existsSync(absNewPath)) {
    console.log(`[${getTimestamp()}] Zielverzeichnis existiert bereits: ${absNewPath}`);
    return res.status(409).send('Ziel existiert bereits');
  }
  
  fs.rename(absOldPath, absNewPath, (err) => {
    if (err) {
      console.error(`[${getTimestamp()}] Fehler beim Umbenennen von ${absOldPath}:`, err);
      return res.status(500).send('Fehler beim Umbenennen');
    }
    console.log(`[${getTimestamp()}] Erfolgreich umbenannt: ${absOldPath} -> ${absNewPath}`);
    res.sendStatus(200);
  });
});

// API: Flache Kategorienliste für das Spiel
app.get('/api/game-categories', (req, res) => {
  console.log(`[${getTimestamp()}] Lade flache Kategorienliste für Spiel`);

  const readAllFiles = (dir, basePath = '') => {
    let result = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    items.forEach(item => {
      const fullPath = path.join(dir, item.name);
      const relPath = basePath ? `${basePath}/${item.name}` : item.name;
      
      if (item.isDirectory()) {
        console.log(`[${getTimestamp()}] Durchsuche Unterordner: ${relPath}`);
        result = result.concat(readAllFiles(fullPath, relPath));
      } else if (item.isFile() && item.name.endsWith('.json')) {
        try {
          console.log(`[${getTimestamp()}] Verarbeite Kategorie: ${relPath}`);
          const data = fs.readFileSync(fullPath, 'utf8');
          const categoryData = JSON.parse(data);
          result.push({
            name: path.basename(item.name, '.json'),
            path: relPath.replace(/\.json$/, ''),
            ...categoryData
          });
        } catch (e) {
          console.error(`[${getTimestamp()}] Fehler beim Lesen von ${fullPath}:`, e);
        }
      }
    });
    return result;
  };
  
  try {
    const categoriesDir = path.join(__dirname, 'categories');
    console.log(`[${getTimestamp()}] Starte Laden der Spielkategorien`);
    const flatList = readAllFiles(categoriesDir);
    console.log(`[${getTimestamp()}] Erfolgreich ${flatList.length} Kategorien geladen`);
    res.json(flatList);
  } catch (err) {
    console.error(`[${getTimestamp()}] Fehler beim Laden der Spielkategorien:`, err);
    res.status(500).send('Serverfehler');
  }
});

// Server starten
app.listen(PORT, () => {
  console.log(`[${getTimestamp()}] Server gestartet auf http://localhost:${PORT}`);
  console.log(`[${getTimestamp()}] Verwendete Umgebungsvariablen:`);
  console.log(`[${getTimestamp()}] - PORT: ${PORT}`);
  console.log(`[${getTimestamp()}] - Verzeichnis: ${__dirname}`);
});
