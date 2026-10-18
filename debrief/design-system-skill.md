# Skill: Obsidian Terminal Design System

This skill teaches the Obsidian Terminal design system to any coding agent
working on this project.

## When to apply this skill

Apply this skill whenever you are:
- Writing any React component, HTML, or CSS
- Adding Tailwind classes to any element
- Choosing colors, fonts, spacing, or border radius values
- Designing a new page, layout, or UI pattern
- Creating status indicators, loading states, or agent output displays

## Source of truth

The authoritative design system definition lives in `DESIGN.md` at the
project root. Read it with:

```bash
cat DESIGN.md
```

Everything below is a quick-reference summary. DESIGN.md is always
canonical — if anything conflicts, DESIGN.md wins.

---

## Quick Reference

### Palette (dark-only — no light mode)

| Token | Hex | Use |
|---|---|---|
| primary | `#0D0F0E` | Page background, agent log panel |
| surface | `#111311` | Default panels and cards |
| surface-raised | `#161916` | Interactive/elevated cards |
| surface-overlay | `#1C1F1C` | Modals, dropdowns, tooltips |
| border | `#242824` | Default container outlines |
| border-active | `#2F3A30` | Focus, active, selected states |
| accent | `#00E87A` | Primary CTA, live state, agent active — one use per screen |
| accent-muted | `#003D22` | Accent badge/tag backgrounds |
| text-primary | `#E8EDE8` | Main readable text |
| text-secondary | `#8A9A8A` | Labels, metadata, captions |
| text-tertiary | `#4A5A4A` | Disabled, ghost, decorative |
| text-on-accent | `#001A0D` | Text placed on accent green |
| info | `#4D9EFF` / surface `#0A1F3D` | Informational states |
| warning | `#F5A623` / surface `#2A1E00` | Warnings |
| error | `#FF5C5C` / surface `#2A0A0A` | Errors |
| success | `#00E87A` / surface `#003D22` | Success (same as accent) |

### Fonts

| Use case | Font | Weight |
|---|---|---|
| Headings, labels, code, status | JetBrains Mono | 600–700 |
| Body copy, descriptions | Inter | 400 |

Load via: `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400&display=swap`

### Spacing scale
`4 / 8 / 16 / 24 / 40 / 64px`

### Border radius
- Interactive elements (buttons, inputs, badges): `4px`
- Cards and panels: `6px`
- Pills and status indicators: `9999px`

### Elevation (no shadows)
Background color only: `#0D0F0E` → `#111311` → `#161916` → `#1C1F1C`

---

## Agent State Patterns

Every agent-driven UI must make state visually obvious:

```
Idle:     gray border, text-secondary label, no accent
Running:  pulsing accent dot, border-active, agent log panel active
Complete: static accent checkmark, completed log lines in text-secondary
Error:    error-surface background, error-color border, error badge
```

Never leave the user in an ambiguous loading state. Always show what the
agent is doing (tool name, step count, elapsed time).

## Agent Log Panel

The signature component of this design system:

```jsx
<div className="bg-[#0D0F0E] border border-[#242824] rounded-[6px] p-4 font-mono text-sm">
  <div className="text-[#8A9A8A]">[12:04:01] Fetching context from MCP...</div>
  <div className="text-[#00E87A]">[12:04:02] Running tool: get_calendar_events</div>
  <div className="text-[#00E87A] after:content-['▋'] after:animate-pulse">
    [12:04:03] Generating response
  </div>
</div>
```

---

## Common Mistakes to Avoid

- Using `bg-white`, `bg-gray-*`, or any light background
- Using the accent green more than once per screen
- Using Inter for headings or labels
- Adding `box-shadow`, `backdrop-blur`, or gradients
- Using Tailwind's named color palette instead of exact hex values
- Forgetting to show agent state — never a plain spinner alone
