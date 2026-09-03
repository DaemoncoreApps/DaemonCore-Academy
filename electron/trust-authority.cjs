const { mkdir, readFile, rename, writeFile } = require('fs/promises')
const path = require('path')
const { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, randomUUID, sign, verify } = require('crypto')
const { inspectSecureStorage, requireSecureStorage } = require('./secure-storage.cjs')

const stableStringify = value => JSON.stringify(value, (_key, item) => {
  if (!item || Array.isArray(item) || typeof item !== 'object') return item
  return Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right)))
})
const digest = value => createHash('sha256').update(stableStringify(value)).digest('hex')
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const policyOperations = Object.freeze({
  observe: ['observe'],
  validate: ['observe', 'validate'],
  stress: ['observe', 'validate', 'resilience'],
})

class TrustAuthority {
  constructor(directory, options = {}) {
    this.directory = directory
    this.metaFile = path.join(directory, 'fieldops-operator.json')
    this.keyFile = path.join(directory, 'fieldops-operator-key.bin')
    this.safeStorage = options.safeStorage
    this.platform = options.platform || process.platform
    this.now = options.now || (() => new Date())
    this.identity = null
    this.privateKey = null
    this.status = 'unconfigured'
    this.error = null
  }

  async initialize() {
    await mkdir(this.directory, { recursive: true })
    try {
      const record = JSON.parse(await readFile(this.metaFile, 'utf8'))
      const encrypted = await readFile(this.keyFile)
      requireSecureStorage(this.safeStorage, this.platform)
      const privateKey = createPrivateKey({ key: Buffer.from(this.safeStorage.decryptString(encrypted), 'base64'), format: 'der', type: 'pkcs8' })
      const publicKey = createPublicKey(privateKey).export({ format: 'der', type: 'spki' }).toString('base64')
      if (publicKey !== record.identity?.publicKey || !TrustAuthority.verify(record.credential, record.identity)) throw new Error('Operator credential integrity verification failed')
      this.identity = record.identity
      this.privateKey = privateKey
      this.status = 'device-bound'
      this.error = null
    } catch (error) {
      this.identity = null
      this.privateKey = null
      this.status = error.code === 'ENOENT' ? 'unconfigured' : 'locked'
      this.error = this.status === 'locked' ? error.message : null
    }
    return this.snapshot()
  }

  async enroll(input) {
    const fullName = String(input?.fullName || '').trim().replace(/\s+/g, ' ').slice(0, 100)
    const organization = String(input?.organization || '').trim().replace(/\s+/g, ' ').slice(0, 120)
    const email = String(input?.email || '').trim().toLowerCase().slice(0, 160)
    const role = String(input?.role || '').trim().replace(/\s+/g, ' ').slice(0, 80)
    if (fullName.length < 3 || organization.length < 2 || role.length < 2) throw new Error('Full name, organization, and role are required')
    if (!emailPattern.test(email)) throw new Error('Enter a valid professional email address')
    requireSecureStorage(this.safeStorage, this.platform)
    if (!this.privateKey) {
      const pair = generateKeyPairSync('ed25519')
      this.privateKey = pair.privateKey
    }
    const publicKey = createPublicKey(this.privateKey).export({ format: 'der', type: 'spki' }).toString('base64')
    const fingerprint = digest(publicKey)
    const now = this.now().toISOString()
    this.identity = { id: this.identity?.id || randomUUID(), fullName, organization, email, role, publicKey, fingerprint, createdAt: this.identity?.createdAt || now, updatedAt: now }
    const credential = this.sign('operator-credential', this.identity)
    const temporary = `${this.metaFile}.tmp`
    const temporaryKey = `${this.keyFile}.tmp`
    await writeFile(temporaryKey, this.safeStorage.encryptString(this.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64')))
    await rename(temporaryKey, this.keyFile)
    await writeFile(temporary, `${JSON.stringify({ schemaVersion: 1, identity: this.identity, credential }, null, 2)}\n`, 'utf8')
    await rename(temporary, this.metaFile)
    this.status = 'device-bound'
    this.error = null
    return this.snapshot()
  }

  snapshot() {
    const publicIdentity = this.identity ? (({ publicKey: _publicKey, ...identity }) => identity)(this.identity) : null
    return { configured: Boolean(this.identity && this.privateKey), status: this.status, error: this.error, identity: publicIdentity, credentialStorage: inspectSecureStorage(this.safeStorage, this.platform) }
  }

  assertReady() {
    if (!this.identity || !this.privateKey) throw new Error('Bind a verified operator identity before opening an engagement')
    return this.identity
  }

  sign(kind, payload) {
    const identity = this.assertReady()
    const envelope = {
      version: 1,
      algorithm: 'Ed25519',
      kind,
      signedAt: this.now().toISOString(),
      operator: { id: identity.id, fullName: identity.fullName, organization: identity.organization, role: identity.role, fingerprint: identity.fingerprint, publicKey: identity.publicKey },
      payloadDigest: digest(payload),
    }
    return { ...envelope, signature: sign(null, Buffer.from(stableStringify(envelope)), this.privateKey).toString('base64') }
  }

  issuePermit(input) {
    const policyLevel = String(input.policyLevel || 'validate')
    if (!policyOperations[policyLevel]) throw new Error('Choose a supported signed-operation policy')
    const permit = {
      version: 1,
      id: randomUUID(),
      nonce: randomUUID(),
      engagementId: input.engagementId || input.id,
      client: input.client,
      authorizationReference: input.authorizationReference,
      networkMode: input.networkMode,
      targets: [...input.targets],
      ports: [...input.ports],
      policyLevel,
      executionProfile: input.executionProfile || 'guarded',
      executionCapacity: input.executionCapacity || null,
      allowedOperations: [...policyOperations[policyLevel]],
      approvingAuthority: { name: input.approverName, email: input.approverEmail },
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      issuedAt: this.now().toISOString(),
    }
    return { ...permit, attestation: this.sign('operation-permit', permit) }
  }

  assertPermit(permit, requiredOperation) {
    if (!permit || !TrustAuthority.verify(permit.attestation, TrustAuthority.unsignedPermit(permit))) throw new Error('Signed operation permit integrity verification failed')
    if (!permit.allowedOperations.includes(requiredOperation)) throw new Error(`${requiredOperation} operations are not authorized by this signed permit`)
    const now = this.now().getTime()
    if (now < Date.parse(permit.validFrom) || now > Date.parse(permit.validUntil)) throw new Error('The signed operation permit is outside its validity window')
    return permit
  }

  static unsignedPermit(permit) {
    const { attestation: _attestation, ...unsigned } = permit
    return unsigned
  }

  static verify(attestation, payload) {
    if (!attestation?.signature || attestation.algorithm !== 'Ed25519' || attestation.payloadDigest !== digest(payload)) return false
    const { signature, ...envelope } = attestation
    try {
      const publicKey = createPublicKey({ key: Buffer.from(attestation.operator.publicKey, 'base64'), format: 'der', type: 'spki' })
      return verify(null, Buffer.from(stableStringify(envelope)), publicKey, Buffer.from(signature, 'base64'))
    } catch { return false }
  }
}

module.exports = { TrustAuthority, digest, policyOperations, stableStringify }
