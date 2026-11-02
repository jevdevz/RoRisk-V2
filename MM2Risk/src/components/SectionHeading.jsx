function SectionHeading({ icon, children, actions }) {
  return (
    <div className="section-heading">
      <div className="section-heading-title"><img src={icon} alt="" /><h2>{children}</h2></div>
      {actions && <div className="section-heading-actions">{actions}</div>}
    </div>
  )
}

export default SectionHeading
