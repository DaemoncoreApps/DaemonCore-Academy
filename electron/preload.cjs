const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('daemoncore', {
  platform: process.platform,
  version: '0.2.0',
})
