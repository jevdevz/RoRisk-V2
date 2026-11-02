const asset = (name) => `/assets/home/${name}`

const gamemodes = [
  { label: 'Battles', icon: 'sidebar-battles.svg', href: '/battles' },
  { label: 'Blackjack', icon: 'sidebar-blackjack.svg', href: '/blackjack' },
  { label: 'Slide', icon: 'slide', href: '/x-roulette' },
  { label: 'Mines', icon: 'sidebar-mines.svg', mask: 'sidebar-mines-mask.svg', href: '/mines' },
  { label: 'Coinflip', icon: 'sidebar-coinflip.svg', mask: 'sidebar-coinflip-mask.svg', href: '/coinflip' },
  { label: 'Limbo', icon: 'sidebar-limbo.svg', mask: 'sidebar-limbo-mask.svg', href: '/dice' },
  { label: 'Cases', icon: 'sidebar-cases.svg', href: '/cases' },
  { label: 'Slots', icon: 'sidebar-slots.svg', href: '/slots' },
]

const features = [
  { label: 'Rewards', icon: 'sidebar-rewards.svg', monochrome: true, href: '/rewards' },
  { label: 'Affiliates', icon: 'sidebar-affiliates.svg', href: '/affiliates' },
]

function SidebarIcon({ item }) {
  if (item.icon === 'slide') {
    return <svg viewBox="0 0 250 250" aria-hidden="true"><path d="M125 43.893c-14.631 0-28.149 3.658-40.554 10.973S62.182 72.042 54.867 84.446C47.551 96.851 43.893 110.369 43.893 125s3.658 28.148 10.974 40.553c7.315 12.405 17.175 22.266 29.579 29.581 12.405 7.315 25.923 10.972 40.554 10.972s28.149-3.657 40.554-10.972c12.403-7.315 22.264-17.176 29.579-29.581 7.315-12.405 10.974-25.922 10.974-40.553s-3.659-28.149-10.974-40.554c-7.315-12.404-17.176-22.264-29.579-29.58C153.149 47.551 139.631 43.893 125 43.893Zm55.343 88.741H149.81c-1.273 3.817-3.5 7.315-6.68 10.495-3.181 3.182-6.68 5.408-10.496 6.68v30.534h-15.268v-30.534c-3.816-1.272-7.315-3.498-10.496-6.68-3.18-3.18-5.407-6.678-6.679-10.495H69.657v-15.268h30.534c1.272-3.816 3.499-7.315 6.679-10.496 3.181-3.18 6.68-5.407 10.496-6.679V69.657h15.268v30.534c3.816 1.272 7.315 3.499 10.496 6.679 3.18 3.181 5.407 6.68 6.68 10.496h30.533v15.268ZM125 113.55c-3.181 0-5.884 1.113-8.111 3.339-2.226 2.227-3.339 4.93-3.339 8.111s1.113 5.885 3.339 8.11c2.227 2.227 4.93 3.341 8.111 3.341s5.884-1.114 8.111-3.341c2.227-2.225 3.339-4.929 3.339-8.11s-1.112-5.884-3.339-8.111c-2.227-2.226-4.93-3.339-8.111-3.339Zm96.374 19.084c-1.909 20.992-9.86 39.44-23.855 55.344l20.993 20.038C238.231 186.387 248.728 161.26 250 132.634h-28.626ZM28.626 117.366c1.908-20.992 9.86-39.44 23.855-55.343L31.489 41.985C11.768 63.613 1.272 88.74 0 117.366h28.626Zm168.893-55.343c13.995 15.903 21.946 34.351 23.855 55.343H250c-1.272-28.626-11.769-53.753-31.488-75.381l-20.993 20.038ZM52.481 187.978c-13.995-15.904-21.947-34.352-23.855-55.344H0c1.272 28.626 11.768 53.753 31.489 75.382l20.992-20.038Zm80.153-159.352c20.991 1.908 39.439 9.86 55.343 23.855l20.038-20.993C186.386 11.768 161.26 1.272 132.634 0v28.626Zm55.343 168.893c-15.904 13.995-34.352 21.947-55.343 23.855V250c28.626-1.272 53.752-11.768 75.381-31.489l-20.038-20.992ZM62.023 52.481c15.903-13.995 34.351-21.947 55.343-23.855V0C88.74 1.272 63.613 11.768 41.985 31.489l20.038 20.992Zm55.343 168.893c-20.992-1.909-39.44-9.86-55.343-23.855l-20.038 20.992C63.613 238.232 88.74 248.728 117.366 250v-28.626Z" fill="currentColor" /></svg>
  }
  if (item.monochrome) {
    return <span className="sidebar-monochrome-icon" style={{ maskImage: `url(${asset(item.icon)})`, WebkitMaskImage: `url(${asset(item.icon)})` }} />
  }
  if (!item.mask) return <img src={asset(item.icon)} alt="" />
  return (
    <span className="masked-icon" style={{ maskImage: `url(${asset(item.mask)})`, WebkitMaskImage: `url(${asset(item.mask)})` }}>
      <img src={asset(item.icon)} alt="" />
    </span>
  )
}

function SidebarGroup({ title, items, pathname }) {
  return (
    <div className="sidebar-group">
      <p className="sidebar-heading">{title}</p>
      <nav aria-label={title}>
        {items.map((item) => {
          const active = pathname === item.href || (['/battles', '/cases', '/slots'].includes(item.href) && pathname.startsWith(`${item.href}/`))
          return (
          <a className={`sidebar-link${item.label === 'Rewards' ? ' is-rewards' : ''}${active ? ' is-active' : ''}`} href={item.href} aria-current={active ? 'page' : undefined} key={item.label}>
            <span className="sidebar-icon"><SidebarIcon item={item} /></span>
            <span>{item.label}</span>
          </a>
          )
        })}
      </nav>
    </div>
  )
}

function Sidebar({ collapsed, onToggle, pathname }) {
  return (
    <aside className={`left-sidebar${collapsed ? ' is-collapsed' : ''}`}>
      <div className="left-sidebar-scroll">
        <SidebarGroup title="Gamemodes" items={gamemodes} pathname={pathname} />
        <SidebarGroup title="Features" items={features} pathname={pathname} />
      </div>
      <button className="app-button sidebar-collapse" type="button" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        <img src={asset('sidebar-collapse.svg')} alt="" />
      </button>
    </aside>
  )
}

export default Sidebar
