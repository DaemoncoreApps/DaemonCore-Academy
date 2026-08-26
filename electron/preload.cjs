const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('daemoncore', {
  platform: process.platform,
  version: '0.3.0',
  range: Object.freeze({
    availability: () => ipcRenderer.invoke('range:availability'),
    status: () => ipcRenderer.invoke('range:status'),
    manifest: id => ipcRenderer.invoke('range:manifest', id),
    start: id => ipcRenderer.invoke('range:start', id),
    execute: (id, command) => ipcRenderer.invoke('range:execute', id, command),
    stop: () => ipcRenderer.invoke('range:stop'),
  }),
})
