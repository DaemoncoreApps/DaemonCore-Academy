const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const { writeFile } = require('fs/promises')
const path = require('path')
const { RangeOrchestrator } = require('./range-orchestrator.cjs')
const { DataStore } = require('./data-store.cjs')

const isDev = !app.isPackaged
const rangeRoot = isDev ? path.join(__dirname, '..', 'ranges') : path.join(process.resourcesPath, 'ranges')
const range = new RangeOrchestrator(rangeRoot)
let dataStore
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
ipcMain.handle('data:snapshot', rangeHandler(() => dataStore.snapshot()))
ipcMain.handle('data:onboard', rangeHandler(handle => dataStore.onboard(handle)))
ipcMain.handle('data:record', rangeHandler(event => dataStore.record(event)))
ipcMain.handle('data:settings', rangeHandler(settings => dataStore.updateSettings(settings)))
ipcMain.handle('data:reset', rangeHandler(() => dataStore.reset()))
ipcMain.handle('data:export', rangeHandler(async () => {
  const result = await dialog.showSaveDialog({
    title: 'Export DaemonCore operator record',
    defaultPath: `daemoncore-operator-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON record', extensions: ['json'] }],
  })
  if (result.canceled || !result.filePath) return { canceled: true }
  await writeFile(result.filePath, `${JSON.stringify(dataStore.snapshot(), null, 2)}\n`, 'utf8')
  return { canceled: false, filePath: result.filePath }
}))

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

app.whenReady().then(async () => {
  dataStore = new DataStore(app.getPath('userData'))
  await dataStore.initialize()
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
