function StatCard({ label, value, detail, accent = 'neutral', progress = null }) {
  const accents = {
    green: {
      border: 'border-l-emerald-500',
      bar: 'bg-emerald-500',
    },
    amber: {
      border: 'border-l-amber-500',
      bar: 'bg-amber-500',
    },
    red: {
      border: 'border-l-red-500',
      bar: 'bg-red-500',
    },
    neutral: {
      border: 'border-l-stone-300',
      bar: 'bg-stone-400',
    },
  }

  const tone = accents[accent] ?? accents.neutral
  const progressValue =
    progress == null ? null : Math.max(0, Math.min(100, progress))

  return (
    <div
      className={[
        'border border-border border-l-4 bg-white px-5 py-4',
        tone.border,
      ].join(' ')}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink tabular-nums sm:text-3xl">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 text-sm text-ink-muted">{detail}</p>
      ) : null}
      {progressValue != null ? (
        <div className="mt-3">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-stone-100"
            role="progressbar"
            aria-valuenow={progressValue}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Revenue progress toward target"
          >
            <div
              className={['h-full rounded-full transition-none', tone.bar].join(' ')}
              style={{ width: `${progressValue}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default StatCard
