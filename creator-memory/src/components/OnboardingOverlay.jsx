import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const STEPS = [
  {
    heading: 'Your editing style, remembered.',
    description:
      'Creator Memory watches how you edit and learns the choices you make over and over. Those choices become reusable preferences instead of repeated manual work.',
    icon: (
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
        <path d="M12 7v5l3 3" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    heading: 'Four views, one workflow.',
    description:
      'Memory shows what the AI has learned, New Project applies it to a fresh edit, In Editor surfaces it live, and Settings controls how it behaves. Each view feeds the same underlying memory.',
    icon: (
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor">
        <rect x="3" y="3" width="8" height="8" strokeWidth="1.5" />
        <rect x="13" y="3" width="8" height="8" strokeWidth="1.5" />
        <rect x="3" y="13" width="8" height="8" strokeWidth="1.5" />
        <rect x="13" y="13" width="8" height="8" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    heading: 'Memory markers guide your edits.',
    description:
      'Gold diamonds on your timeline show exactly where a learned preference applies. Click one to see the reasoning and confidence behind it.',
    icon: (
      <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
        <path d="M12 2 L22 12 L12 22 L2 12 Z" />
      </svg>
    ),
  },
]

export default function OnboardingOverlay() {
  const [visible, setVisible] = useState(() => !localStorage.getItem('cm_onboarded'))
  const [step, setStep] = useState(0)

  if (!visible) return null

  const close = () => {
    localStorage.setItem('cm_onboarded', 'true')
    setVisible(false)
  }

  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-lg bg-bg2 border border-border-md p-6 overflow-hidden">
        <button
          onClick={close}
          className="absolute top-4 right-4 text-sm text-fg2"
        >
          Skip
        </button>
        <AnimatePresence initial={false}>
          <motion.div
            key={step}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center text-center gap-4 pt-6"
          >
            <div className="text-accent">{current.icon}</div>
            <h2 className="text-fg text-lg font-medium">{current.heading}</h2>
            <p className="text-fg2 text-sm">{current.description}</p>
          </motion.div>
        </AnimatePresence>
        <div className="flex justify-between pt-6">
          <button
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="rounded-md border border-border-md px-4 py-2 text-sm text-fg2 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            onClick={() => (isLast ? close() : setStep((s) => s + 1))}
            className="rounded-md bg-accent px-4 py-2 text-sm text-bg"
          >
            {isLast ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
