const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  // Erstelle das Browser Fenster
  const windowConfig = {
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'Isometrien - Technische Zeichnungen',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    show: false, // Verhindert weißes Aufblitzen beim Start
    backgroundColor: '#ffffff'
  };

  // Icon nur hinzufügen, wenn es existiert
  const fs = require('fs');
  const iconPath = path.join(__dirname, '../resources/icon.ico');
  if (fs.existsSync(iconPath)) {
    windowConfig.icon = iconPath;
  }

  mainWindow = new BrowserWindow(windowConfig);

  // Maximiere das Fenster beim Start
  mainWindow.maximize();
  mainWindow.show();

  // Lade die Angular App
  if (isDev) {
    // Im Entwicklungsmodus: Lade von localhost
    mainWindow.loadURL('http://localhost:4200');
    mainWindow.webContents.openDevTools();
  } else {
    // Im Produktionsmodus: Lade die gebaute App
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, '../../dist/isometrien/index.html'),
        protocol: 'file:',
        slashes: true
      })
    );
  }

  // Erstelle das Anwendungsmenü
  const menuTemplate = [
    {
      label: 'Datei',
      submenu: [
        {
          label: 'Neu',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new');
          }
        },
        {
          label: 'Öffnen...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu-open');
          }
        },
        {
          label: 'Speichern',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu-save');
          }
        },
        {
          label: 'Speichern unter...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow.webContents.send('menu-save-as');
          }
        },
        { type: 'separator' },
        {
          label: 'Als PNG exportieren',
          click: () => {
            mainWindow.webContents.send('menu-export-png');
          }
        },
        {
          label: 'Als SVG exportieren',
          click: () => {
            mainWindow.webContents.send('menu-export-svg');
          }
        },
        { type: 'separator' },
        {
          label: 'Beenden',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Bearbeiten',
      submenu: [
        {
          label: 'Rückgängig',
          accelerator: 'CmdOrCtrl+Z',
          click: () => {
            mainWindow.webContents.send('menu-undo');
          }
        },
        {
          label: 'Wiederholen',
          accelerator: 'CmdOrCtrl+Y',
          click: () => {
            mainWindow.webContents.send('menu-redo');
          }
        },
        { type: 'separator' },
        {
          label: 'Kopieren',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: 'Einfügen',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        {
          label: 'Ausschneiden',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        { type: 'separator' },
        {
          label: 'Alles auswählen',
          accelerator: 'CmdOrCtrl+A',
          click: () => {
            mainWindow.webContents.send('menu-select-all');
          }
        },
        {
          label: 'Löschen',
          accelerator: 'Delete',
          click: () => {
            mainWindow.webContents.send('menu-delete');
          }
        }
      ]
    },
    {
      label: 'Ansicht',
      submenu: [
        {
          label: 'Vergrößern',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            mainWindow.webContents.send('menu-zoom-in');
          }
        },
        {
          label: 'Verkleinern',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            mainWindow.webContents.send('menu-zoom-out');
          }
        },
        {
          label: 'Auf 100% zurücksetzen',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow.webContents.send('menu-zoom-reset');
          }
        },
        { type: 'separator' },
        {
          label: 'Vollbild',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11',
          click: () => {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          }
        },
        { type: 'separator' },
        {
          label: 'Entwicklertools',
          accelerator: 'F12',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    },
    {
      label: 'Hilfe',
      submenu: [
        {
          label: 'Dokumentation',
          click: () => {
            shell.openExternal('https://github.com/marcosraz/isometrien');
          }
        },
        {
          label: 'Tastenkürzel',
          click: () => {
            mainWindow.webContents.send('menu-show-shortcuts');
          }
        },
        { type: 'separator' },
        {
          label: 'Über Isometrien',
          click: () => {
            mainWindow.webContents.send('menu-about');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Event: Fenster geschlossen
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Verhindere Navigation zu externen URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

// App Events
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Sicherheitseinstellungen
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});