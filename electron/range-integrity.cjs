const { createHash } = require('crypto')
const { lstat, readFile, readdir } = require('fs/promises')
const path = require('path')

async function collectFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true })
  const files = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(current, entry.name)
    const stat = await lstat(absolute)
    if (stat.isSymbolicLink()) throw new Error(`Range packs cannot contain symbolic links: ${entry.name}`)
    if (entry.isDirectory()) files.push(...await collectFiles(root, absolute))
    else if (entry.isFile()) files.push({ absolute, path: path.relative(root, absolute).replaceAll('\\', '/') })
  }
  return files
}

async function fingerprintPack(root) {
  const files = []
  for (const file of await collectFiles(root)) {
    const bytes = await readFile(file.absolute)
    files.push({ path: file.path, bytes: bytes.length, digest: createHash('sha256').update(bytes).digest('hex') })
  }
  const digest = createHash('sha256').update(JSON.stringify(files)).digest('hex')
  return { digest, files, fileCount: files.length, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0) }
}

function sealReceipt(payload) {
  const receipt = { ...payload }
  receipt.digest = createHash('sha256').update(JSON.stringify(receipt)).digest('hex')
  return receipt
}

function verifyReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object' || typeof receipt.digest !== 'string') return false
  const { digest, ...payload } = receipt
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex') === digest
}

module.exports = { fingerprintPack, sealReceipt, verifyReceipt }
