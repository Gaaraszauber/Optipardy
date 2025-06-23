const { app, BrowserWindow } = require('electron');
const path = require('path');
const child_process = require('child_process');

let serverProcess;

// Prüfe, ob wir im Server-Kontext sind (EXE wurde mit server.js als Argument gestartet)
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  require('./server.js');
  return;
}

function createWindow () {
  const win = new BrowserWindow({
    width: 1300,
    height: 900,
    title: "Optipardy",
    icon: path.join(__dirname, 'icon.ico'),
    autoHideMenuBar: true,
    frame: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.setMenuBarVisibility(false);
  win.loadURL('http://localhost:3000/');
}

function startServer() {
  // Starte server.js, aber verhindere Endlosschleife!
  serverProcess = child_process.spawn(
    process.execPath,
    [path.join(__dirname, 'server.js')],
    { stdio: 'ignore', detached: false }
  );
}

app.whenReady().then(() => {
  startServer();
  setTimeout(createWindow, 1500);
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('close-app', () => {
  app.quit();
});