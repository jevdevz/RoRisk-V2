import RoRiskBattles from '../../../src/Pages/Battles.jsx'
import BattleIcon from '../components/BattleIcons.jsx'
import CaseInfoModal from '../components/CaseInfoModal.jsx'

const renderBattleIcon = (props) => <BattleIcon {...props} />
const renderCaseInfoModal = (props) => <CaseInfoModal {...props} priceIcon="/assets/currency/coin%201.svg" />

function Battles({ pathname, user }) {
  const battleCreate = pathname === '/battles/create'
  const battleMatch = battleCreate ? null : pathname.match(/^\/battles\/([a-zA-Z0-9-]+)$/)

  return (
    <div className="mm2risk-rorisk-battles">
      <RoRiskBattles
        user={user}
        battleId={battleMatch?.[1]}
        battleCreate={battleCreate}
        siteName="MM2Risk"
        priceIcon="/assets/currency/coin%201.svg"
        battleIconRenderer={renderBattleIcon}
        battleRowVariant="cspvp"
        caseType="mm2"
        caseInfoModalRenderer={renderCaseInfoModal}
        showRanks={false}
      />
    </div>
  )
}

export default Battles
