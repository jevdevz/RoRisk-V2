import { handleHacksawRgsRequest } from './hacksaw_index.js'
import { createLaunchToken, gameVersion, hacksawConfig, providerGameId, publicRequestBase } from './functions.js'

async function gameRow(api, env, gameCode) {
  const query = new URLSearchParams({
    game_code: `eq.${gameCode}`,
    active: 'eq.true',
    select: 'uuid,game_code,game_name,provider,provider_code,demo_support',
    limit: '1',
  })
  const rows = await api.supabaseRequest(env, `/rest/v1/rorisk_slots?${query}`)
  return rows?.[0] || null
}

export async function handleHacksawRequest(context) {
  const { request, response, url, env, api } = context
  if (url.pathname.startsWith('/api/slots/hacksaw/')) return handleHacksawRgsRequest(context)

  const launchMatch = url.pathname.match(/^\/api\/casino-games\/([a-zA-Z0-9_.-]+)\/launch$/)
  if (request.method !== 'POST' || !launchMatch) return false

  const gameCode = decodeURIComponent(launchMatch[1])
  const game = await gameRow(api, env, gameCode)
  if (!game) throw new Error('This slot is unavailable.')
  if (String(game.provider_code).toUpperCase() !== 'HACKSAW') return false

  const body = await api.readJson(request)
  const demo = String(body.mode || '').toLowerCase() === 'demo'
  if (demo && game.demo_support !== true) throw new Error('Fun Play is unavailable for this slot.')

  const sessionUser = api.requestSessionUser(request, env)
  if (!demo && !sessionUser?.uuid) throw new Error('Please sign in to play this slot.')

  const config = hacksawConfig(env)
  const gameId = await providerGameId(config, game.game_code, game.game_name)
  const version = await gameVersion(config, gameId)
  const callbackBase = publicRequestBase(request, env)
  const token = createLaunchToken({
    demo,
    gameCode: game.game_code,
    gameId,
    userUuid: demo ? null : sessionUser.uuid,
    username: demo ? 'Guest' : sessionUser.username,
  })

  const params = new URLSearchParams({
    language: 'en',
    channel: 'desktop',
    gameid: gameId,
    mode: '1',
    token,
    lobbyurl: callbackBase,
    currency: config.externalCurrency,
    partner: config.partner,
    env: `${callbackBase}/api/slots/hacksaw`,
  })

  void api.supabaseRequest(env, '/rest/v1/rpc/increment_rorisk_slot_launch', {
    method: 'POST',
    body: JSON.stringify({ p_game_code: game.game_code }),
  }).catch(() => {})

  api.sendJson(response, 200, {
    url: `${config.staticBaseUrl}/${encodeURIComponent(gameId)}/${encodeURIComponent(version)}/index.html?${params}`,
    mode: demo ? 'demo' : 'real',
  })
  return true
}
