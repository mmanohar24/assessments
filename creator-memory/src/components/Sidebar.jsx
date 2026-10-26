import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/memory', label: 'Memory' },
  { to: '/new-project', label: 'New Project' },
  { to: '/in-editor', label: 'In Editor' },
  { to: '/settings', label: 'Settings' },
]

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
                  `block rounded-md px-3 py-2 text-sm ${
                    isActive ? 'bg-accent-dim text-accent' : 'text-fg2'
                  }`
                }
              >
                <span className="truncate">{link.label}</span>
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
