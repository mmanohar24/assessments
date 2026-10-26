import { useState } from 'react'

function MemChip({ id, openId, setOpenId }) {
  const isOpen = openId === id
  return (
    <span className="relative inline-block">
      <button
        onClick={() => setOpenId(isOpen ? null : id)}
        className="rounded-sm bg-accent-dim px-1 text-accent text-xs"
      >
        [mem: Pacing]
      </button>
      {isOpen && (
        <span
          role="tooltip"
          className="absolute bottom-full left-0 mb-1 w-48 rounded-md border border-border-md bg-bg3 px-2 py-1 text-xs text-fg2"
        >
          Pacing: this reply is informed by your learned 0.3s J-cut timing on dialog cuts.
        </span>
      )}
    </span>
  )
}

const MARKERS = [20, 50, 80]

export default function InEditor() {
  const [annotationVisible, setAnnotationVisible] = useState(true)
  const [openChip, setOpenChip] = useState(null)

  return (
    <div>
      <h1 className="sr-only">In Editor</h1>

      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6 mt-6">
        <section>
          <div
            aria-hidden="true"
            className="relative h-16 rounded-md bg-bg3 border border-border-subtle"
          >
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-fg" />
            {MARKERS.map((pct) => (
              <div
                key={pct}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rotate-45 bg-accent"
                style={{ left: `${pct}%` }}
                title="Memory"
              />
            ))}
          </div>

          {annotationVisible && (
            <div className="mt-4 rounded-md border border-border-md bg-bg2 p-4">
              <p className="text-fg text-sm">
                Triggered by: <strong>Pacing</strong> memory
              </p>
              <p className="text-fg2 text-xs mt-1">Confidence: 94%</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setAnnotationVisible(false)}
                  className="rounded-md bg-accent px-3 py-1.5 text-xs text-bg"
                >
                  Apply
                </button>
                <button
                  onClick={() => setAnnotationVisible(false)}
                  className="rounded-md border border-border-md px-3 py-1.5 text-xs text-fg2"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-md border border-border-subtle bg-bg2 p-4 flex flex-col gap-3">
          <div className="text-sm text-fg2 self-end bg-bg3 rounded-md px-3 py-2">
            Can you tighten the pacing on this scene?
          </div>
          <div className="text-sm text-fg self-start bg-bg4 rounded-md px-3 py-2">
            Sure — I applied your usual <MemChip id="chip-1" openId={openChip} setOpenId={setOpenChip} /> timing
            to the dialog cuts.
          </div>
          <div className="text-sm text-fg self-start bg-bg4 rounded-md px-3 py-2">
            I also matched the <MemChip id="chip-2" openId={openChip} setOpenId={setOpenChip} /> on the next
            scene for consistency.
          </div>
        </section>
      </div>
    </div>
  )
}
