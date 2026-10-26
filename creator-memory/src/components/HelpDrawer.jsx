import { motion } from 'framer-motion'

const SECTIONS = [
  {
    heading: 'Memory',
    body: 'Memory shows every trait Creator Memory has learned from your past edits, each with a confidence score. Expand a trait to see when it was last updated and an example of it in action.',
  },
  {
    heading: 'New Project',
    body: 'When you start a new project, Creator Memory suggests the traits it thinks apply. Toggle any suggestion off before the project is created.',
  },
  {
    heading: 'In Editor',
    body: 'Gold markers on your timeline show where a learned preference fires. An annotation explains the trigger and lets you apply or dismiss it, and the chat panel can reference memories inline.',
  },
  {
    heading: 'Settings',
    body: 'Control whether memories apply automatically, whether new ones are recorded while you edit, and whether memory markers and notifications show up at all.',
  },
  {
    heading: 'Confidence Threshold',
    body: 'Each learned trait has a confidence score based on how consistently you use it. The Auto-Apply Threshold sets the score a trait needs before Creator Memory applies it without asking.',
  },
]

export default function HelpDrawer({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <>
      <motion.div
        data-testid="help-drawer-backdrop"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-black/60"
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-bg2 border-l border-border-md p-6 overflow-y-auto"
      >
        <button
          aria-label="Close help"
          onClick={onClose}
          className="absolute top-4 right-4 text-fg2"
        >
          ✕
        </button>
        <div className="flex flex-col gap-6 pt-8">
          {SECTIONS.map((section) => (
            <section key={section.heading}>
              <h2 className="text-fg font-medium mb-1">{section.heading}</h2>
              <p className="text-fg2 text-sm">{section.body}</p>
            </section>
          ))}
        </div>
      </motion.div>
    </>
  )
}
