import { useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import OnboardingOverlay from './components/OnboardingOverlay'
import HelpDrawer from './components/HelpDrawer'
import Memory from './components/tabs/Memory'
import NewProject from './components/tabs/NewProject'
import InEditor from './components/tabs/InEditor'
import Settings from './components/tabs/Settings'

const TITLES = {
  '/memory': 'Memory',
  '/new-project': 'New Project',
  '/in-editor': 'In Editor',
  '/settings': 'Settings',
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
          <AnimatePresence initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
            >
              <Routes location={location}>
                <Route path="/" element={<Navigate to="/memory" replace />} />
                <Route path="/memory" element={<Memory />} />
                <Route path="/new-project" element={<NewProject />} />
                <Route path="/in-editor" element={<InEditor />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <OnboardingOverlay />
      <HelpDrawer isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
