import { createHash, randomUUID } from 'node:crypto'

const TOKEN_LIFETIME_MS = 2 * 60 * 1000
const SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000
const VERSION_LIFETIME_MS = 10 * 60 * 1000

const launchTokens = new Map()
const demoSessions = new Map()
const gameVersions = new Map()
const providerGameIds = new Map()
const sessionQueues = new Map()

export function hacksawConfig(env) {
  return {
    partner: String(env.HACKSAW_PARTNER || 'stake').trim(),
    rgsBaseUrl: String(env.HACKSAW_RGS_BASE_URL || 'https://rgs-demo.hacksawgaming.com').replace(/\/$/, ''),
    staticBaseUrl: String(env.HACKSAW_STATIC_BASE_URL || 'https://static-live.hacksawgaming.com').replace(/\/$/, ''),
    websiteBaseUrl: String(env.HACKSAW_WEBSITE_BASE_URL || 'https://www.hacksawgaming.com').replace(/\/$/, ''),
    externalCurrency: String(env.HACKSAW_EXTERNAL_CURRENCY || 'BRL').trim().toUpperCase(),
    maximumBetLevel: Math.max(1, Math.trunc(Number(env.HACKSAW_MAX_BET_LEVEL) || 500000)),
  }
}

export async function providerGameId(config, gameCode, gameName) {
  const code = String(gameCode || '').trim()
  if (!/^hs\.[a-zA-Z0-9_-]+$/.test(code)) throw new Error('This Hacksaw game identifier is invalid.')
  const cached = providerGameIds.get(code)
  if (cached) return cached
  const slug = String(gameName || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  if (!slug) throw new Error('This Hacksaw game identifier is invalid.')
  const response = await fetch(`${config.websiteBaseUrl}/games/${encodeURIComponent(slug)}`, {
    redirect: 'follow',
    signal: AbortSignal.timeout(8000),
    headers: { Accept: 'text/html', 'User-Agent': 'RoRisk/2.0 Hacksaw launcher' },
  })
  if (!response.ok) throw new Error('Hacksaw could not resolve this game identifier.')
  const html = await response.text()
  const id = html.match(/data-gameid=["'](\d+)["']/i)?.[1]
  if (!id) throw new Error('Hacksaw could not resolve this game identifier.')
  providerGameIds.set(code, id)
  return id
}

export function createLaunchToken(payload) {
  const token = randomUUID()
  launchTokens.set(token, { ...payload, expiresAt: Date.now() + TOKEN_LIFETIME_MS })
  return token
}

export function consumeLaunchToken(token) {
  const key = String(token || '')
  const value = launchTokens.get(key)
  launchTokens.delete(key)
  if (!value || value.expiresAt <= Date.now()) return null
  return value
}

export function createDemoSession(payload) {
  const sessionId = payload.sessionId || randomUUID()
  const session = { ...payload, sessionId, expiresAt: Date.now() + SESSION_LIFETIME_MS }
  demoSessions.set(sessionId, session)
  return session
}

export function getDemoSession(sessionId) {
  const key = String(sessionId || '')
  const session = demoSessions.get(key)
  if (!session || session.expiresAt <= Date.now()) {
    demoSessions.delete(key)
    return null
  }
  session.expiresAt = Date.now() + SESSION_LIFETIME_MS
  return session
}

export function endDemoSession(sessionId) {
  demoSessions.delete(String(sessionId || ''))
}

export async function gameVersion(config, gameId) {
  const cached = gameVersions.get(gameId)
  if (cached?.expiresAt > Date.now()) return cached.version
  const response = await fetch(`${config.staticBaseUrl}/${encodeURIComponent(gameId)}/version.json?${Date.now()}`, {
    signal: AbortSignal.timeout(8000),
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('Hacksaw could not provide this game version.')
  const data = await response.json()
  const version = String(data?.version || '').trim()
  if (!/^[a-zA-Z0-9_.-]+$/.test(version)) throw new Error('Hacksaw returned an invalid game version.')
  gameVersions.set(gameId, { version, expiresAt: Date.now() + VERSION_LIFETIME_MS })
  return version
}

export function requestFingerprint(sessionId, payload) {
  return createHash('sha256').update(`${sessionId}:${JSON.stringify(payload)}`).digest('hex')
}

export function betCost(bets, bonusGames) {
  if (bets == null) return 0
  if (!Array.isArray(bets) || bets.length > 20) throw new Error('The Hacksaw bet request is invalid.')
  const bonuses = Array.isArray(bonusGames) ? bonusGames : []
  let total = 0
  for (const bet of bets) {
    let amount = Number(bet?.betAmount)
    if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('The Hacksaw bet amount is invalid.')
    if (bet.buyBonus != null) {
      const bonus = bonuses.find((entry) => String(entry.bonusGameId) === String(bet.buyBonus))
      const multiplier = Number(bonus?.betCostMultiplier)
      if (!Number.isFinite(multiplier) || multiplier <= 0) throw new Error('The selected Hacksaw bonus is invalid.')
      amount *= multiplier
    }
    if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('The Hacksaw bet amount is invalid.')
    total += amount
  }
  if (!Number.isSafeInteger(total)) throw new Error('The Hacksaw bet amount is too large.')
  return total
}

export async function withSessionQueue(sessionId, operation) {
  const key = String(sessionId || '')
  const previous = sessionQueues.get(key) || Promise.resolve()
  let release
  const current = new Promise((resolve) => { release = resolve })
  sessionQueues.set(key, current)
  await previous.catch(() => {})
  try {
    return await operation()
  } finally {
    release()
    if (sessionQueues.get(key) === current) sessionQueues.delete(key)
  }
}

export function publicRequestBase(request, env) {
  if (env.HACKSAW_CALLBACK_BASE_URL) return String(env.HACKSAW_CALLBACK_BASE_URL).replace(/\/$/, '')
  const forwardedProtocol = String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim()
  const protocol = forwardedProtocol || (request.socket?.encrypted ? 'https' : 'http')
  const host = String(request.headers['x-forwarded-host'] || request.headers.host || '').split(',')[0].trim()
  if (!host) throw new Error('The public Hacksaw callback URL is not configured.')
  return `${protocol}://${host}`
}

setInterval(() => {
  const now = Date.now()
  for (const [token, value] of launchTokens) if (value.expiresAt <= now) launchTokens.delete(token)
  for (const [sessionId, value] of demoSessions) if (value.expiresAt <= now) demoSessions.delete(sessionId)
  for (const [gameId, value] of gameVersions) if (value.expiresAt <= now) gameVersions.delete(gameId)
}, 60 * 1000).unref?.()
