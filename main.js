// main.js - Entry point for Electron
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow () {
  // Remover el menú de la aplicación
  Menu.setApplicationMenu(null);
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  win.loadFile('index.html');
  
  // DevTools habilitado para debugging
  // win.webContents.openDevTools();d
  
  // Redirigir console.log del renderer a la terminal
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message}`);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
