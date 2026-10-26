export default function Header({ title, onHelpClick }) {
  return (
    <header className="flex items-center justify-between border-b border-border-subtle bg-bg1 px-6 py-4">
      <p className="text-lg font-medium text-fg">{title}</p>
      <div className="flex items-center gap-2">
        <button
          aria-label="Help"
          onClick={onHelpClick}
          className="rounded-md border border-border-md px-3 py-1.5 text-sm text-fg2"
        >
          ?
        </button>
        <button
          aria-label="Notifications"
          className="rounded-md border border-border-md px-3 py-1.5 text-sm text-fg2"
        >
          🔔
        </button>
      </div>
    </header>
  )
}
