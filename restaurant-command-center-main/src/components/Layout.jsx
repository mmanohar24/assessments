import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

function Layout() {
  return (
    <div className="min-h-full bg-surface text-ink">
      <Sidebar />
      <main className="min-h-full pt-14 lg:ml-56 lg:pt-0">
        <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout
