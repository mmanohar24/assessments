import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Overview', end: true },
  { to: '/tables', label: 'Tables', end: false },
  { to: '/orders', label: 'Orders', end: false },
]

function navClassName({ isActive }) {
  return [
    'rounded-md border-l-2 px-3 py-2.5 text-sm transition-colors',
    isActive
      ? 'border-ink bg-stone-200/80 font-semibold text-ink'
      : 'border-transparent font-medium text-ink-muted hover:bg-stone-100 hover:text-ink',
  ].join(' ')
}

function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-sidebar px-4 lg:hidden">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">
            Explorex
          </p>
          <h1 className="truncate text-base font-semibold tracking-tight text-ink">
            Spice Garden
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-ink"
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
        >
          <span className="sr-only">Menu</span>
          <span aria-hidden className="flex flex-col gap-1.5">
            <span className="block h-0.5 w-5 bg-ink" />
            <span className="block h-0.5 w-5 bg-ink" />
            <span className="block h-0.5 w-5 bg-ink" />
          </span>
        </button>
      </header>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col border-r border-border bg-sidebar transition-transform duration-200 lg:z-20 lg:w-56 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
        aria-label="Sidebar"
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
              Explorex
            </p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight text-ink">
              Spice Garden
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="text-sm text-ink-muted hover:text-ink lg:hidden"
            aria-label="Close navigation menu"
          >
            Close
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Main">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={navClassName}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border px-5 py-4">
          <p className="text-xs text-ink-muted">Restaurant Command Center</p>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
