const { mkdir, readFile, rename, writeFile, copyFile } = require('fs/promises')
const { randomUUID } = require('crypto')
const path = require('path')

const cleanState = () => ({
  schemaVersion: 1,
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
    lessonAttempts: [],
    missionAttempts: [],
    drillAttempts: [],
    achievements: [],
    activity: [],
    createdAt: null,
  },
  settings: { reduceMotion: false, compactMode: false },
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
      schemaVersion: 1,
      profile: { ...base.profile, ...(input.profile || {}) },
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
    if (!event || !['mission', 'lesson', 'drill'].includes(event.type)) throw new Error('Unknown progress event')
    this.touchActivity()
    if (event.type === 'mission') this.recordMission(event)
    if (event.type === 'lesson') this.recordLesson(event)
    if (event.type === 'drill') this.recordDrill(event)
    await this.persist()
    return this.snapshot()
  }

  recordMission(event) {
    if (!/^[a-z0-9-]{2,40}$/.test(event.id || '')) throw new Error('Invalid mission id')
    const score = Math.max(0, Math.min(5000, Number(event.score) || 0))
    const first = !this.state.profile.completedMissions.includes(event.id)
    const earned = first ? score : Math.round(score * 0.2)
    if (first) this.state.profile.completedMissions.push(event.id)
    this.state.profile.missionAttempts.unshift({ id: randomUUID(), missionId: event.id, score, hints: Number(event.hints) || 0, seconds: Number(event.seconds) || 0, at: new Date().toISOString() })
    this.state.profile.missionAttempts = this.state.profile.missionAttempts.slice(0, 100)
    this.addXp(earned)
    this.unlock('first-signal')
    if ((Number(event.hints) || 0) === 0) this.unlock('evidence-led')
    if (this.state.profile.completedMissions.length >= 3) this.unlock('range-veteran')
    this.addActivity('mission', event.title || event.id, earned, `${score} operation score`)
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

  async updateSettings(next) {
    this.state.settings = {
      reduceMotion: Boolean(next?.reduceMotion),
      compactMode: Boolean(next?.compactMode),
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
