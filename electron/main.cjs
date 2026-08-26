const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const { RangeOrchestrator } = require('./range-orchestrator.cjs')

const isDev = !app.isPackaged
const rangeRoot = isDev ? path.join(__dirname, '..', 'ranges') : path.join(process.resourcesPath, 'ranges')
const range = new RangeOrchestrator(rangeRoot)
let cleanupStarted = false

function trustedSender(event) {
  const url = event.senderFrame?.url || ''
  return isDev ? url.startsWith('http://localhost:5173') : url.startsWith('file://')
}

function rangeHandler(handler) {
  return async (event, ...args) => {
    if (!trustedSender(event)) throw new Error('Untrusted range request')
    return handler(...args)
  }
}

ipcMain.handle('range:availability', rangeHandler(() => range.availability()))
ipcMain.handle('range:status', rangeHandler(() => range.status()))
ipcMain.handle('range:manifest', rangeHandler(id => range.manifest(id)))
ipcMain.handle('range:start', rangeHandler(id => range.start(id)))
ipcMain.handle('range:execute', rangeHandler((id, command) => range.execute(id, command)))
ipcMain.handle('range:stop', rangeHandler(() => range.stop()))

function createWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#08090b',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#08090b', symbolColor: '#7d8087', height: 42 },
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.once('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) win.loadURL('http://localhost:5173')
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', event => {
  if (cleanupStarted) return
  event.preventDefault()
  cleanupStarted = true
  range.stop().catch(() => {}).finally(() => app.exit(0))
})
