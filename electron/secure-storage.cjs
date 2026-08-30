const linuxBackends = new Set(['gnome_libsecret', 'kwallet', 'kwallet5', 'kwallet6'])

function selectedBackend(safeStorage, platform = process.platform) {
  try {
    if (typeof safeStorage?.getSelectedStorageBackend === 'function') return safeStorage.getSelectedStorageBackend()
  } catch {}
  return platform === 'win32' ? 'dpapi' : platform === 'darwin' ? 'keychain' : 'unknown'
}

function inspectSecureStorage(safeStorage, platform = process.platform) {
  let encryptionAvailable = false
  try { encryptionAvailable = Boolean(safeStorage?.isEncryptionAvailable()) } catch {}
  const backend = selectedBackend(safeStorage, platform)
  const secureBackend = platform !== 'linux' || linuxBackends.has(backend)
  const available = encryptionAvailable && secureBackend
  let reason = null
  if (!encryptionAvailable) reason = platform === 'linux'
    ? 'No desktop keyring is available. Unlock GNOME Keyring or KWallet and reopen DaemonCore.'
    : 'Protected credential storage is unavailable for this operating-system account.'
  else if (!secureBackend) reason = 'Linux credential storage fell back to basic text. Install and unlock GNOME Keyring or KWallet before activating FieldOps.'
  return { available, platform, backend, reason }
}

function requireSecureStorage(safeStorage, platform = process.platform) {
  const status = inspectSecureStorage(safeStorage, platform)
  if (!status.available) throw new Error(status.reason)
  return status
}

module.exports = { inspectSecureStorage, linuxBackends, requireSecureStorage, selectedBackend }
