const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('daemoncore', {
  platform: process.platform,
  version: '1.2.0',
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
  license: Object.freeze({
    snapshot: () => ipcRenderer.invoke('license:snapshot'),
    activate: input => ipcRenderer.invoke('license:activate', input),
    validate: () => ipcRenderer.invoke('license:validate'),
    deactivate: () => ipcRenderer.invoke('license:deactivate'),
    checkout: () => ipcRenderer.invoke('license:checkout'),
  }),
  fieldops: Object.freeze({
    snapshot: () => ipcRenderer.invoke('fieldops:snapshot'),
    create: input => ipcRenderer.invoke('fieldops:create', input),
    run: input => ipcRenderer.invoke('fieldops:run', input),
    close: id => ipcRenderer.invoke('fieldops:close', id),
    export: id => ipcRenderer.invoke('fieldops:export', id),
  }),
})
