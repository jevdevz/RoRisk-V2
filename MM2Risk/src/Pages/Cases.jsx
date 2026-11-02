import RoRiskCaseOpen from '../../../src/Pages/CaseOpen.jsx'
import RoRiskCases from '../../../src/Pages/Cases.jsx'
import riskSpinIcon from '../../../public/assets/images/battles/risk-spin.png?url'

function Cases({ pathname, user }) {
  const caseMatch = pathname.match(/^\/cases\/([a-zA-Z0-9_-]+)$/)

  return (
    <div className="mm2risk-rorisk-cases">
      {caseMatch
        ? <RoRiskCaseOpen caseId={caseMatch[1]} user={user} priceIcon="/assets/currency/coin%201.svg" riskSpinIcon={riskSpinIcon} siteName="MM2Risk" controlsVariant="cspvp" />
        : <RoRiskCases mm2Only priceIcon="/assets/currency/coin%201.svg" />}
    </div>
  )
}

export default Cases
