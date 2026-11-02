import { useRef, useState } from 'react'
import ChatSidebar from '../components/ChatSidebar.jsx'
import Header from '../components/Header.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import Sidebar from '../components/Sidebar.jsx'
import Battles from './Battles.jsx'
import Cases from './Cases.jsx'
import Slots from './Slots.jsx'

const asset = (name) => `/assets/home/${name}`

const games = [
  ['Battles', 'game-battles.png', '/battles'],
  ['Slide', 'game-slide.png', '/x-roulette'],
  ['Mines', 'game-mines.png', '/mines'],
  ['Coinflip', 'game-coinflip.png', '/coinflip'],
  ['Limbo', 'game-limbo.png', '/dice'],
  ['Cases', 'game-cases.png', '/cases'],
]

const paymentMethods = [
  ['btc.png', '#ffd194', '255, 209, 148'],
  ['eth.png', '#627dea', '98, 125, 234'],
  ['ltc.png', '#86a2cf', '134, 162, 207'],
  ['sol.png', '#be89ff', '190, 137, 255'],
  ['usdt.png', '#33b38a', '51, 179, 138'],
  ['usdc.png', '#3671b6', '54, 113, 182'],
]

const routeTitles = {
  '/welcome': 'Welcome',
  '/battles': 'Battles',
  '/blackjack': 'Blackjack',
  '/x-roulette': 'Slide',
  '/mines': 'Mines',
  '/coinflip': 'Coinflip',
  '/dice': 'Limbo',
  '/cases': 'Cases',
  '/slots': 'Slots',
  '/rewards': 'Rewards',
  '/affiliates': 'Affiliates',
}

function Home({ pathname, user }) {
  const gamesRef = useRef(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth <= 820)
  const [chatCollapsed, setChatCollapsed] = useState(true)

  const toggleSidebar = () => {
    if (sidebarCollapsed) {
      setChatCollapsed(true)
      setSidebarCollapsed(false)
      return
    }
    setSidebarCollapsed(true)
  }

  const toggleChat = () => {
    if (chatCollapsed) {
      setSidebarCollapsed(true)
      setChatCollapsed(false)
      return
    }
    setChatCollapsed(true)
  }

  const scrollGames = (direction) => {
    gamesRef.current?.scrollBy({ left: direction * 245, behavior: 'smooth' })
  }

  return (
    <div className="home-page" id="top">
      <Header />
      <div className="home-layout">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} pathname={pathname} />

        <main className="home-main">
          {pathname === '/battles' || pathname.startsWith('/battles/') ? (
            <Battles pathname={pathname} user={user} />
          ) : pathname === '/cases' || pathname.startsWith('/cases/') ? (
            <Cases pathname={pathname} user={user} />
          ) : pathname === '/slots' || pathname.startsWith('/slots/') ? (
            <Slots pathname={pathname} />
          ) : pathname === '/' ? (
            <div className="home-content">
            <section className="promo-grid" aria-label="Promotions">
              <a href="/welcome"><img src={asset('banner-live.png')} alt="RoRisk is now live — get started now" /></a>
              <a href="/rewards"><img src={asset('banner-rewards.png')} alt="Claim your free rewards today" /></a>
            </section>

            <section className="popular-section" id="games">
              <SectionHeading
                icon={asset('popular.svg')}
                actions={(
                  <>
                    <button className="app-button carousel-button" type="button" onClick={() => scrollGames(-1)} aria-label="Scroll games left"><img src={asset('arrow-left.svg')} alt="" /></button>
                    <button className="app-button carousel-button" type="button" onClick={() => scrollGames(1)} aria-label="Scroll games right"><img src={asset('arrow-right.svg')} alt="" /></button>
                  </>
                )}
              >Popular Games</SectionHeading>
              <div className="game-carousel" ref={gamesRef}>
                {games.map(([name, image, href]) => (
                  <a className="game-card" href={href} key={name} aria-label={name}>
                    <img src={asset(image)} alt={name} />
                  </a>
                ))}
              </div>
            </section>

            <section className="payments-section">
              <SectionHeading icon={asset('payments.svg')}>Payment Methods</SectionHeading>
              <div className="payment-mask">
                <div className="payment-track">
                  {[...paymentMethods, ...paymentMethods, ...paymentMethods].map(([image, color, rgb], index) => (
                    <div className="payment-card" style={{ '--payment-color': color, '--payment-rgb': rgb }} key={`${image}-${index}`}>
                      <img src={asset(image)} alt="" />
                    </div>
                  ))}
                </div>
              </div>
            </section>
            </div>
          ) : (
            <div className="route-content" key={pathname}>
              <h1>{routeTitles[pathname] || 'MM2Risk'}</h1>
            </div>
          )}
        </main>

        <ChatSidebar collapsed={chatCollapsed} onToggle={toggleChat} />
      </div>
    </div>
  )
}

export default Home
