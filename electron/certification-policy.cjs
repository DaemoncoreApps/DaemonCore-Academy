const { createHash } = require('crypto')
const { stableStringify, TrustAuthority } = require('./trust-authority.cjs')

const DCCO_POLICY = Object.freeze({
  id: 'DCCO-1',
  title: 'DaemonCore Certified Cyber Operator',
  shortTitle: 'DCCO',
  version: 1,
  passingStandard: 'Evidence from every required domain plus a device-bound candidate identity. Eligibility is admission to review, not a credential.',
  requirements: Object.freeze([
    { id: 'practicals', label: 'Practical instruction', description: 'Distinct lessons completed with an 80% or stronger practical score.', target: 20 },
    { id: 'ranges', label: 'Sealed range operations', description: 'Distinct missions completed in Assisted, Blind, or Professional mode with intact launch, evidence, and completion digests.', target: 5 },
    { id: 'web', label: 'Web Forge cases', description: 'Distinct evidence-driven Web Forge cases completed.', target: 8 },
    { id: 'enterprise', label: 'Enterprise cases', description: 'Distinct Enterprise Forge cases completed.', target: 8 },
    { id: 'drills', label: 'Judgment drills', description: 'Distinct drill sets completed at 80% accuracy or stronger.', target: 4 },
    { id: 'capstones', label: 'Principal capstones', description: 'Distinct capstones passed at the 80% professional standard.', target: 2 },
  ]),
})

const uniqueBest = (items, id, qualifies, score) => {
  const best = new Map()
  for (const item of items || []) {
    if (!qualifies(item)) continue
    const key = item[id]
    if (!key) continue
    if (!best.has(key) || score(item) > score(best.get(key))) best.set(key, item)
  }
  return [...best.values()]
}

function evidenceFor(profile) {
  const digestPattern = /^[a-f0-9]{64}$/
  return {
    practicals: uniqueBest(profile.lessonAttempts, 'lessonId', item => item.passed && item.practicalScore >= 80, item => item.practicalScore),
    ranges: uniqueBest(profile.missionAttempts, 'missionId', item => ['assisted', 'blind', 'professional'].includes(item.mode) && digestPattern.test(item.receiptDigest || '') && digestPattern.test(item.packDigest || '') && digestPattern.test(item.evidenceDigest || ''), item => item.score || 0),
    web: [...new Set(profile.completedWebLabs || [])].map(labId => ({ labId })),
    enterprise: [...new Set(profile.completedEnterpriseLabs || [])].map(labId => ({ labId })),
    drills: uniqueBest(profile.drillAttempts, 'drillId', item => item.total > 0 && item.correct / item.total >= .8, item => item.correct / item.total),
    capstones: uniqueBest(profile.capstoneAttempts, 'capstoneId', item => item.passed && item.score >= 80, item => item.score),
  }
}

function evaluateEligibility(profile = {}) {
  const evidence = evidenceFor(profile)
  const requirements = DCCO_POLICY.requirements.map(requirement => {
    const value = evidence[requirement.id].length
    return { ...requirement, value, complete: value >= requirement.target, percent: Math.min(100, Math.round(value / requirement.target * 100)) }
  })
  const completed = requirements.filter(item => item.complete).length
  return { policy: DCCO_POLICY, eligible: completed === requirements.length, completed, total: requirements.length, percent: Math.round(requirements.reduce((sum, item) => sum + item.percent, 0) / requirements.length), requirements }
}

function createCandidateDossier(profile, identity, appVersion, now = new Date()) {
  if (!identity?.id || !identity?.fullName || !identity?.fingerprint || !identity?.publicKey) throw new Error('Bind a protected candidate identity before exporting a certification dossier')
  const eligibility = evaluateEligibility(profile)
  if (!eligibility.eligible) throw new Error('The DCCO candidate standard is not complete')
  const evidence = evidenceFor(profile)
  const dossier = {
    schemaVersion: 1,
    dossierId: `DCCO-CANDIDATE-${now.getUTCFullYear()}-${String(profile.handle || '').replace(/[^A-Z0-9_-]/gi, '').toUpperCase()}`,
    certification: { id: DCCO_POLICY.id, title: DCCO_POLICY.title, version: DCCO_POLICY.version },
    candidate: { operatorId: identity.id, fullName: identity.fullName, organization: identity.organization, role: identity.role, handle: profile.handle, fingerprint: identity.fingerprint },
    application: { appVersion: String(appVersion || 'unknown'), createdAt: now.toISOString(), reviewRequired: true },
    evidence: {
      practicals: evidence.practicals.map(item => ({ lessonId: item.lessonId, score: item.practicalScore, attemptId: item.id, completedAt: item.at })),
      ranges: evidence.ranges.map(item => ({ missionId: item.missionId, score: item.score, mode: item.mode, attemptId: item.id, receiptId: item.receiptId, receiptDigest: item.receiptDigest, packDigest: item.packDigest, evidenceDigest: item.evidenceDigest, completedAt: item.at })),
      web: evidence.web,
      enterprise: evidence.enterprise,
      drills: evidence.drills.map(item => ({ drillId: item.drillId, correct: item.correct, total: item.total, attemptId: item.id, completedAt: item.at })),
      capstones: evidence.capstones.map(item => ({ capstoneId: item.capstoneId, score: item.score, domainScores: item.domainScores, attemptId: item.id, completedAt: item.at })),
    },
  }
  return { ...dossier, dossierDigest: createHash('sha256').update(stableStringify(dossier)).digest('hex') }
}

function verifyCandidateBundle(bundle) {
  if (!bundle?.dossier || bundle.dossier.schemaVersion !== 1) return false
  const { dossierDigest, ...unsigned } = bundle.dossier
  const expected = createHash('sha256').update(stableStringify(unsigned)).digest('hex')
  return dossierDigest === expected && TrustAuthority.verify(bundle.attestation, bundle.dossier)
}

module.exports = { DCCO_POLICY, createCandidateDossier, evaluateEligibility, verifyCandidateBundle }
