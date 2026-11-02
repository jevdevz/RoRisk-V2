import RoRiskCasinoGame from '../../../src/Pages/CasinoGame.jsx'
import RoRiskSlots from '../../../src/Pages/Slots.jsx'

function Slots({ pathname }) {
  const gameMatch = pathname.match(/^\/slots\/([^/]+)$/)

  return (
    <div className="mm2risk-rorisk-slots">
      {gameMatch
        ? <RoRiskCasinoGame gameId={decodeURIComponent(gameMatch[1])} />
        : <RoRiskSlots />}
    </div>
  )
}

export default Slots
