import { useState } from 'react'
import { orders, tables } from '../data'
import {
  formatCurrency,
  formatStatus,
  formatTime,
  statusBadgeClass,
  tableLabel,
} from '../lib/format'

const ACTIVE_STATUSES = new Set(['pending', 'preparing', 'ready'])

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

function matchesFilter(order, filterId) {
  switch (filterId) {
    case 'active':
      return ACTIVE_STATUSES.has(order.status)
    case 'completed':
      return order.status === 'completed' || order.status === 'served'
    case 'cancelled':
      return order.status === 'cancelled'
    case 'all':
    default:
      return true
  }
}

function filterCount(filterId) {
  return orders.filter((order) => matchesFilter(order, filterId)).length
}

function formatItems(items) {
  return items.map((item) => `${item.name} ×${item.quantity}`).join(', ')
}

function Orders() {
  const [filter, setFilter] = useState('all')

  const filteredOrders = [...orders]
    .filter((order) => matchesFilter(order, filter))
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt))

  return (
    <section>
      <header className="mb-6 sm:mb-8">
        <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Orders
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Today&apos;s orders · read-only
        </p>
      </header>

      <div
        className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0"
        role="tablist"
        aria-label="Order filters"
      >
        {FILTERS.map((item) => {
          const isActive = filter === item.id
          const count = filterCount(item.id)

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setFilter(item.id)}
              className={[
                'relative -mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4',
                isActive
                  ? 'border-ink text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink',
              ].join(' ')}
            >
              {item.label}
              <span
                className={[
                  'ml-2 tabular-nums',
                  isActive ? 'text-ink' : 'text-ink-muted',
                ].join(' ')}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {filteredOrders.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">No orders in this filter.</p>
      ) : (
        <>
          <div className="mt-4 hidden grid-cols-[7rem_6.5rem_minmax(0,1fr)_6.5rem_7.5rem_5.5rem] gap-4 border-b border-border pb-2 text-xs font-medium uppercase tracking-wider text-ink-muted lg:grid">
            <span>Order</span>
            <span>Table</span>
            <span>Items</span>
            <span className="text-right">Total</span>
            <span>Status</span>
            <span className="text-right">Time</span>
          </div>

          <ul className="divide-y divide-border">
            {filteredOrders.map((order) => (
              <li key={order.id} className="py-4">
                <div className="hidden grid-cols-[7rem_6.5rem_minmax(0,1fr)_6.5rem_7.5rem_5.5rem] items-start gap-4 lg:grid">
                  <p className="text-sm font-semibold text-ink">{order.id}</p>
                  <p className="text-sm text-ink">
                    {tableLabel(order.tableId, tables)}
                  </p>
                  <p className="min-w-0 text-sm leading-relaxed text-ink-muted">
                    {formatItems(order.items)}
                  </p>
                  <p className="text-right text-sm font-semibold tabular-nums text-ink">
                    {formatCurrency(order.total)}
                  </p>
                  <span
                    className={[
                      'inline-flex w-fit rounded px-2 py-0.5 text-xs font-medium',
                      statusBadgeClass(order.status),
                    ].join(' ')}
                  >
                    {formatStatus(order.status)}
                  </span>
                  <p className="text-right text-sm tabular-nums text-ink-muted">
                    {formatTime(order.placedAt)}
                  </p>
                </div>

                <div className="space-y-2 lg:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{order.id}</p>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        {tableLabel(order.tableId, tables)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-ink">
                        {formatCurrency(order.total)}
                      </p>
                      <p className="mt-0.5 text-xs tabular-nums text-ink-muted">
                        {formatTime(order.placedAt)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={[
                      'inline-flex rounded px-2 py-0.5 text-xs font-medium',
                      statusBadgeClass(order.status),
                    ].join(' ')}
                  >
                    {formatStatus(order.status)}
                  </span>
                  <p className="text-sm leading-relaxed text-ink-muted">
                    {formatItems(order.items)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export default Orders
