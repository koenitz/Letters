const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs/promises')
const os = require('os')

// ── Locale detection ──────────────────────────────────────────────────────────
// DE if system locale is German or region is DE/AT/CH
function isGerman() {
  const locale = (app.getLocale() || '').toLowerCase()
  const region = (app.getLocaleCountryCode() || '').toLowerCase()
  if (locale.startsWith('de') || locale.startsWith('gsw')) return true
  if (['de', 'at', 'ch'].includes(region)) return true
  return false
}

// ── Window ────────────────────────────────────────────────────────────────────
let win

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 600,
    minHeight: 480,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:1420')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// ── Menu ──────────────────────────────────────────────────────────────────────
function buildMenu(de) {
  const send = (channel) => win?.webContents.send(channel)

  const template = [
    {
      label: 'Letters',
      submenu: [
        {
          label: de ? 'Über Letters' : 'About Letters',
          click: () => {
            dialog.showMessageBox(win, {
              type: 'info',
              title: 'Letters',
              message: 'Letters',
              detail: `Version 0.2.0\n\nVibe-coded by Christopher Könitz.\nEnjoy your writing experience.`,
              buttons: ['OK'],
            })
          },
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide',      label: de ? 'Letters ausblenden' : 'Hide Letters' },
        { role: 'hideOthers', label: de ? 'Andere ausblenden' : 'Hide Others' },
        { role: 'unhide',    label: de ? 'Alle einblenden'    : 'Show All' },
        { type: 'separator' },
        { role: 'quit',      label: de ? 'Letters beenden'    : 'Quit Letters' },
      ],
    },
    {
      label: de ? 'Datei' : 'File',
      submenu: [
        {
          label: de ? 'Laden'    : 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: () => send('menu:open'),
        },
        { type: 'separator' },
        {
          label: de ? 'Speichern' : 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => send('menu:save'),
        },
        {
          label: de ? 'Speichern als\u2026' : 'Save As\u2026',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => send('menu:save-as'),
        },
      ],
    },
    {
      label: de ? 'Bearbeiten' : 'Edit',
      submenu: [
        { role: 'undo',      label: de ? 'Rückgängig'      : 'Undo' },
        { role: 'redo',      label: de ? 'Wiederholen'     : 'Redo' },
        { type: 'separator' },
        { role: 'cut',       label: de ? 'Ausschneiden'    : 'Cut' },
        { role: 'copy',      label: de ? 'Kopieren'        : 'Copy' },
        { role: 'paste',     label: de ? 'Einfügen'        : 'Paste' },
        { role: 'selectAll', label: de ? 'Alles auswählen' : 'Select All' },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ── IPC: File Operations ──────────────────────────────────────────────────────
ipcMain.handle('dialog:open', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const filePath = result.filePaths[0]
  const content = await fs.readFile(filePath, 'utf-8')
  return { filePath, content }
})

ipcMain.handle('dialog:save', async (_, { filePath, content }) => {
  let targetPath = filePath
  if (!targetPath) {
    const result = await dialog.showSaveDialog(win, {
      defaultPath: path.join(os.homedir(), 'Documents', 'Dokument.md'),
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    })
    if (result.canceled || !result.filePath) return null
    targetPath = result.filePath
  }
  await fs.writeFile(targetPath, content, 'utf-8')
  return targetPath
})

ipcMain.handle('dialog:save-as', async (_, { content }) => {
  const result = await dialog.showSaveDialog(win, {
    defaultPath: path.join(os.homedir(), 'Documents', 'Dokument.md'),
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  })
  if (result.canceled || !result.filePath) return null
  await fs.writeFile(result.filePath, content, 'utf-8')
  return result.filePath
})

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  const de = isGerman()
  buildMenu(de)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
