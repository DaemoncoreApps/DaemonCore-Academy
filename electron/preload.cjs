const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('daemoncore', {
  platform: process.platform,
  version: '1.0.0',
  range: Object.freeze({
    availability: () => ipcRenderer.invoke('range:availability'),
    status: () => ipcRenderer.invoke('range:status'),
    manifest: id => ipcRenderer.invoke('range:manifest', id),
    start: id => ipcRenderer.invoke('range:start', id),
    execute: (id, command) => ipcRenderer.invoke('range:execute', id, command),
    stop: () => ipcRenderer.invoke('range:stop'),
  }),
  data: Object.freeze({
    snapshot: () => ipcRenderer.invoke('data:snapshot'),
    onboard: handle => ipcRenderer.invoke('data:onboard', handle),
    record: event => ipcRenderer.invoke('data:record', event),
    updateSettings: settings => ipcRenderer.invoke('data:settings', settings),
    reset: () => ipcRenderer.invoke('data:reset'),
    export: () => ipcRenderer.invoke('data:export'),
  }),
})
