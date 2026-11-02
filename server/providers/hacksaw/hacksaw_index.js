import { randomUUID } from 'node:crypto'
import {
  betCost,
  consumeLaunchToken,
  createDemoSession,
  endDemoSession,
  getDemoSession,
  hacksawConfig,
  requestFingerprint,
  withSessionQueue,
} from './functions.js'

function providerMessage() {
  return {
    statusCode: 0,
    statusMessage: '',
    accountBalance: null,
    statusData: null,
    dialog: null,
    customData: null,
    serverTime: new Date().toISOString(),
  }
}

function providerError(code = 'INTERNAL_ERROR') {
  return { error: code }
}

function insufficientBalance(balance, currency) {
  return {
    statusCode: 5,
    statusMessage: 'Insufficient Funds',
    accountBalance: {
      currencyCode: currency,
      balance: String(Math.max(0, Math.trunc(Number(balance) || 0))),
      realBalance: null,
      bonusBalance: null,
    },
    statusData: null,
    dialog: null,
    customData: null,
    serverTime: new Date().toISOString(),
  }
}

function cors(request, response, config) {
  response.setHeader('Access-Control-Allow-Origin', new URL(config.staticBaseUrl).origin)
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', String(request.headers['access-control-request-headers'] || 'Content-Type,Accept'))
  response.setHeader('Vary', 'Origin')
}

async function providerFetch(config, path, options = {}) {
  const response = await fetch(`${config.rgsBaseUrl}/api${path}`, {
    ...options,
    signal: AbortSignal.timeout(15000),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      ...options.headers,
    },
  })
  const text = await response.text()
  let data
  try { data = text ? JSON.parse(text) : {} } catch { data = null }
  return { response, text, data }
}

async function profile(api, env, userUuid) {
  const query = new URLSearchParams({
    uuid: `eq.${userUuid}`,
    select: 'uuid,roblox_id,username,avatar_headshot,email,coins,rocoins,rank,level,joined_at',
    limit: '1',
  })
  const rows = await api.supabaseRequest(env, `/rest/v1/rorisk_users?${query}`)
  return rows?.[0] || null
}

async function realSession(api, env, sessionId) {
  const query = new URLSearchParams({
    session_id: `eq.${sessionId}`,
    ended: 'eq.false',
    expires_at: `gt.${new Date().toISOString()}`,
    select: '*',
    limit: '1',
  })
  const rows = await api.supabaseRequest(env, `/rest/v1/rorisk_hacksaw_sessions?${query}`)
  return rows?.[0] || null
}

async function endRealSession(api, env, sessionId) {
  const query = new URLSearchParams({ session_id: `eq.${sessionId}`, ended: 'eq.false' })
  await api.supabaseRequest(env, `/rest/v1/rorisk_hacksaw_sessions?${query}`, {
    method: 'PATCH',
    body: JSON.stringify({ ended: true, updated_at: new Date().toISOString() }),
  })
}

async function authenticate({ request, response, env, api, config }) {
  const body = await api.readJson(request)
  const launch = consumeLaunchToken(body.token)
  if (!launch || String(body.gameId || '') !== launch.gameId) {
    api.sendJson(response, 200, providerError('UNAUTHORIZED'))
    return true
  }

  const upstream = await providerFetch(config, '/play/authenticate', {
    method: 'POST',
    body: JSON.stringify({
      seq: 1,
      partner: config.partner,
      gameId: launch.gameId,
      gameVersion: body.gameVersion,
      currency: 'USD',
      languageCode: 'en',
      mode: 2,
      branding: 'default',
      channel: 1,
      userAgent: request.headers['user-agent'],
      token: 'demo',
    }),
  })
  const data = upstream.data
  if (!data?.sessionUuid || !data?.accountBalance) {
    api.sendJson(response, 200, providerError('INTERNAL_ERROR'))
    return true
  }

  const providerBalance = Number(data.accountBalance.balance)
  if (!Number.isSafeInteger(providerBalance) || providerBalance < 0) {
    api.sendJson(response, 200, providerError('INTERNAL_ERROR'))
    return true
  }

  const sessionId = randomUUID()
  if (launch.demo) {
    createDemoSession({
      sessionId,
      providerSessionId: data.sessionUuid,
      providerBalance,
      defaultBalance: providerBalance,
      bonusGames: data.bonusGames || [],
      gameCode: launch.gameCode,
      gameId: launch.gameId,
    })
  } else {
    const user = await profile(api, env, launch.userUuid)
    if (!user) {
      api.sendJson(response, 200, providerError('UNAUTHORIZED'))
      return true
    }

    await api.supabaseRequest(env, '/rest/v1/rorisk_hacksaw_sessions', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        session_id: sessionId,
        provider_session_id: data.sessionUuid,
        user_uuid: user.uuid,
        game_code: launch.gameCode,
        provider_game_id: launch.gameId,
        bonus_games: data.bonusGames || [],
        provider_default_balance: providerBalance,
        provider_balance: providerBalance,
      }),
    })
    data.name = user.username
    data.accountBalance.balance = String(user.rocoins)
  }

  data.sessionUuid = sessionId
  data.accountBalance.currencyCode = config.externalCurrency
  if (Array.isArray(data.betLevels)) data.betLevels = data.betLevels.filter((level) => Number(level) <= config.maximumBetLevel)
  api.sendJson(response, 200, data)
  return true
}

async function placeBet({ request, response, env, api, config }) {
  const originalBody = await api.readJson(request)
  const sessionId = String(originalBody.sessionUuid || '')
  if (!sessionId) {
    api.sendJson(response, 200, providerError('INVALID_SESSION'))
    return true
  }

  return withSessionQueue(sessionId, async () => {
    const demo = getDemoSession(sessionId)
    const session = demo || await realSession(api, env, sessionId)
    if (!session) {
      api.sendJson(response, 200, providerError('INVALID_SESSION'))
      return true
    }

    const bonusGames = demo ? session.bonusGames : session.bonus_games
    const cost = betCost(originalBody.bets, bonusGames)
    let user
    if (!demo) {
      user = await profile(api, env, session.user_uuid)
      if (!user) {
        api.sendJson(response, 200, providerError('INVALID_SESSION'))
        return true
      }
      if (cost > Number(user.rocoins)) {
        api.sendJson(response, 200, insufficientBalance(user.rocoins, config.externalCurrency))
        return true
      }
    }

    const providerSessionId = demo ? session.providerSessionId : session.provider_session_id
    const providerBody = { ...originalBody, sessionUuid: providerSessionId }
    let upstream
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        upstream = await providerFetch(config, '/play/bet', { method: 'POST', body: JSON.stringify(providerBody) })
      } catch {
        upstream = null
      }
      if (upstream?.data?.round) break
      if (upstream?.data && Number(upstream.data.statusCode) !== 21) break
    }

    const data = upstream?.data
    if (!data?.round || !data.accountBalance) {
      if (demo) endDemoSession(sessionId)
      else await endRealSession(api, env, sessionId)
      api.sendJson(response, 200, data || providerError('INTERNAL_ERROR'))
      return true
    }

    const oldProviderBalance = Number(demo ? session.providerBalance : session.provider_balance)
    const newProviderBalance = Number(data.accountBalance.balance)
    if (!Number.isSafeInteger(oldProviderBalance) || !Number.isSafeInteger(newProviderBalance) || newProviderBalance < 0) {
      if (demo) endDemoSession(sessionId)
      else await endRealSession(api, env, sessionId)
      api.sendJson(response, 200, providerError('INTERNAL_ERROR'))
      return true
    }

    if (demo) {
      session.providerBalance = newProviderBalance
    } else {
      const result = await api.supabaseRequest(env, '/rest/v1/rpc/settle_rorisk_hacksaw_event', {
        method: 'POST',
        body: JSON.stringify({
          p_session_id: sessionId,
          p_request_key: requestFingerprint(sessionId, originalBody),
          p_expected_provider_balance: oldProviderBalance,
          p_new_provider_balance: newProviderBalance,
          p_provider_round_id: String(data.round.roundId || originalBody.roundId || ''),
          p_bet_amount: cost,
          p_request_payload: originalBody,
          p_response_payload: data,
        }),
      })
      user = result?.user
      if (!user) throw new Error('The Hacksaw wager could not be settled.')
      data.accountBalance.balance = String(user.rocoins)
      api.startRealtimeSession(request, response, env, user)
    }

    data.accountBalance.currencyCode = config.externalCurrency
    api.sendJson(response, 200, data)
    return true
  })
}

async function proxyRequest({ request, response, url, api, config, providerPath }) {
  const rawBody = ['GET', 'HEAD'].includes(request.method) ? null : await api.readRawBody(request)
  const upstream = await fetch(`${config.rgsBaseUrl}/api${providerPath}${url.search}`, {
    method: request.method,
    signal: AbortSignal.timeout(15000),
    headers: {
      Accept: String(request.headers.accept || '*/*'),
      ...(rawBody ? { 'Content-Type': String(request.headers['content-type'] || 'application/json') } : {}),
    },
    ...(rawBody ? { body: rawBody } : {}),
  })
  response.statusCode = upstream.status
  response.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
  response.setHeader('Cache-Control', 'no-store')
  response.end(Buffer.from(await upstream.arrayBuffer()))
  return true
}

export async function handleHacksawRgsRequest(context) {
  const { request, response, url, env, api } = context
  const config = hacksawConfig(env)
  cors(request, response, config)
  if (request.method === 'OPTIONS') {
    response.statusCode = 204
    response.end()
    return true
  }

  const providerPath = url.pathname.slice('/api/slots/hacksaw'.length) || '/'
  if (request.method === 'POST' && providerPath === '/play/authenticate') return authenticate({ ...context, config })
  if (request.method === 'POST' && providerPath === '/play/bet') return placeBet({ ...context, config })
  if (request.method === 'POST' && (providerPath === '/history' || providerPath.startsWith('/history/'))) {
    api.sendJson(response, 200, { statusCode: '0', statusMessage: '', data: [], wins: [] })
    return true
  }
  if (request.method === 'POST' && providerPath === '/play/keepAlive') {
    api.sendJson(response, 200, providerMessage())
    return true
  }
  if (request.method === 'POST' && providerPath === '/gameError') {
    api.sendJson(response, 200, providerMessage())
    return true
  }
  return proxyRequest({ ...context, config, providerPath })
}
