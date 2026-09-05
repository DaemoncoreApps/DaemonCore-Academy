import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { inspectSecureStorage, requireSecureStorage } = require('../electron/secure-storage.cjs')
const { LicenseManager } = require('../electron/license-manager.cjs')
const { TrustAuthority } = require('../electron/trust-authority.cjs')
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const workflow = await readFile(new URL('../.github/workflows/linux-release.yml', import.meta.url), 'utf8')
const preload = await readFile(new URL('../electron/preload.cjs', import.meta.url), 'utf8')

const keyring = {
  isEncryptionAvailable: () => true,
  getSelectedStorageBackend: () => 'gnome_libsecret',
}
const plaintextFallback = {
  isEncryptionAvailable: () => true,
  getSelectedStorageBackend: () => 'basic_text',
}

assert.equal(inspectSecureStorage(keyring, 'linux').available, true)
assert.equal(requireSecureStorage(keyring, 'linux').backend, 'gnome_libsecret')
assert.equal(inspectSecureStorage(plaintextFallback, 'linux').available, false)
assert.throws(() => requireSecureStorage(plaintextFallback, 'linux'), /basic text/)
assert.equal(inspectSecureStorage({ isEncryptionAvailable: () => false }, 'linux').available, false)
assert.equal(inspectSecureStorage({ isEncryptionAvailable: () => true }, 'win32').available, true)

const directory = await mkdtemp(path.join(tmpdir(), 'daemoncore-linux-storage-'))
try {
  const policy = { storeId: 1, requireAcademyLicense: false, offlineGraceDays: 14, checkoutUrl: null, tiers: [{ id: 'fieldops', label: 'FieldOps Pro', productIds: [], variantIds: [1] }] }
  const license = new LicenseManager(directory, { policy, safeStorage: plaintextFallback, platform: 'linux', fetch: async () => { throw new Error('network should not be reached') } })
  await assert.rejects(() => license.activate({ licenseKey: 'license-key', instanceName: 'LINUX-RIG' }), /basic text/)
  const trust = new TrustAuthority(directory, { safeStorage: plaintextFallback, platform: 'linux' })
  await assert.rejects(() => trust.enroll({ fullName: 'Jordan Rivera', organization: 'Example Security', email: 'jordan@example.com', role: 'Operator' }), /basic text/)
} finally {
  await rm(directory, { recursive: true, force: true })
}

assert.equal(manifest.build.linux.executableName, 'daemoncore-academy')
assert.equal(manifest.desktopName, 'daemoncore-academy.desktop')
assert.equal(manifest.build.linux.syncDesktopName, true)
assert.equal(manifest.build.linux.artifactName, 'DaemonCore-Academy-${version}.${ext}')
assert.deepEqual(manifest.build.linux.target, ['AppImage', 'deb'])
assert.match(manifest.scripts['package:linux'], /electron-builder --linux AppImage deb --publish never/)
assert.doesNotMatch(preload, /require\('\.\.\/package\.json'\)/)
assert.match(preload, /sendSync\('app:version'\)/)
assert.match(workflow, /runs-on: ubuntu-latest/)
assert.match(workflow, /npm run package:linux/)
assert.match(workflow, /--appimage-extract/)
assert.match(workflow, /dpkg-deb --info/)
assert.match(workflow, /gh release view "\$RELEASE_TAG"/)
assert.doesNotMatch(workflow, /--prerelease/)

console.log('Linux verified // AppImage, deb, native keyring enforcement, portable version metadata, and stable release CI')
