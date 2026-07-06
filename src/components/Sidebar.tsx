type SidebarProps = {
  activePage: string
  onNavigate: (page: string) => void
}

const menuItems = [
  { key: 'monitor', label: 'Monitor Queue' },
  { key: 'prescription', label: 'Prescription Managements' },
  { key: 'process', label: 'Process Tracking' },
  { key: 'inventory', label: 'Machine Inventory' },
]

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">+</div>
        <div>
          <h2>Medical Hub</h2>
          <p>Operations Center</p>
        </div>
      </div>

      <nav className="sidebar__nav">
        {menuItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`sidebar__item ${activePage === item.key ? 'active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
