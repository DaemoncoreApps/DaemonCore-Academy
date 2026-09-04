const EXECUTION_PROFILES = Object.freeze({
  guarded: Object.freeze({
    id: 'guarded',
    label: 'Guarded',
    description: 'Focused validation with conservative workstation limits.',
    maxTargets: 100,
    maxPorts: 128,
    portConcurrency: 4,
    diagnosticCooldownMs: 750,
    nmapTimeoutMs: 360_000,
  }),
  professional: Object.freeze({
    id: 'professional',
    label: 'Professional',
    description: 'Expanded signed scope for experienced assessment teams.',
    // Professional capacity is defined by the signed engagement itself.
    // There is no product-wide target/port cardinality ceiling; workstation
    // safety controls remain explicit and are signed into the permit.
    maxTargets: null,
    maxPorts: null,
    portConcurrency: 16,
    diagnosticCooldownMs: 250,
    nmapTimeoutMs: 900_000,
    maxPortConcurrency: 64,
    maxNmapTimeoutMs: 3_600_000,
  }),
})

function executionPolicy(profile = 'guarded') {
  const normalized = String(profile || 'guarded').trim().toLowerCase()
  const policy = EXECUTION_PROFILES[normalized]
  if (!policy) throw new Error('Choose a supported execution profile')
  return policy
}

function publicExecutionProfiles() {
  return Object.values(EXECUTION_PROFILES).map(policy => ({ ...policy }))
}

module.exports = { EXECUTION_PROFILES, executionPolicy, publicExecutionProfiles }
