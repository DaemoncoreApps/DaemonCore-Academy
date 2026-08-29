const { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } = require('electron')
const { writeFile } = require('fs/promises')
const os = require('os')
const path = require('path')
const { pathToFileURL } = require('url')
const { RangeOrchestrator } = require('./range-orchestrator.cjs')
const { verifyReceipt } = require('./range-integrity.cjs')
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

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])

function fieldOpsReport(snapshot, engagement) {
  const findings=snapshot.findings.filter(item=>item.engagementId===engagement.id),captures=snapshot.captures.filter(item=>item.engagementId===engagement.id),campaigns=(snapshot.campaigns||[]).filter(item=>item.engagementId===engagement.id)
  const severityOrder={critical:0,high:1,medium:2,low:3,informational:4},sorted=[...findings].sort((a,b)=>(severityOrder[a.severity]??9)-(severityOrder[b.severity]??9))
  const counts=Object.fromEntries(['critical','high','medium','low','informational'].map(level=>[level,findings.filter(item=>item.severity===level).length]))
  const profileKeys=new Set(),profiles=[]
  for(const item of captures){const key=`${item.target}:${item.port}`;if(item.type==='service-profile'&&!profileKeys.has(key)){profileKeys.add(key);profiles.push(item)}}
  const profileRows=profiles.length?profiles.map(item=>`<tr><td>${escapeHtml(item.target)}</td><td>${escapeHtml(item.port)}</td><td>${escapeHtml(item.result?.identity?.service||'unknown')}</td><td>${escapeHtml(item.result?.identity?.confidence||'unknown')}</td><td>${escapeHtml(item.result?.http?.response?.statusCode||'—')}</td><td>${escapeHtml(item.result?.tls?.protocol||'—')}</td></tr>`).join(''):'<tr><td colspan="6">No service profiles were captured.</td></tr>'
  const campaignRows=campaigns.length?campaigns.map(item=>`<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.profile)}</td><td>${item.targets.length}</td><td>${item.summary?.completed||0} / ${item.summary?.total||item.tasks.length}</td><td>${escapeHtml(item.status)}</td></tr>`).join(''):'<tr><td colspan="5">No assessment campaigns were recorded.</td></tr>'
  const latestSurfaces=engagement.targets.map(target=>captures.find(item=>item.type==='surface'&&item.target===target)).filter(Boolean),driftCount=latestSurfaces.reduce((sum,item)=>sum+(item.result?.comparison?.changeCount||0),0)
  const surfaceRows=latestSurfaces.length?latestSurfaces.map(item=>{const comparison=item.result?.comparison,changes=comparison?.changes||[];return`<article class="surface"><div class="finding-head"><span>${escapeHtml(item.target)}</span><b>${escapeHtml((comparison?.status||'captured').replaceAll('-',' ').toUpperCase())}</b></div><h2>${escapeHtml((item.result?.summary?.openPorts||[]).length?`Observed TCP services: ${item.result.summary.openPorts.join(', ')}`:'No allowed TCP services observed')}</h2><p class="target">Captured ${escapeHtml(new Date(item.at).toLocaleString())} · ${item.result?.web?.length||0} web service(s) profiled</p>${changes.length?`<ul>${changes.map(change=>`<li><b>${escapeHtml(change.severity.toUpperCase())}</b> ${escapeHtml(change.title)}</li>`).join('')}</ul>`:'<p>No material change was detected against the prior sealed surface baseline.</p>'}</article>`}).join(''):'<div class="empty">No complete surface baseline was captured for this engagement.</div>'
  const findingRows=sorted.length?sorted.map((finding,index)=>`<article><div class="finding-head"><span>${String(index+1).padStart(2,'0')} / ${escapeHtml(finding.severity.toUpperCase())}</span><b>${escapeHtml(finding.status.toUpperCase())}</b></div><h2>${escapeHtml(finding.title)}</h2><p class="target">${escapeHtml(finding.target)}</p><h3>Observation</h3><p>${escapeHtml(finding.description)}</p><h3>Impact</h3><p>${escapeHtml(finding.impact||'Impact was not recorded.')}</p><h3>Remediation</h3><p>${escapeHtml(finding.remediation||'Remediation was not recorded.')}</p><footer>${finding.evidenceIds.length} evidence capture(s) · ${finding.retests.length} retest(s) · Updated ${escapeHtml(new Date(finding.updatedAt).toLocaleString())}</footer></article>`).join(''):'<div class="empty">No findings were recorded for this engagement.</div>'
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(engagement.name)} · DaemonCore FieldOps</title><style>body{margin:0;background:#090a0c;color:#dfe1e5;font:15px/1.65 Arial,sans-serif}main{max-width:980px;margin:auto;padding:60px}.brand{color:#ef3e47;font:bold 13px monospace;letter-spacing:3px}.hero{border-bottom:2px solid #ef3e47;padding:30px 0}.hero h1{font-size:42px;margin:8px 0}.hero p,.target,footer{color:#858b94}.meta,.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:24px 0}.meta div,.metrics div,article,.empty{border:1px solid #292d33;background:#101216;padding:18px}.meta span,.metrics span,h3{display:block;color:#737983;font:11px monospace;letter-spacing:1px}.meta b,.metrics b{font-size:20px}.metrics{grid-template-columns:repeat(5,1fr)}table{width:100%;border-collapse:collapse;background:#101216}th,td{padding:11px;border:1px solid #292d33;text-align:left}th{color:#737983;font:11px monospace;letter-spacing:1px}article{margin:18px 0;padding:28px}.finding-head{display:flex;justify-content:space-between;color:#ef5961;font:12px monospace}article h2{margin:10px 0 0}.surface ul{padding-left:20px}.surface li{margin:7px 0}.surface li b{color:#ef5961;font:11px monospace;margin-right:8px}h3{margin:22px 0 5px}footer{border-top:1px solid #292d33;margin-top:25px;padding-top:15px;font:11px monospace}@media print{body{background:white;color:#17191d}main{padding:20px}.meta div,.metrics div,article,.empty,table{background:white;break-inside:avoid}}</style></head><body><main><div class="brand">DAEMONCORE // FIELDOPS</div><section class="hero"><h1>${escapeHtml(engagement.name)}</h1><p>Professional assessment record for ${escapeHtml(engagement.client)}</p></section><section class="meta"><div><span>AUTHORIZATION</span><b>${escapeHtml(engagement.authorizationReference)}</b></div><div><span>TEST WINDOW</span><b>${escapeHtml(new Date(engagement.validFrom).toLocaleDateString())} — ${escapeHtml(new Date(engagement.validUntil).toLocaleDateString())}</b></div><div><span>EVIDENCE INTEGRITY</span><b>${snapshot.auditIntegrity&&snapshot.captureIntegrity?'VERIFIED':'FAILED'}</b></div></section><section class="metrics">${Object.entries(counts).map(([level,count])=>`<div><span>${level.toUpperCase()}</span><b>${count}</b></div>`).join('')}</section><p>${engagement.targets.length} authorized target(s) · ${captures.length} sealed capture(s) · ${findings.length} finding(s)</p><h3>ASSESSMENT CAMPAIGNS // ${campaigns.length} RECORDED</h3><table><thead><tr><th>Campaign</th><th>Profile</th><th>Targets</th><th>Tasks</th><th>Status</th></tr></thead><tbody>${campaignRows}</tbody></table><h3>SERVICE INVENTORY // ${profiles.length} PROFILED ENDPOINT(S)</h3><table><thead><tr><th>Target</th><th>Port</th><th>Service</th><th>Confidence</th><th>HTTP</th><th>TLS</th></tr></thead><tbody>${profileRows}</tbody></table><h3>SURFACE CHANGE INTELLIGENCE // ${driftCount} MATERIAL CHANGE(S)</h3>${surfaceRows}<h3>REVIEWED FINDINGS</h3>${findingRows}</main></body></html>`
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
ipcMain.handle('range:pack-index', rangeHandler(() => range.packIndex()))
ipcMain.handle('range:verify-pack', rangeHandler(id => range.verifyPack(id)))
ipcMain.handle('range:diagnostics', rangeHandler(() => range.diagnostics()))
ipcMain.handle('range:export-receipt', rangeHandler(async () => {
  const receipt = range.receipt()
  if (!verifyReceipt(receipt)) throw new Error('Range receipt integrity verification failed')
  const result = await dialog.showSaveDialog({ title: 'Export range launch receipt', defaultPath: `daemoncore-${receipt.scenario}-${receipt.receiptId}.json`, filters: [{ name: 'JSON range receipt', extensions: ['json'] }] })
  if (result.canceled || !result.filePath) return { canceled: true }
  await writeFile(result.filePath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
  return { canceled: false, filePath: result.filePath, digest: receipt.digest }
}))
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
ipcMain.handle('display:set-zoom', async (event, factor) => {
  if (!trustedSender(event)) throw new Error('Untrusted display request')
  const scale = Math.max(1, Math.min(1.4, Number(factor) || 1.25))
  event.sender.setZoomFactor(scale)
  return scale
})
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
ipcMain.handle('fieldops:campaign-start', rangeHandler(input => engagementStore.startCampaign(input)))
ipcMain.handle('fieldops:campaign-pause', rangeHandler(id => engagementStore.pauseCampaign(id)))
ipcMain.handle('fieldops:campaign-resume', rangeHandler(id => engagementStore.resumeCampaign(id)))
ipcMain.handle('fieldops:campaign-cancel', rangeHandler(id => engagementStore.cancelCampaign(id)))
ipcMain.handle('fieldops:finding-create', rangeHandler(input => engagementStore.createFinding(input)))
ipcMain.handle('fieldops:finding-update', rangeHandler(({ id, input }) => engagementStore.updateFinding(id, input)))
ipcMain.handle('fieldops:finding-retest', rangeHandler(({ id, input }) => engagementStore.retestFinding(id, input)))
ipcMain.handle('fieldops:chaos-start', rangeHandler(input => engagementStore.startChaos(input)))
ipcMain.handle('fieldops:chaos-abort', rangeHandler(id => engagementStore.abortChaos(id)))
ipcMain.handle('fieldops:close', rangeHandler(id => engagementStore.close(id)))
ipcMain.handle('fieldops:export', rangeHandler(async id => {
  const snapshot = engagementStore.snapshot()
  const engagement = snapshot.engagements.find(item => item.id === id)
  if (!engagement) throw new Error('Engagement not found')
  const bundle = { schemaVersion: 5, exportedAt: new Date().toISOString(), auditIntegrity: snapshot.auditIntegrity, captureIntegrity: snapshot.captureIntegrity, engagement, campaigns: snapshot.campaigns.filter(item => item.engagementId === id), captures: snapshot.captures.filter(item => item.engagementId === id), findings: snapshot.findings.filter(item => item.engagementId === id), chaosRuns: snapshot.chaosRuns.filter(item => item.engagementId === id), audit: snapshot.audit.filter(item => item.engagementId === id) }
  const result = await dialog.showSaveDialog({ title: 'Export FieldOps evidence ledger', defaultPath: `daemoncore-fieldops-${engagement.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.json`, filters: [{ name: 'JSON evidence bundle', extensions: ['json'] }] })
  if (result.canceled || !result.filePath) return { canceled: true }
  await writeFile(result.filePath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8')
  return { canceled: false, filePath: result.filePath }
}))
ipcMain.handle('fieldops:report', rangeHandler(async id => {
  const snapshot=engagementStore.snapshot(),engagement=snapshot.engagements.find(item=>item.id===id)
  if(!engagement)throw new Error('Engagement not found')
  const result=await dialog.showSaveDialog({title:'Export FieldOps professional report',defaultPath:`daemoncore-report-${engagement.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}.html`,filters:[{name:'Printable HTML report',extensions:['html']}]})
  if(result.canceled||!result.filePath)return{canceled:true}
  await writeFile(result.filePath,fieldOpsReport(snapshot,engagement),'utf8')
  return{canceled:false,filePath:result.filePath}
}))

function createWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 960,
    minWidth: 1200,
    minHeight: 760,
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
  win.webContents.on('did-finish-load', () => win.webContents.setZoomFactor(dataStore.snapshot().settings.uiScale || 1.25))
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
