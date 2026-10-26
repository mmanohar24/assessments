import { useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './components/Sidebar'
import Header from './components/Header'

const TITLES = {
  '/memory': 'Memory',
  '/new-project': 'New Project',
  '/in-editor': 'In Editor',
  '/settings': 'Settings',
}

function Placeholder({ label }) {
  return <h1>{label}</h1>
}

export default function App() {
  const location = useLocation()
  const [helpOpen, setHelpOpen] = useState(false)
  const title = TITLES[location.pathname] ?? 'Creator Memory'

  return (
    <div className="min-h-screen bg-bg text-fg">
      <Sidebar />
      <div className="md:pl-60 pl-16">
        <Header title={title} onHelpClick={() => setHelpOpen(true)} />
        <main className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
            >
              <Routes location={location}>
                <Route path="/" element={<Navigate to="/memory" replace />} />
                <Route path="/memory" element={<Placeholder label="Memory" />} />
                <Route path="/new-project" element={<Placeholder label="New Project" />} />
                <Route path="/in-editor" element={<Placeholder label="In Editor" />} />
                <Route path="/settings" element={<Placeholder label="Settings" />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {helpOpen && <div data-testid="help-drawer-placeholder" />}
    </div>
  )
}
