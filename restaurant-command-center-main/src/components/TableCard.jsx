import { formatCurrency, formatTime } from '../lib/format'

const statusStyles = {
  available: {
    card: 'bg-emerald-50 border-emerald-200',
    number: 'text-emerald-900',
    muted: 'text-emerald-700',
  },
  occupied: {
    card: 'bg-amber-50 border-amber-200',
    number: 'text-amber-950',
    muted: 'text-amber-800',
  },
  waiting_for_bill: {
    card: 'bg-red-50 border-red-200',
    number: 'text-red-950',
    muted: 'text-red-800',
  },
}

function TableCard({ table, orderTotal, selected, onSelect }) {
  const styles = statusStyles[table.status] ?? statusStyles.available
  const isInteractive = table.status !== 'available'
  const tableNumber = Number(String(table.id).replace(/\D/g, '')) || table.label

  return (
    <button
      type="button"
      disabled={!isInteractive}
      onClick={() => {
        if (isInteractive) onSelect(table.id)
      }}
      className={[
        'flex min-h-32 flex-col border p-3 text-left transition-colors sm:min-h-36 sm:p-4',
        styles.card,
        isInteractive ? 'cursor-pointer hover:brightness-[0.98]' : 'cursor-default',
        selected ? 'ring-2 ring-ink ring-offset-2' : '',
      ].join(' ')}
    >
      <span
        className={[
          'text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl',
          styles.number,
        ].join(' ')}
      >
        {tableNumber}
      </span>

      {table.status === 'available' ? (
        <p className={`mt-auto text-xs font-medium sm:text-sm ${styles.muted}`}>
          Available
        </p>
      ) : (
        <div className={`mt-auto space-y-0.5 text-xs sm:space-y-1 sm:text-sm ${styles.muted}`}>
          <p>
            <span className="font-medium text-inherit">{table.guests}</span>
            {table.guests === 1 ? ' guest' : ' guests'}
          </p>
          <p>Seated {formatTime(table.seatedAt)}</p>
          <p className={`font-semibold tabular-nums ${styles.number}`}>
            {formatCurrency(orderTotal ?? 0)}
          </p>
        </div>
      )}
    </button>
  )
}

export default TableCard
