import {
  floorSummary,
  orders,
  restaurant,
  revenue,
  tables,
} from '../data'
import StatCard from '../components/StatCard'
import {
  formatCurrency,
  formatStatus,
  formatTime,
  statusBadgeClass,
  tableLabel,
} from '../lib/format'

const ACTIVE_STATUSES = new Set(['pending', 'preparing', 'ready'])

function formatLastUpdated(date) {
  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

function Overview() {
  const currentRevenue = revenue.current
  const targetRevenue = revenue.target ?? restaurant.target_revenue
  const revenueProgress = Math.round((currentRevenue / targetRevenue) * 100)
  const lastUpdated = formatLastUpdated(new Date())

  const activeOrders = orders.filter((order) =>
    ACTIVE_STATUSES.has(order.status),
  ).length

  const occupiedTables = floorSummary.occupied
  const totalTables = restaurant.total_tables ?? tables.length

  const topItem = revenue.top_item

  const recentOrders = [...orders]
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
    .slice(0, 5)

  return (
    <section>
      <header className="mb-6 sm:mb-8">
        <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          Overview
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Live snapshot for {restaurant.name} · today
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          Last updated · {lastUpdated}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Today's Revenue"
          value={formatCurrency(currentRevenue)}
          detail={`of ${formatCurrency(targetRevenue)} target · ${revenueProgress}%`}
          accent={revenueProgress >= 70 ? 'green' : 'amber'}
          progress={revenueProgress}
        />
        <StatCard
          label="Active Orders"
          value={activeOrders}
          detail="Preparing, ready, or pending"
          accent={activeOrders > 0 ? 'amber' : 'green'}
        />
        <StatCard
          label="Tables Occupied"
          value={`${occupiedTables} of ${totalTables}`}
          detail={`${floorSummary.available} available · ${floorSummary.waitingForBill} waiting for bill`}
          accent={
            floorSummary.waitingForBill > 0
              ? 'red'
              : occupiedTables > 0
                ? 'amber'
                : 'green'
          }
        />
        <StatCard
          label="Top Item Today"
          value={topItem.name}
          detail={`${topItem.count} orders`}
          accent="green"
        />
      </div>

      <div className="mt-8 sm:mt-10">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h3 className="text-base font-semibold text-ink">Recent Activity</h3>
          <p className="text-xs text-ink-muted">Last 5 orders</p>
        </div>

        <ul className="divide-y divide-border border-y border-border">
          {recentOrders.map((order) => (
            <li
              key={order.id}
              className="flex items-start justify-between gap-3 py-3.5 sm:items-center sm:gap-6"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-sm font-medium text-ink">
                    {order.id}
                  </span>
                  <span
                    className={[
                      'inline-flex rounded px-2 py-0.5 text-xs font-medium',
                      statusBadgeClass(order.status),
                    ].join(' ')}
                  >
                    {formatStatus(order.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {tableLabel(order.tableId, tables)}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums text-ink">
                  {formatCurrency(order.total)}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {formatTime(order.placedAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default Overview
