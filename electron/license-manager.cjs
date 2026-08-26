const { mkdir, readFile, rename, unlink, writeFile } = require('fs/promises')
const { createHmac, timingSafeEqual } = require('crypto')
const path = require('path')

const LICENSE_API = 'https://api.lemonsqueezy.com/v1/licenses'
const cleanMeta = () => ({
  schemaVersion: 1,
  instanceId: null,
  instanceName: null,
  maskedKey: null,
  status: 'unlicensed',
  tier: null,
  tierLabel: null,
  productId: null,
  productName: null,
  variantId: null,
  variantName: null,
  customerEmail: null,
  expiresAt: null,
  validatedAt: null,
  graceUntil: null,
  error: null,
})

const clone = value => JSON.parse(JSON.stringify(value))
const normalizeId = value => Number(value || 0)
const maskEmail = email => {
  const [name, domain] = String(email || '').split('@')
  if (!name || !domain) return null
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(2, name.length - 2))}@${domain}`
}

class LicenseManager {
  constructor(directory, options = {}) {
    this.directory = directory
    this.metaFile = path.join(directory, 'license-meta.json')
    this.secretFile = path.join(directory, 'license-key.bin')
    this.policy = options.policy || require('./license-policy.json')
    this.safeStorage = options.safeStorage
    this.fetch = options.fetch || global.fetch
    this.now = options.now || (() => new Date())
    this.meta = cleanMeta()
    this.licenseKey = null
    this.operation = Promise.resolve()
  }

  configured() {
    return normalizeId(this.policy.storeId) > 0 && this.policy.tiers.some(tier => tier.productIds.length || tier.variantIds.length)
  }

  async initialize() {
    await mkdir(this.directory, { recursive: true })
    let stored = null
    try { stored = JSON.parse(await readFile(this.metaFile, 'utf8')); this.meta = { ...cleanMeta(), ...(stored.meta || stored) } } catch {}
    try {
      const encrypted = await readFile(this.secretFile)
      if (!this.safeStorage?.isEncryptionAvailable()) throw new Error('Secure Windows storage is unavailable')
      const protectedValue = this.safeStorage.decryptString(encrypted)
      const secret = protectedValue.startsWith('{') ? JSON.parse(protectedValue) : { licenseKey: protectedValue, instanceId: this.meta.instanceId }
      this.licenseKey = secret.licenseKey
      if (stored?.meta && (!this.validIntegrity(stored.integrity, stored.meta) || secret.instanceId !== this.meta.instanceId)) {
        this.meta = { ...cleanMeta(), instanceId: secret.instanceId, maskedKey: `••••-${this.licenseKey.slice(-8)}`, status: 'tampered', error: 'The cached entitlement failed its integrity check. Connect to validate again.' }
      }
    } catch {
      if (this.meta.instanceId) this.meta = { ...this.meta, status: 'locked', error: 'The protected license key could not be opened on this Windows account.' }
    }
    return this.snapshot()
  }

  integrity(meta) { return createHmac('sha256', this.licenseKey).update(JSON.stringify(meta)).digest('hex') }
  validIntegrity(actual, meta) {
    if (!actual || !this.licenseKey) return false
    const expected = this.integrity(meta)
    try { return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex')) } catch { return false }
  }

  snapshot() {
    const now = this.now()
    const graceRemainingDays = this.meta.graceUntil
      ? Math.max(0, Math.ceil((Date.parse(this.meta.graceUntil) - now.getTime()) / 86_400_000))
      : 0
    return {
      configured: this.configured(),
      requireAcademyLicense: Boolean(this.policy.requireAcademyLicense),
      checkoutUrl: this.policy.checkoutUrl || null,
      licensed: ['active', 'grace'].includes(this.meta.status),
      fieldOps: ['active', 'grace'].includes(this.meta.status) && this.meta.tier === 'fieldops',
      graceRemainingDays,
      ...clone(this.meta),
    }
  }

  async request(action, fields) {
    const response = await this.fetch(`${LICENSE_API}/${action}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields),
      signal: AbortSignal.timeout(12_000),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || `License service returned ${response.status}`)
    return body
  }

  resolveTier(meta) {
    const productId = normalizeId(meta?.product_id)
    const variantId = normalizeId(meta?.variant_id)
    const variant = this.policy.tiers.find(tier => tier.variantIds.map(normalizeId).includes(variantId))
    if (variant) return variant
    const products = this.policy.tiers.filter(tier => tier.productIds.map(normalizeId).includes(productId))
    return products.length === 1 ? products[0] : null
  }

  verifyProduct(meta) {
    if (!this.configured()) throw new Error('Lemon Squeezy product IDs have not been configured for this build')
    if (normalizeId(meta?.store_id) !== normalizeId(this.policy.storeId)) throw new Error('This key belongs to a different store')
    const tier = this.resolveTier(meta)
    if (!tier) throw new Error('This key does not unlock a DaemonCore product')
    return tier
  }

  async activate({ licenseKey, email, instanceName }) {
    return this.serialize(async () => {
      const key = String(licenseKey || '').trim()
      const label = String(instanceName || '').trim().slice(0, 80)
      const customerEmail = String(email || '').trim().toLowerCase()
      if (key.length < 8) throw new Error('Enter the license key from your Lemon Squeezy receipt')
      if (label.length < 2) throw new Error('Give this installation a device name')
      if (!this.safeStorage?.isEncryptionAvailable()) throw new Error('Secure Windows credential storage is unavailable')
      const result = await this.request('activate', { license_key: key, instance_name: label })
      if (!result.activated || result.license_key?.status !== 'active' || !result.instance?.id) throw new Error(result.error || 'License activation was rejected')
      const tier = this.verifyProduct(result.meta)
      const purchaseEmail = String(result.meta?.customer_email || '').trim().toLowerCase()
      if (customerEmail && purchaseEmail && customerEmail !== purchaseEmail) {
        await this.request('deactivate', { license_key: key, instance_id: result.instance.id }).catch(() => {})
        throw new Error('The checkout email does not match this license')
      }
      const now = this.now()
      this.licenseKey = key
      this.meta = this.metaFromResult(result, tier, now, label, key)
      await writeFile(this.secretFile, this.safeStorage.encryptString(JSON.stringify({ licenseKey: key, instanceId: result.instance.id })))
      await this.persist()
      return this.snapshot()
    })
  }

  metaFromResult(result, tier, now, instanceName, key) {
    const graceUntil = new Date(now.getTime() + Number(this.policy.offlineGraceDays || 14) * 86_400_000)
    return {
      schemaVersion: 1,
      instanceId: result.instance?.id || this.meta.instanceId,
      instanceName: result.instance?.name || instanceName || this.meta.instanceName,
      maskedKey: `••••-${key.slice(-8)}`,
      status: 'active',
      tier: tier.id,
      tierLabel: tier.label,
      productId: normalizeId(result.meta?.product_id),
      productName: result.meta?.product_name || null,
      variantId: normalizeId(result.meta?.variant_id),
      variantName: result.meta?.variant_name || null,
      customerEmail: maskEmail(result.meta?.customer_email),
      expiresAt: result.license_key?.expires_at || null,
      validatedAt: now.toISOString(),
      graceUntil: graceUntil.toISOString(),
      error: null,
    }
  }

  async validate({ force = false } = {}) {
    return this.serialize(async () => {
      if (!this.licenseKey || !this.meta.instanceId) return this.snapshot()
      const now = this.now()
      if (!force && this.meta.validatedAt && now.getTime() - Date.parse(this.meta.validatedAt) < 86_400_000) return this.snapshot()
      try {
        const result = await this.request('validate', { license_key: this.licenseKey, instance_id: this.meta.instanceId })
        const tier = this.verifyProduct(result.meta)
        if (!result.valid || result.license_key?.status !== 'active' || !result.instance) {
          this.meta = { ...this.meta, status: result.license_key?.status || 'invalid', error: result.error || 'The license instance is no longer valid' }
        } else {
          this.meta = this.metaFromResult(result, tier, now, this.meta.instanceName, this.licenseKey)
        }
      } catch (error) {
        const inGrace = this.meta.graceUntil && now.getTime() <= Date.parse(this.meta.graceUntil)
        this.meta = { ...this.meta, status: inGrace ? 'grace' : 'offline-expired', error: inGrace ? 'License service unavailable. Offline grace is active.' : error.message }
      }
      await this.persist()
      return this.snapshot()
    })
  }

  async deactivate() {
    return this.serialize(async () => {
      if (this.licenseKey && this.meta.instanceId) {
        const result = await this.request('deactivate', { license_key: this.licenseKey, instance_id: this.meta.instanceId })
        if (!result.deactivated) throw new Error(result.error || 'Device deactivation failed')
      }
      this.licenseKey = null
      this.meta = cleanMeta()
      await Promise.all([unlink(this.secretFile).catch(() => {}), unlink(this.metaFile).catch(() => {})])
      return this.snapshot()
    })
  }

  serialize(operation) {
    const next = this.operation.then(operation, operation)
    this.operation = next.catch(() => {})
    return next
  }

  async persist() {
    const temporary = `${this.metaFile}.tmp`
    const payload = { schemaVersion: 1, meta: this.meta, integrity: this.licenseKey ? this.integrity(this.meta) : null }
    await writeFile(temporary, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
    await rename(temporary, this.metaFile)
  }
}

module.exports = { LicenseManager, cleanMeta }
