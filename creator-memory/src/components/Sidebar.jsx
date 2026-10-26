import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/memory', label: 'Memory', icon: 'M12 2v8l6 3M12 2v8l-6 3M12 22V10' },
  { to: '/new-project', label: 'New Project', icon: 'M12 5v14M5 12h14' },
  { to: '/in-editor', label: 'In Editor', icon: 'M3 6h18M3 12h18M3 18h12' },
  { to: '/settings', label: 'Settings', icon: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1' },
]

function Icon({ path }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="shrink-0"
    >
      <path d={path} />
    </svg>
  )
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <button
        aria-label="Toggle navigation"
        onClick={() => setMobileOpen((open) => !open)}
        className="fixed top-3 left-3 z-50 md:hidden rounded-md border border-border-md bg-bg2 p-2 text-fg"
      >
        ☰
      </button>
      <nav
        aria-label="Main"
        className={
          mobileOpen
            ? 'fixed inset-0 z-40 w-full flex flex-col bg-bg1 border-r border-border-subtle p-4'
            : 'fixed inset-y-0 left-0 z-40 w-16 md:w-60 flex flex-col bg-bg1 border-r border-border-subtle p-4'
        }
      >
        <div className="text-accent font-semibold text-lg mb-8">
          <span className="hidden md:inline">Creator Memory</span>
          <span className="md:hidden">CM</span>
        </div>
        <ul className="flex flex-col gap-1">
          {LINKS.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                    isActive ? 'bg-accent-dim text-accent' : 'text-fg2'
                  }`
                }
              >
                <Icon path={link.icon} />
                <span className="hidden md:inline truncate">{link.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-center gap-2 pt-4 border-t border-border-subtle">
          <div className="w-8 h-8 rounded-full bg-bg3 flex items-center justify-center text-xs text-fg">
            CM
          </div>
          <span className="hidden md:inline text-sm text-fg2">Creator</span>
        </div>
      </nav>
    </>
  )
}
