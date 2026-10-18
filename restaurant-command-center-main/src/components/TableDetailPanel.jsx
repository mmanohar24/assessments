import {
  formatCurrency,
  formatStatus,
  formatTime,
  statusBadgeClass,
} from '../lib/format'

function TableDetailPanel({ table, order, onClose }) {
  if (!table) return null

  const panel = (
    <aside className="flex h-full max-h-[90vh] w-full flex-col overflow-hidden border border-border bg-white lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:w-80 lg:shrink-0">
      <div className="flex items-start justify-between border-b border-border px-5 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
            {table.section}
          </p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-ink">
            {table.label}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-ink-muted hover:text-ink"
          aria-label="Close table details"
        >
          Close
        </button>
      </div>

      <div className="space-y-4 border-b border-border px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink-muted">Status</span>
          <span
            className={[
              'inline-flex rounded px-2 py-0.5 text-xs font-medium',
              statusBadgeClass(table.status),
            ].join(' ')}
          >
            {formatStatus(table.status)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink-muted">Guests</span>
          <span className="text-sm font-medium tabular-nums text-ink">
            {table.guests}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink-muted">Seated</span>
          <span className="text-sm font-medium text-ink">
            {formatTime(table.seatedAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink-muted">Server</span>
          <span className="text-sm font-medium text-ink">
            {table.server ?? '—'}
          </span>
        </div>
        {order ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink-muted">Order</span>
            <span className="text-sm font-medium text-ink">{order.id}</span>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <h4 className="text-sm font-semibold text-ink">Items ordered</h4>
        {order ? (
          <ul className="mt-3 divide-y divide-border">
            {order.items.map((item) => (
              <li
                key={`${order.id}-${item.menuItemId}-${item.name}`}
                className="flex items-start justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink">{item.name}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    ×{item.quantity}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium tabular-nums text-ink">
                  {formatCurrency(item.lineTotal)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">No order found.</p>
        )}
      </div>

      {order ? (
        <div className="border-t border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink-muted">Total</span>
            <span className="text-lg font-semibold tabular-nums text-ink">
              {formatCurrency(order.total)}
            </span>
          </div>
        </div>
      ) : null}
    </aside>
  )

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 lg:static lg:inset-auto lg:z-auto">
        {panel}
      </div>
    </>
  )
}

export default TableDetailPanel
