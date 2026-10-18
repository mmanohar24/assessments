/** Format INR amounts for display (e.g. ₹18,400). */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Format ISO datetime as 12-hour clock (e.g. 12:31 PM). */
export function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/** Human-readable order / table status label. */
export function formatStatus(status) {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Status tone for badges and accents.
 * green = positive / available, amber = attention, red = urgent
 */
export function statusTone(status) {
  switch (status) {
    case 'available':
    case 'completed':
    case 'served':
      return 'green'
    case 'occupied':
    case 'pending':
    case 'preparing':
    case 'ready':
      return 'amber'
    case 'waiting_for_bill':
    case 'cancelled':
      return 'red'
    default:
      return 'neutral'
  }
}

const toneClasses = {
  green: 'bg-emerald-50 text-emerald-800',
  amber: 'bg-amber-50 text-amber-900',
  red: 'bg-red-50 text-red-800',
  neutral: 'bg-stone-100 text-stone-700',
}

export function statusBadgeClass(status) {
  return toneClasses[statusTone(status)] ?? toneClasses.neutral
}

/** Resolve table display label from id (e.g. T13 → Table 13). */
export function tableLabel(tableId, tables = []) {
  if (!tableId) return 'Takeaway'
  const match = tables.find((t) => t.id === tableId)
  if (match) return match.label
  const num = String(tableId).replace(/\D/g, '')
  return num ? `Table ${Number(num)}` : tableId
}
