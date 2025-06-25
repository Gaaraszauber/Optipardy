const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Basic Auth Middleware
const basicAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) {
    res.set('WWW-Authenticate', 'Basic realm="Protected Area"');
    return res.status(401).send('Authentifizierung erforderlich');
  }
  const [username, password] = Buffer.from(auth.split(' ')[1], 'base64')
    .toString().split(':');
  if (username === 'admin' && password === 'geheim') {
    return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Protected Area"');
  return res.status(401).send('Ungültige Zugangsdaten');
};

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routen
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/game', basicAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'game.html')));
app.get('/editor', basicAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'editor.html')));
app.get('/download', (req, res) => res.redirect('https://github.com/Gaaraszauber/Optipardy'));
app.get('/credits', (req, res) => res.sendFile(path.join(__dirname, 'public', 'credits.html')));

// API: Kategorien als Baumstruktur laden
app.get('/api/categories', (req, res) => {
  const readDir = (dir, basePath = '') => {
    const result = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    items.forEach(item => {
      const fullPath = path.join(dir, item.name);
      const relPath = basePath ? `${basePath}/${item.name}` : item.name;
      if (item.isDirectory()) {
        result.push({
          type: 'folder',
          name: item.name,
          path: relPath,
          children: readDir(fullPath, relPath)
        });
      } else if (item.isFile() && item.name.endsWith('.json')) {
        try {
          const data = fs.readFileSync(fullPath, 'utf8');
          result.push({
            type: 'file',
            name: path.basename(item.name, '.json'),
            path: relPath.replace(/\.json$/, ''),
            ...JSON.parse(data)
          });
        } catch (e) {
          console.error(`Fehler beim Lesen von ${fullPath}:`, e);
        }
      }
    });
    return result;
  };
  try {
    const categoriesDir = path.join(__dirname, 'categories');
    const structure = readDir(categoriesDir);
    res.json(structure);
  } catch (err) {
    console.error("Fehler beim Laden der Kategorien:", err);
    res.status(500).send('Serverfehler');
  }
});

// API: Kategorie speichern
app.post('/api/categories/:path(*)', (req, res) => {
  const name = req.params.path;
  const filePath = path.join(__dirname, 'categories', `${name}.json`);
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFile(filePath, JSON.stringify(req.body, null, 2), (err) => {
    if (err) {
      console.error("Fehler beim Speichern:", err);
      return res.status(500).send('Speichern fehlgeschlagen');
    }
    res.sendStatus(200);
  });
});

app.delete('/api/categories/:path(*)', (req, res) => {
  const filePath = path.join(__dirname, 'categories', `${req.params.path}.json`);
  console.log('Lösche:', filePath);

  fs.unlink(filePath, (err) => {
    if (err) {
      // Prüfe, ob die Datei trotzdem gelöscht wurde
      if (!fs.existsSync(filePath)) {
        console.log('Datei wurde gelöscht - sende Erfolgsstatus');
        return res.sendStatus(200);
      }
      console.error("Fehler beim Löschen:", err);
      return res.status(500).send('Löschen fehlgeschlagen');
    }
    
    // Erfolgsfall: Datei wurde gelöscht
    res.sendStatus(200);
  });
});


// API: Ordner erstellen
app.post('/api/folders', (req, res) => {
  const folderPath = path.join(__dirname, 'categories', req.body.path);
  fs.mkdir(folderPath, { recursive: true }, (err) => {
    if (err) {
      console.error("Fehler beim Erstellen:", err);
      return res.status(500).send('Ordner konnte nicht erstellt werden');
    }
    res.sendStatus(200);
  });
});

// API: Ordner löschen
app.delete('/api/folders', (req, res) => {
  const folderPath = path.join(__dirname, 'categories', req.body.path);
  fs.rm(folderPath, { recursive: true, force: true }, (err) => {
    if (err) {
      console.error("Fehler beim Löschen des Ordners:", err);
      return res.status(500).send('Ordner konnte nicht gelöscht werden');
    }
    res.sendStatus(200);
  });
});

// API: Ordner umbenennen
app.post('/api/folders/rename', (req, res) => {
  const { oldPath, newName } = req.body;
  if (!oldPath || !newName) {
    return res.status(400).send('Pfad und neuer Name erforderlich');
  }
  const baseDir = path.join(__dirname, 'categories');
  const absOldPath = path.join(baseDir, oldPath);
  const absNewPath = path.join(baseDir, path.dirname(oldPath), newName);
  if (!fs.existsSync(absOldPath)) {
    return res.status(404).send('Alter Ordner existiert nicht');
  }
  if (fs.existsSync(absNewPath)) {
    return res.status(409).send('Ziel existiert bereits');
  }
  fs.rename(absOldPath, absNewPath, (err) => {
    if (err) {
      console.error('Fehler beim Umbenennen:', err);
      return res.status(500).send('Fehler beim Umbenennen');
    }
    res.sendStatus(200);
  });
});

// Flache Liste aller Kategorien für das Spiel
app.get('/api/game-categories', (req, res) => {
  const readAllFiles = (dir, basePath = '') => {
    let result = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    items.forEach(item => {
      const fullPath = path.join(dir, item.name);
      const relPath = basePath ? `${basePath}/${item.name}` : item.name;
      
      if (item.isDirectory()) {
        result = result.concat(readAllFiles(fullPath, relPath));
      } else if (item.isFile() && item.name.endsWith('.json')) {
        try {
          const data = fs.readFileSync(fullPath, 'utf8');
          const categoryData = JSON.parse(data);
          result.push({
            name: path.basename(item.name, '.json'),
            path: relPath.replace(/\.json$/, ''),
            ...categoryData
          });
        } catch (e) {
          console.error(`Fehler beim Lesen von ${fullPath}:`, e);
        }
      }
    });
    return result;
  };
  
  try {
    const categoriesDir = path.join(__dirname, 'categories');
    const flatList = readAllFiles(categoriesDir);
    res.json(flatList);
  } catch (err) {
    console.error("Fehler beim Laden der Kategorien:", err);
    res.status(500).send('Serverfehler');
  }
});


// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
