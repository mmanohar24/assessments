import { useState } from 'react'
import { motion } from 'framer-motion'

const SUGGESTIONS = [
  { trait: 'Pacing', description: 'Cut dialog scenes with your usual 0.3s J-cut timing.' },
  { trait: 'Music', description: 'Duck background music under voiceover automatically.' },
  { trait: 'Captions', description: 'Use your bold, word-by-word caption style.' },
  { trait: 'B-roll', description: 'Insert B-roll on filler words longer than 1.2s.' },
  { trait: 'Format', description: 'Export vertical 9:16 with your usual caption safe zone.' },
]

function Toggle({ checked, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-5 w-9 rounded-full transition-colors ${
        checked ? 'bg-accent' : 'bg-bg3'
      }`}
    >
      <motion.span
        whileTap={{ scale: 0.9 }}
        animate={{ x: checked ? 18 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-0.5 left-0 h-4 w-4 rounded-full bg-fg block"
      />
    </button>
  )
}

export default function NewProject() {
  const [applied, setApplied] = useState(SUGGESTIONS.map(() => true))
  const count = applied.filter(Boolean).length

  const toggle = (i) => {
    setApplied((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1>Start from your style</h1>
        <div className="sticky top-0 rounded-full border border-border-md bg-bg2 px-4 py-1.5 text-sm text-fg">
          {count} of {SUGGESTIONS.length} applied
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {SUGGESTIONS.map((suggestion, i) => (
          <li
            key={suggestion.trait}
            className="flex items-center gap-4 rounded-md border border-border-subtle bg-bg2 px-4 py-3"
          >
            <Toggle
              checked={applied[i]}
              onChange={() => toggle(i)}
              label={suggestion.trait}
            />
            <span className="rounded-full border border-border-md px-2 py-0.5 text-xs text-accent">
              {suggestion.trait}
            </span>
            <span className="text-fg2 text-sm">{suggestion.description}</span>
          </li>
        ))}
      </ul>

      <button className="mt-6 rounded-md bg-accent px-4 py-2 text-sm text-bg">
        Create project
      </button>
    </div>
  )
}
