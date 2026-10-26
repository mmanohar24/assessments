import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const STATS = [
  { label: 'Videos Analyzed', value: '247' },
  { label: 'Consistency Score', value: '94%' },
  { label: 'Avg Confidence', value: '87%' },
  { label: 'Active Memories', value: '6' },
]

const TRAITS = [
  { key: 'pacing', name: 'Pacing', pct: 94, updated: 'Oct 21, 2026', example: 'Dialog cuts consistently land on a 0.3s J-cut across your last 12 videos.' },
  { key: 'music', name: 'Music', pct: 88, updated: 'Oct 19, 2026', example: 'Background tracks fade to 40% under voiceover within 0.5s of speech starting.' },
  { key: 'captions', name: 'Captions', pct: 100, updated: 'Oct 24, 2026', example: 'Captions always use bold sans at the bottom third, word-by-word reveal.' },
  { key: 'broll', name: 'B-roll', pct: 79, updated: 'Oct 15, 2026', example: 'B-roll inserted on filler words lasting longer than 1.2s.' },
  { key: 'color', name: 'Color Grading', pct: 72, updated: 'Oct 10, 2026', example: 'Warm highlights, slightly lifted blacks, consistent across outdoor shots.' },
  { key: 'format', name: 'Format', pct: 91, updated: 'Oct 22, 2026', example: 'Vertical 9:16 exports with a 1080x1350 safe zone for captions.' },
]

const ACTIVITY = [
  'Noticed consistent 0.3s J-cut on dialog cuts — 12 videos',
  'Learned your intro always cuts on the beat — 8 videos',
  'Detected consistent caption style across uploads — 15 videos',
  'Picked up a preference for warm color grading outdoors — 6 videos',
]

export default function Memory() {
  const [openTrait, setOpenTrait] = useState(null)
  const [threshold, setThreshold] = useState(85)

  return (
    <div>
      <h1>Memory</h1>

      <div className="flex gap-4 my-6">
        {STATS.map((stat) => (
          <div key={stat.label} className="rounded-md border border-border-subtle bg-bg2 px-4 py-3">
            <div className="text-fg2 text-xs">{stat.label}</div>
            <div className="text-fg text-xl font-medium">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6">
        <section>
          <h2 className="text-fg font-medium mb-3">Learned Traits</h2>
          <ul className="flex flex-col gap-2">
            {TRAITS.map((trait) => {
              const isOpen = openTrait === trait.key
              return (
                <li key={trait.key} className="rounded-md border border-border-subtle bg-bg2">
                  <button
                    aria-expanded={isOpen}
                    onClick={() => setOpenTrait(isOpen ? null : trait.key)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  >
                    <span className="text-fg text-sm">
                      {trait.name} — {trait.pct}%
                    </span>
                    <span className="flex-1 h-1.5 rounded-full bg-bg3 overflow-hidden">
                      <span
                        className="block h-full bg-accent"
                        style={{ width: `${trait.pct}%` }}
                      />
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 text-sm text-fg2">
                          <p>Last updated: {trait.updated}</p>
                          <p className="mt-1">{trait.example}</p>
                          <button className="mt-2 rounded-md border border-border-md px-3 py-1.5 text-xs text-fg2">
                            View examples
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              )
            })}
          </ul>
        </section>

        <section>
          <h2 className="text-fg font-medium mb-3">Recent Activity</h2>
          <ul className="flex flex-col gap-3">
            {ACTIVITY.map((item) => (
              <li key={item} className="text-sm text-fg2 border-l-2 border-border-md pl-3">
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <label htmlFor="threshold" className="block text-fg text-sm mb-1">
              Auto-Apply Threshold
            </label>
            <p className="text-fg2 text-xs mb-2">
              Traits with a confidence score above this threshold are applied automatically.
            </p>
            <input
              id="threshold"
              type="range"
              role="slider"
              min="0"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
            <div className="text-fg2 text-xs mt-1">{threshold}%</div>
          </div>
        </section>
      </div>
    </div>
  )
}
