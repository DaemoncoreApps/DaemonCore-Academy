const { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } = require('electron')
const { writeFile } = require('fs/promises')
const os = require('os')
const path = require('path')
const { pathToFileURL } = require('url')
const { RangeOrchestrator } = require('./range-orchestrator.cjs')
const { DataStore } = require('./data-store.cjs')
const { LicenseManager } = require('./license-manager.cjs')
const { EngagementStore } = require('./engagement-store.cjs')

const isDev = !app.isPackaged
const rangeRoot = isDev ? path.join(__dirname, '..', 'ranges') : path.join(process.resourcesPath, 'ranges')
const range = new RangeOrchestrator(rangeRoot)
const productionUrl = pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href
let dataStore
let licenseManager
let engagementStore
let cleanupStarted = false

function trustedUrl(url) {
  if (isDev) { try { return new URL(url).origin === 'http://localhost:5173' } catch { return false } }
  return String(url || '').split('#')[0] === productionUrl
}

function trustedSender(event) {
  return event.senderFrame === event.sender.mainFrame && trustedUrl(event.senderFrame?.url)
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
ipcMain.handle('range:chaos-status', rangeHandler(() => range.chaosStatus()))
ipcMain.handle('range:chaos-start', rangeHandler(input => range.startChaos(input)))
ipcMain.handle('range:chaos-abort', rangeHandler(() => range.abortChaos()))
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
ipcMain.handle('license:snapshot', rangeHandler(() => licenseManager.snapshot()))
ipcMain.handle('license:activate', rangeHandler(input => licenseManager.activate({ ...input, instanceName: input?.instanceName || os.hostname() })))
ipcMain.handle('license:validate', rangeHandler(() => licenseManager.validate({ force: true })))
ipcMain.handle('license:deactivate', rangeHandler(() => licenseManager.deactivate()))
ipcMain.handle('license:checkout', rangeHandler(async () => {
  const url = licenseManager.snapshot().checkoutUrl
  if (!url || !url.startsWith('https://')) throw new Error('Checkout URL is not configured')
  await shell.openExternal(url)
  return { opened: true }
}))
ipcMain.handle('fieldops:snapshot', rangeHandler(() => engagementStore.snapshot()))
ipcMain.handle('fieldops:create', rangeHandler(input => engagementStore.create(input)))
ipcMain.handle('fieldops:run', rangeHandler(input => engagementStore.run(input)))
ipcMain.handle('fieldops:chaos-start', rangeHandler(input => engagementStore.startChaos(input)))
ipcMain.handle('fieldops:chaos-abort', rangeHandler(id => engagementStore.abortChaos(id)))
ipcMain.handle('fieldops:close', rangeHandler(id => engagementStore.close(id)))
ipcMain.handle('fieldops:export', rangeHandler(async id => {
  const snapshot = engagementStore.snapshot()
  const engagement = snapshot.engagements.find(item => item.id === id)
  if (!engagement) throw new Error('Engagement not found')
  const bundle = { schemaVersion: 2, exportedAt: new Date().toISOString(), auditIntegrity: snapshot.auditIntegrity, engagement, chaosRuns: snapshot.chaosRuns.filter(item => item.engagementId === id), audit: snapshot.audit.filter(item => item.engagementId === id) }
  const result = await dialog.showSaveDialog({ title: 'Export FieldOps evidence ledger', defaultPath: `daemoncore-fieldops-${engagement.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.json`, filters: [{ name: 'JSON evidence bundle', extensions: ['json'] }] })
  if (result.canceled || !result.filePath) return { canceled: true }
  await writeFile(result.filePath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8')
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
  win.webContents.on('will-navigate', (event, url) => { if (!trustedUrl(url)) event.preventDefault() })

  if (isDev) win.loadURL('http://localhost:5173')
  else win.loadURL(productionUrl)
}

app.whenReady().then(async () => {
  dataStore = new DataStore(app.getPath('userData'))
  await dataStore.initialize()
  licenseManager = new LicenseManager(app.getPath('userData'), { safeStorage })
  await licenseManager.initialize()
  engagementStore = new EngagementStore(app.getPath('userData'), { entitlement: () => licenseManager.snapshot() })
  await engagementStore.initialize()
  licenseManager.validate().catch(() => {})
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
