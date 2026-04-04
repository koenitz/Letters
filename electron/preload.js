const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFile:   ()                       => ipcRenderer.invoke('dialog:open'),
  saveFile:   (filePath, content)      => ipcRenderer.invoke('dialog:save',    { filePath, content }),
  saveFileAs: (content)                => ipcRenderer.invoke('dialog:save-as', { content }),

  // Menu events from main process → renderer
  onMenuOpen:   (cb) => ipcRenderer.on('menu:open',    cb),
  onMenuSave:   (cb) => ipcRenderer.on('menu:save',    cb),
  onMenuSaveAs: (cb) => ipcRenderer.on('menu:save-as', cb),
})
