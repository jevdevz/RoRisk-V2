import { useEffect, useState } from 'react'

const asset = (name) => `/assets/home/${name}`

function ChatSidebar({ collapsed, onToggle }) {
  const [message, setMessage] = useState('')
  const [rain, setRain] = useState(null)
  const [onlineCount, setOnlineCount] = useState(0)
  const [serverOffset, setServerOffset] = useState(0)
  const [clock, setClock] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let disposed = false
    let socket
    let reconnectTimer
    let reconnectDelay = 750
    const storedSessionId = window.sessionStorage.getItem('rorisk_chat_session')
    const sessionId = storedSessionId || crypto.randomUUID()
    window.sessionStorage.setItem('rorisk_chat_session', sessionId)

    const connect = () => {
      if (disposed) return
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      socket = new WebSocket(`${protocol}//${window.location.host}/api/realtime`)
      socket.addEventListener('open', () => {
        reconnectDelay = 750
        socket.send(JSON.stringify({ type: 'hello', room: 'en', sessionId }))
      })
      socket.addEventListener('message', (event) => {
        let payload
        try { payload = JSON.parse(event.data) } catch { return }
        if (payload.type === 'presence' && payload.counts) setOnlineCount(Number(payload.counts.en) || 0)
        if (payload.type === 'rain') {
          setRain(payload.rain || null)
          if (Number.isFinite(payload.serverTime)) setServerOffset(payload.serverTime - Date.now())
        }
        if ((payload.type === 'rainJoined' || payload.type === 'rainTipped') && payload.rain) setRain(payload.rain)
        if (payload.type === 'battleUpdate' && payload.game) {
          window.dispatchEvent(new CustomEvent('rorisk:battle-update', { detail: { game: payload.game } }))
        }
      })
      socket.addEventListener('close', () => {
        if (disposed) return
        reconnectTimer = window.setTimeout(connect, reconnectDelay)
        reconnectDelay = Math.min(10000, reconnectDelay * 1.75)
      })
    }

    connect()
    return () => {
      disposed = true
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [])

  const synchronizedNow = clock + serverOffset
  const startsAt = rain?.startsAt ? new Date(rain.startsAt).getTime() : 0
  const endsAt = rain?.endsAt ? new Date(rain.endsAt).getTime() : 0
  const timerSeconds = rain
    ? Math.max(0, synchronizedNow >= startsAt
      ? Math.ceil((endsAt - synchronizedNow) / 1000)
      : Math.floor((startsAt - synchronizedNow) / 1000))
    : 0
  const timerMinutes = String(Math.floor(timerSeconds / 60)).padStart(2, '0')
  const timerRemainder = String(timerSeconds % 60).padStart(2, '0')
  const rainAmount = Number(rain?.amount) || 200

  const send = (event) => {
    event.preventDefault()
    setMessage('')
  }

  return (
    <aside className={`chat-sidebar${collapsed ? ' is-collapsed' : ''}`}>
      <div className="rain-pool">
        <img className="rain-pool-art" src={asset('rain-background.png')} alt="" />
        <div className="rain-meta">
          <div><img src={asset('rain.svg')} alt="" /><span>Rain Pool</span></div>
          <div className="rain-time"><img src={asset('clock.svg')} alt="" /><span>{timerMinutes}</span><img className="time-colon" src={asset('colon.svg')} alt=":" /><span>{timerRemainder}</span></div>
        </div>
        <div className="rain-balance">
          <span className="usd-icon"><img src={asset('usd.svg')} alt="" /></span>
          <strong>{rainAmount.toLocaleString()}</strong>
          <button className="app-button rain-add" type="button" aria-label="Add funds"><img src={asset('plus.svg')} alt="" /></button>
        </div>
      </div>

      <div className="chat-feed">
        <article className="system-message">
          <img src={asset('system-avatar.png')} alt="" />
          <div><strong>System Message</strong><p>Chat has been locked by an administrator.</p></div>
        </article>
      </div>

      <form className="chat-compose" onSubmit={send}>
        <input className="chat-input" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a message..." aria-label="Chat message" />
        <button className="app-button chat-send" type="submit">Send</button>
      </form>

      <div className="chat-footer">
        <a href="#chat-rules"><img src={asset('chat-rules.svg')} alt="" />Chat Rules</a>
        <span className="online-count"><i />{onlineCount}</span>
      </div>

      <button className="app-button chat-collapse" type="button" onClick={onToggle} aria-label={collapsed ? 'Show chat' : 'Hide chat'}>
        <img src={asset('chat-collapse.svg')} alt="" />
      </button>
    </aside>
  )
}

export default ChatSidebar
