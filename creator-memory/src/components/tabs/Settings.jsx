import { useState } from 'react'

const TOGGLES = [
  { key: 'autoApply', label: 'Auto-apply memories', default: true },
  { key: 'recordNew', label: 'Record new memories while editing', default: true },
  { key: 'showMarkers', label: 'Show memory markers in timeline', default: true },
  { key: 'notifyNewPattern', label: 'Notify when new pattern detected', default: false },
  { key: 'shareData', label: 'Share memory data to improve AI', default: false },
]

function ToggleRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-subtle">
      <span className="text-fg text-sm">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? 'bg-accent' : 'bg-bg3'
        }`}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-fg block transition-transform"
          style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
        />
      </button>
    </div>
  )
}

export default function Settings() {
  const [state, setState] = useState(
    TOGGLES.reduce((acc, t) => ({ ...acc, [t.key]: t.default }), {})
  )

  const flip = (key) => setState((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div>
      <h1>Settings</h1>

      <div className="mt-6 max-w-lg">
        {TOGGLES.map((t) => (
          <ToggleRow
            key={t.key}
            label={t.label}
            checked={state[t.key]}
            onChange={() => flip(t.key)}
          />
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <button className="rounded-md border border-border-md px-4 py-2 text-sm text-fg2">
          Export my memory data
        </button>
        <button className="rounded-md border border-red-500 px-4 py-2 text-sm text-red-500">
          Reset all memories
        </button>
      </div>
    </div>
  )
}
