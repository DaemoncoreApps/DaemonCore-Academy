import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const manifest=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'))
const installer=await readFile(new URL('../build/installer.nsh',import.meta.url),'utf8')
const main=await readFile(new URL('../electron/main.cjs',import.meta.url),'utf8')

assert.equal(manifest.build.appId,'academy.daemoncore.desktop')
assert.match(manifest.scripts['package:win'],/electron-builder --win nsis --publish never/)
assert.equal(manifest.build.win.artifactName,'DaemonCore-Academy-Setup.${ext}')
assert.equal(manifest.build.nsis.oneClick,false)
assert.equal(manifest.build.nsis.allowToChangeInstallationDirectory,false)
assert.equal(manifest.build.nsis.deleteAppDataOnUninstall,false)
assert.equal(manifest.build.nsis.uninstallDisplayName,'DaemonCore Academy')
assert.equal(manifest.build.nsis.include,'build/installer.nsh')
assert.match(installer,/hasPerMachineInstallation/)
assert.match(installer,/hasPerUserInstallation/)
assert.match(installer,/uninstall the previous version/)
assert.match(installer,/license data will be kept/)
assert.match(main,/app\.setPath\('userData', path\.join\(app\.getPath\('appData'\), 'daemoncore-academy'\)\)/)

console.log('Installer verified // stable identity, single path, upgrade confirmation, and retained app data')
