const { mkdir, readFile, rename, writeFile, copyFile } = require('fs/promises')
const { randomUUID } = require('crypto')
const path = require('path')
const missionOS = require('../shared/mission-os.json')

const cleanState = () => ({
  schemaVersion: 6,
  profile: {
    handle: null,
    xp: 0,
    level: 1,
    streak: 0,
    bestStreak: 0,
    lastActiveDate: null,
    weeklyMinutes: 0,
    weeklyGoalMinutes: 180,
    weekKey: null,
    completedMissions: [],
    completedLessons: [],
    completedWebLabs: [],
    completedEnterpriseLabs: [],
    lessonAttempts: [],
    missionAttempts: [],
    webLabAttempts: [],
    enterpriseLabAttempts: [],
    drillAttempts: [],
    capstoneAttempts: [],
    achievements: [],
    activity: [],
    createdAt: null,
    missionOS: { assessment: null, selectedPathway: null, selectedAt: null },
  },
  settings: { reduceMotion: false, compactMode: false, uiScale: 1.25, academyGuideComplete: false },
})

const dateKey = date => date.toISOString().slice(0, 10)
const weekKey = date => {
  const copy = new Date(date)
  const day = (copy.getUTCDay() + 6) % 7
  copy.setUTCDate(copy.getUTCDate() - day)
  return dateKey(copy)
}
const dayDifference = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
const clone = value => JSON.parse(JSON.stringify(value))

class DataStore {
  constructor(directory) {
    this.directory = directory
    this.file = path.join(directory, 'daemoncore-state.json')
    this.backup = path.join(directory, 'daemoncore-state.backup.json')
    this.state = cleanState()
    this.writeQueue = Promise.resolve()
  }

  async initialize() {
    await mkdir(this.directory, { recursive: true })
    try {
      this.state = this.normalize(JSON.parse(await readFile(this.file, 'utf8')))
    } catch {
      try {
        this.state = this.normalize(JSON.parse(await readFile(this.backup, 'utf8')))
      } catch {
        this.state = cleanState()
      }
      await this.persist()
    }
    return this.snapshot()
  }

  normalize(input) {
    const base = cleanState()
    if (!input || typeof input !== 'object') return base
    return {
      ...base,
      schemaVersion: 6,
      profile: { ...base.profile, ...(input.profile || {}), missionOS: { ...base.profile.missionOS, ...(input.profile?.missionOS || {}) } },
      settings: { ...base.settings, ...(input.settings || {}) },
    }
  }

  snapshot() {
    return clone(this.state)
  }

  async onboard(handle) {
    const normalized = String(handle || '').trim().toUpperCase()
    if (!/^[A-Z0-9_-]{2,20}$/.test(normalized)) throw new Error('Handle must be 2–20 letters, numbers, underscores, or dashes')
    if (this.state.profile.handle) throw new Error('Operator profile already exists')
    this.state.profile.handle = normalized
    this.state.profile.createdAt = new Date().toISOString()
    this.addActivity('profile', 'Operator record initialized', 0)
    await this.persist()
    return this.snapshot()
  }

  touchActivity() {
    const now = new Date()
    const today = dateKey(now)
    const profile = this.state.profile
    const currentWeek = weekKey(now)
    if (profile.weekKey !== currentWeek) {
      profile.weekKey = currentWeek
      profile.weeklyMinutes = 0
    }
    if (profile.lastActiveDate === today) return
    const gap = profile.lastActiveDate ? dayDifference(profile.lastActiveDate, today) : null
    profile.streak = gap === 1 ? profile.streak + 1 : 1
    profile.bestStreak = Math.max(profile.bestStreak, profile.streak)
    profile.lastActiveDate = today
    if (profile.streak >= 14) this.unlock('night-operator')
  }

  unlock(id) {
    if (!this.state.profile.achievements.includes(id)) this.state.profile.achievements.push(id)
  }

  addActivity(type, title, xp, detail = '') {
    this.state.profile.activity.unshift({ id: randomUUID(), type, title, detail, xp, at: new Date().toISOString() })
    this.state.profile.activity = this.state.profile.activity.slice(0, 100)
  }

  addXp(amount) {
    this.state.profile.xp += Math.max(0, Math.round(amount))
    this.state.profile.level = Math.floor(this.state.profile.xp / 1000) + 1
  }

  async record(event) {
    if (!this.state.profile.handle) throw new Error('Complete onboarding first')
    if (!event || !['mission', 'lesson', 'webLab', 'enterpriseLab', 'drill', 'capstone'].includes(event.type)) throw new Error('Unknown progress event')
    this.touchActivity()
    if (event.type === 'mission') this.recordMission(event)
    if (event.type === 'lesson') this.recordLesson(event)
    if (event.type === 'webLab') this.recordWebLab(event)
    if (event.type === 'enterpriseLab') this.recordEnterpriseLab(event)
    if (event.type === 'drill') this.recordDrill(event)
    if (event.type === 'capstone') this.recordCapstone(event)
    await this.persist()
    return this.snapshot()
  }

  recordMission(event) {
    if (!/^[a-z0-9-]{2,40}$/.test(event.id || '')) throw new Error('Invalid mission id')
    const score = Math.max(0, Math.min(5000, Number(event.score) || 0))
    const first = !this.state.profile.completedMissions.includes(event.id)
    const earned = first ? score : Math.round(score * 0.2)
    if (first) this.state.profile.completedMissions.push(event.id)
    const receiptDigest = /^[a-f0-9]{64}$/.test(event.receiptDigest || '') ? event.receiptDigest : null
    const packDigest = /^[a-f0-9]{64}$/.test(event.packDigest || '') ? event.packDigest : null
    const receiptId = /^[a-f0-9-]{36}$/.test(event.receiptId || '') ? event.receiptId : null
    const mode = ['guided', 'assisted', 'blind', 'professional'].includes(event.mode) ? event.mode : 'legacy'
    const seed = /^[A-F0-9]{12}$/.test(event.seed || '') ? event.seed : null
    const evidenceDigest = /^[a-f0-9]{64}$/.test(event.evidenceDigest || '') ? event.evidenceDigest : null
    const debrief = event.debrief && typeof event.debrief === 'object' ? clone(event.debrief) : null
    const caseVariant = event.caseVariant && typeof event.caseVariant === 'object' ? clone(event.caseVariant) : null
    this.state.profile.missionAttempts.unshift({ id: randomUUID(), missionId: event.id, score, hints: Number(event.hints) || 0, seconds: Number(event.seconds) || 0, mode, seed, evidenceDigest, receiptDigest, packDigest, receiptId, debrief, caseVariant, at: new Date().toISOString() })
    this.state.profile.missionAttempts = this.state.profile.missionAttempts.slice(0, 100)
    this.addXp(earned)
    this.unlock('first-signal')
    if ((Number(event.hints) || 0) === 0) this.unlock('evidence-led')
    if (this.state.profile.completedMissions.length >= 7) this.unlock('range-veteran')
    this.addActivity('mission', event.title || event.id, earned, `${score} operation score // ${mode} mode`)
  }

  recordLesson(event) {
    if (!/^[a-z0-9-]{2,80}$/.test(event.id || '')) throw new Error('Invalid lesson id')
    const first = !this.state.profile.completedLessons.includes(event.id)
    const practicalScore = Math.max(0, Math.min(100, Math.round(Number(event.practicalScore) || 0)))
    if (first) {
      this.state.profile.completedLessons.push(event.id)
      this.addXp(180)
      this.state.profile.weeklyMinutes += Math.max(1, Math.min(120, Number(event.minutes) || 15))
    }
    this.state.profile.lessonAttempts.unshift({ id: randomUUID(), lessonId: event.id, practicalScore, passed: practicalScore >= 67, at: new Date().toISOString() })
    this.state.profile.lessonAttempts = this.state.profile.lessonAttempts.slice(0, 100)
    this.unlock('scholar')
    this.addActivity('lesson', event.title || event.id, first ? 180 : 0, `${practicalScore}% practical // ${first ? 'knowledge validated' : 'lesson reviewed'}`)
  }

  recordWebLab(event) {
    if (!/^[a-z0-9-]{2,80}$/.test(event.id || '')) throw new Error('Invalid Web Forge lab id')
    const score = Math.max(0, Math.min(2000, Math.round(Number(event.score) || 0)))
    const first = !this.state.profile.completedWebLabs.includes(event.id)
    const earned = first ? score : Math.round(score * 0.2)
    if (first) {
      this.state.profile.completedWebLabs.push(event.id)
      this.state.profile.weeklyMinutes += Math.max(1, Math.min(120, Number(event.minutes) || 30))
    }
    this.state.profile.webLabAttempts.unshift({ id: randomUUID(), labId: event.id, score, hints: Math.max(0, Number(event.hints) || 0), seconds: Math.max(0, Number(event.seconds) || 0), at: new Date().toISOString() })
    this.state.profile.webLabAttempts = this.state.profile.webLabAttempts.slice(0, 100)
    this.addXp(earned)
    if (this.state.profile.completedWebLabs.length >= 22) this.unlock('web-forged')
    this.addActivity('webLab', event.title || event.id, earned, `${score} live range score // evidence accepted`)
  }

  recordEnterpriseLab(event) {
    if (!/^[a-z]+-[0-9]{2}$/.test(event.id || '')) throw new Error('Invalid Enterprise Forge case id')
    const score = Math.max(0, Math.min(2000, Math.round(Number(event.score) || 0)))
    const first = !this.state.profile.completedEnterpriseLabs.includes(event.id)
    const earned = first ? score : Math.round(score * 0.2)
    if (first) {
      this.state.profile.completedEnterpriseLabs.push(event.id)
      this.state.profile.weeklyMinutes += Math.max(1, Math.min(120, Number(event.minutes) || 40))
    }
    this.state.profile.enterpriseLabAttempts.unshift({ id: randomUUID(), labId: event.id, score, hints: Math.max(0, Number(event.hints) || 0), seconds: Math.max(0, Number(event.seconds) || 0), at: new Date().toISOString() })
    this.state.profile.enterpriseLabAttempts = this.state.profile.enterpriseLabAttempts.slice(0, 150)
    this.addXp(earned)
    if (this.state.profile.completedEnterpriseLabs.length >= 48) this.unlock('enterprise-forged')
    this.addActivity('enterpriseLab', event.title || event.id, earned, `${score} enterprise case score // evidence accepted`)
  }

  recordDrill(event) {
    const correct = Math.max(0, Number(event.correct) || 0)
    const total = Math.max(1, Number(event.total) || 1)
    const earned = Math.min(correct, total) * 120
    this.state.profile.drillAttempts.unshift({ id: randomUUID(), drillId: event.id || 'daily-gauntlet', correct, total, xp: earned, at: new Date().toISOString() })
    this.state.profile.drillAttempts = this.state.profile.drillAttempts.slice(0, 100)
    this.addXp(earned)
    if (correct === total) this.unlock('clean-sweep')
    this.addActivity('drill', event.title || 'Daily gauntlet', earned, `${correct}/${total} correct`)
  }

  recordCapstone(event) {
    if (!/^[a-z0-9-]{2,40}$/.test(event.id || '')) throw new Error('Invalid capstone id')
    const score = Math.max(0, Math.min(100, Math.round(Number(event.score) || 0)))
    const passed = score >= 80
    const domainScores = Object.fromEntries(Object.entries(event.domainScores || {}).filter(([id, value]) => /^[a-z-]{2,30}$/.test(id) && Number.isFinite(Number(value))).map(([id, value]) => [id, Math.max(0, Math.min(100, Math.round(Number(value))))]))
    const decisions = Array.isArray(event.decisions) ? event.decisions.slice(0, 12).map(value => Math.max(0, Math.min(8, Math.round(Number(value) || 0)))) : []
    this.state.profile.capstoneAttempts.unshift({ id: randomUUID(), capstoneId: event.id, score, passed, domainScores, decisions, at: new Date().toISOString() })
    this.state.profile.capstoneAttempts = this.state.profile.capstoneAttempts.slice(0, 100)
    const earned = passed ? 750 : 0
    this.addXp(earned)
    if (passed) this.unlock('decision-forged')
    this.addActivity('capstone', event.title || event.id, earned, `${score}% verified mastery // ${passed ? 'standard met' : 'remediation assigned'}`)
  }

  async updateSettings(next) {
    this.state.settings = {
      reduceMotion: Boolean(next?.reduceMotion),
      compactMode: Boolean(next?.compactMode),
      uiScale: Math.max(1, Math.min(1.4, Number(next?.uiScale) || 1.25)),
      academyGuideComplete: Boolean(next?.academyGuideComplete),
    }
    await this.persist()
    return this.snapshot()
  }

  async updateMissionOS(input) {
    if (!this.state.profile.handle) throw new Error('Complete onboarding first')
    if (!input || typeof input !== 'object') throw new Error('Mission OS update is required')
    if (input.action === 'assessment') {
      const answers = input.answers || {}
      const scores = Object.fromEntries(missionOS.domains.map(domain => [domain.id, { correct: 0, total: 0, score: 0 }]))
      for (const question of missionOS.questions) {
        const answer = answers[question.id]
        if (!Number.isInteger(answer) || answer < 0 || answer >= question.options.length) throw new Error(`Assessment answer missing or invalid: ${question.id}`)
        scores[question.domain].total += 1
        if (answer === question.answer) scores[question.domain].correct += 1
      }
      for (const result of Object.values(scores)) result.score = Math.round(result.correct / result.total * 100)
      const overall = Math.round(Object.values(scores).reduce((sum, result) => sum + result.score, 0) / missionOS.domains.length)
      const ranked = missionOS.pathways.map(pathway => {
        const entries = Object.entries(pathway.weights)
        const weight = entries.reduce((sum, [, value]) => sum + value, 0)
        const fit = Math.round(entries.reduce((sum, [domain, value]) => sum + scores[domain].score * value, 0) / weight)
        return { id: pathway.id, fit }
      }).sort((a, b) => b.fit - a.fit || a.id.localeCompare(b.id))
      this.state.profile.missionOS.assessment = { completedAt: new Date().toISOString(), overall, scores, answers: { ...answers }, recommendedPathway: ranked[0].id }
      this.addActivity('assessment', 'Mission OS diagnostic completed', 0, `${overall}% baseline // ${ranked[0].id}`)
    } else if (input.action === 'select-pathway') {
      if (!missionOS.pathways.some(pathway => pathway.id === input.pathwayId)) throw new Error('Unknown Mission OS pathway')
      this.state.profile.missionOS.selectedPathway = input.pathwayId
      this.state.profile.missionOS.selectedAt = new Date().toISOString()
      const pathway = missionOS.pathways.find(item => item.id === input.pathwayId)
      this.addActivity('pathway', `${pathway.label} pathway selected`, 0)
    } else if (input.action === 'reset-assessment') {
      this.state.profile.missionOS.assessment = null
    } else {
      throw new Error('Unknown Mission OS action')
    }
    await this.persist()
    return this.snapshot()
  }

  async reset() {
    this.state = cleanState()
    await this.persist()
    return this.snapshot()
  }

  persist() {
    const serialized = `${JSON.stringify(this.state, null, 2)}\n`
    this.writeQueue = this.writeQueue.then(async () => {
      const temporary = `${this.file}.tmp`
      try { await copyFile(this.file, this.backup) } catch {}
      await writeFile(temporary, serialized, 'utf8')
      await rename(temporary, this.file)
    })
    return this.writeQueue
  }
}

module.exports = { DataStore, cleanState }
