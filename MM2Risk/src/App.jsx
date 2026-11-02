import { useEffect, useState } from 'react'
import Notifications from '../../src/components/Notifications.jsx'
import Home from './Pages/Home.jsx'

const internalRoutes = new Set([
  '/', '/welcome', '/battles', '/battles/create', '/blackjack', '/x-roulette', '/mines',
  '/coinflip', '/dice', '/cases', '/slots', '/rewards', '/affiliates',
])

function readStoredUser() {
  try {
    const stored = window.localStorage.getItem('rorisk_user')
    return stored ? JSON.parse(stored) : null
  } catch {
    window.localStorage.removeItem('rorisk_user')
    return null
  }
}

function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname)
  const [user, setUser] = useState(readStoredUser)

  useEffect(() => {
    const updatePathname = () => setPathname(window.location.pathname)
    const handleInternalLink = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!anchor || anchor.target || anchor.hasAttribute('download')) return

      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin || (!internalRoutes.has(url.pathname) && !/^\/(?:cases|battles)\/[a-zA-Z0-9_-]+$/.test(url.pathname))) return
      if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash === window.location.hash) return

      event.preventDefault()
      window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`)
      updatePathname()
    }

    window.addEventListener('popstate', updatePathname)
    document.addEventListener('click', handleInternalLink)
    return () => {
      window.removeEventListener('popstate', updatePathname)
      document.removeEventListener('click', handleInternalLink)
    }
  }, [])

  useEffect(() => {
    const updateUser = (event) => {
      const nextUser = event.detail?.user
      if (!nextUser) return
      window.localStorage.setItem('rorisk_user', JSON.stringify(nextUser))
      setUser(nextUser)
    }
    window.addEventListener('rorisk:user-update', updateUser)
    return () => window.removeEventListener('rorisk:user-update', updateUser)
  }, [])

  return <><Home pathname={pathname} user={user} /><Notifications /></>
}

export default App
