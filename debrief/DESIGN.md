---
version: alpha
name: Obsidian Terminal
description: >
  A dark-first, agent-native design system built for the Zero to Agent hackathon.
  Evokes the feeling of watching an AI agent think in real time — a living terminal
  that feels intelligent, precise, and alive. Every surface is purposeful. Every
  interaction confirms that something is actually happening.

colors:
  primary: "#0D0F0E"
  surface: "#111311"
  surface-raised: "#161916"
  surface-overlay: "#1C1F1C"
  border: "#242824"
  border-active: "#2F3A30"
  accent: "#00E87A"
  accent-dim: "#00A855"
  accent-muted: "#003D22"
  text-primary: "#E8EDE8"
  text-secondary: "#8A9A8A"
  text-tertiary: "#4A5A4A"
  text-on-accent: "#001A0D"
  info: "#4D9EFF"
  info-surface: "#0A1F3D"
  warning: "#F5A623"
  warning-surface: "#2A1E00"
  error: "#FF5C5C"
  error-surface: "#2A0A0A"
  success: "#00E87A"
  success-surface: "#003D22"

typography:
  display:
    fontFamily: "JetBrains Mono"
    fontSize: 2.5rem
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.03em
  heading-lg:
    fontFamily: "JetBrains Mono"
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.02em
  heading-md:
    fontFamily: "JetBrains Mono"
    fontSize: 1.125rem
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  heading-sm:
    fontFamily: "JetBrains Mono"
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0em
  body-lg:
    fontFamily: "Inter"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.7
  body-md:
    fontFamily: "Inter"
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: "Inter"
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "JetBrains Mono"
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.06em
  code:
    fontFamily: "JetBrains Mono"
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.6

rounded:
  none: 0px
  sm: 2px
  md: 4px
  lg: 6px
  xl: 8px
  full: 9999px

spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  2xl: 64px
  gutter: 24px
  margin: 32px

components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.text-on-accent}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "#00FF88"
    textColor: "{colors.text-on-accent}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
    typography: "{typography.label}"
  button-secondary-hover:
    backgroundColor: "{colors.accent-muted}"
    textColor: "{colors.accent}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
    typography: "{typography.label}"
  button-ghost-hover:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
  nav-item-active:
    backgroundColor: "{colors.accent-muted}"
    textColor: "{colors.accent}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    typography: "{typography.label}"
  helper-text:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    typography: "{typography.body-sm}"
  divider:
    backgroundColor: "{colors.border}"
    textColor: "{colors.text-secondary}"
  divider-active:
    backgroundColor: "{colors.border-active}"
    textColor: "{colors.text-primary}"
  status-success:
    backgroundColor: "{colors.success-surface}"
    textColor: "{colors.success}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
    typography: "{typography.label}"
  button-destructive:
    backgroundColor: "{colors.error-surface}"
    textColor: "{colors.error}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
    typography: "{typography.label}"
  card:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.lg}"
    padding: "20px"
  card-hover:
    backgroundColor: "{colors.surface-overlay}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
    typography: "{typography.body-md}"
  input-focus:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
  badge-success:
    backgroundColor: "{colors.accent-muted}"
    textColor: "{colors.accent}"
    rounded: "{rounded.sm}"
    padding: "3px 8px"
    typography: "{typography.label}"
  badge-info:
    backgroundColor: "{colors.info-surface}"
    textColor: "{colors.info}"
    rounded: "{rounded.sm}"
    padding: "3px 8px"
    typography: "{typography.label}"
  badge-warning:
    backgroundColor: "{colors.warning-surface}"
    textColor: "{colors.warning}"
    rounded: "{rounded.sm}"
    padding: "3px 8px"
    typography: "{typography.label}"
  badge-error:
    backgroundColor: "{colors.error-surface}"
    textColor: "{colors.error}"
    rounded: "{rounded.sm}"
    padding: "3px 8px"
    typography: "{typography.label}"
  agent-log:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.accent}"
    rounded: "{rounded.lg}"
    padding: "16px"
    typography: "{typography.code}"
  status-live:
    backgroundColor: "{colors.accent-muted}"
    textColor: "{colors.accent}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
    typography: "{typography.label}"
  tooltip:
    backgroundColor: "{colors.surface-overlay}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
    typography: "{typography.body-sm}"
---

## Overview

Obsidian Terminal is an agent-native design system — built from the ground up to make AI systems feel *alive*. The aesthetic sits at the intersection of a professional developer terminal and a high-precision monitoring dashboard. It should feel like watching something intelligent happen in real time.

The brand personality is: **focused, alive, trustworthy, fast**. It does not try to be friendly or approachable in the consumer sense. It respects the user's intelligence. Every visual element serves a function. Decoration is earned.

The emotional response the UI should evoke: *"This agent is actually doing something. I can see it thinking. I trust it."*

Target audience: technically literate builders, developers, and evaluators (e.g. hackathon judges) who will immediately recognize when a UI is generic and when it has intentionality behind it.

The single most important visual rule: **nothing should feel static**. Agent states (idle, running, complete, error) must each look visually distinct. The UI should communicate system status at a glance without reading a single word.

## Colors

The palette is built on near-black surfaces with a single electric green accent — no competing colors, no gradients, no noise. The green (`#00E87A`) is the sole agent of attention. Everything else defers to it.

- **Primary (`#0D0F0E`):** The deepest surface. Used only for page backgrounds and the agent log panel — the "void" from which output emerges.
- **Surface (`#111311`):** Default content surface. Cards, panels, and containers live here. The subtle green tint prevents the black from feeling harsh or generic.
- **Surface Raised (`#161916`):** Elevated cards and interactive containers. The step from surface to surface-raised is intentionally subtle — depth through restraint.
- **Surface Overlay (`#1C1F1C`):** Hover states, modals, tooltips, and the highest elevation layer.
- **Border (`#242824`):** Default container borders. Barely visible — they define space without asserting it.
- **Border Active (`#2F3A30`):** Focused, active, or selected state borders. Shifts slightly green to echo the accent.
- **Accent (`#00E87A`):** The only true color in the system. Used for: primary CTA buttons, live status indicators, active agent states, success confirmations, cursor blinks, and the single most important piece of information on any screen. Never use it for decoration. Every appearance of the accent should mean something.
- **Accent Dim (`#00A855`):** Accent in a less prominent role — secondary highlights, hover states for accent elements, active navigation items.
- **Accent Muted (`#003D22`):** Accent backgrounds — badge fills, tag surfaces, subtle highlights. Always pair with `accent` text.
- **Text Primary (`#E8EDE8`):** Main readable text. Slightly warm-green tint to stay coherent with the palette. Never pure white.
- **Text Secondary (`#8A9A8A`):** Metadata, labels, captions, placeholder text. The workhorse color.
- **Text Tertiary (`#4A5A4A`):** Disabled states, ghost text, and decorative separators.
- **Text on Accent (`#001A0D`):** Text placed directly on the accent green. Deep forest, not black — maintains palette coherence.
- **Info (`#4D9EFF`):** Informational states, links, and progress indicators. Cool blue against the warm dark surfaces creates useful contrast without drama.
- **Warning (`#F5A623`):** Warnings and rate-limited states.
- **Error (`#FF5C5C`):** Error states and destructive confirmations only.

## Typography

Two typefaces. One rule: **JetBrains Mono owns structure, Inter owns content.**

JetBrains Mono is used for all headings, labels, status indicators, code output, and any text that communicates system state. Its monospaced geometry reinforces the terminal aesthetic while being genuinely readable at small sizes. The slight condensed feel at display sizes gives headlines real authority.

Inter is used for body copy, descriptions, and any prose-length content. It is neutral by design — its job is to get out of the way and let the content breathe. The contrast between Mono structure and Inter body creates natural visual hierarchy without size alone.

**Usage rules:**
- Headlines always use Mono at negative letter-spacing. Never use Inter for headings.
- Body text always uses Inter. Never use Mono for multi-line prose (it fatigues the eye).
- Agent log output always uses the `code` style — Mono, 13px, with generous line-height for readability during streaming.
- Labels are always uppercase with 0.06em tracking. They function as UI chrome, not content.
- Limit active font weights to 400 (Inter body) and 600–700 (Mono headings). No in-between weights on screen simultaneously.

## Layout

The layout follows an **8px base grid** with a 24px gutter. Content has a max-width of 1200px on desktop.

The spatial strategy is **intentional density**. This is not a spacious, airy design — it is a tool dashboard. Information should be close, readable, and organized. Whitespace is used for grouping, not decoration.

Page structure is left-rail navigation + main content area for multi-section agents. Single-purpose tools use a full-width centered layout with a max-width of 800px.

The left rail, when present, is 240px wide with a `surface` background. The main content area uses `primary` as its page background. This creates a subtle but perceptible depth step between navigation chrome and content.

Avoid centering single columns of content on wide screens — use a left-aligned layout with a consistent left margin. This feels more like a professional tool and less like a marketing page.

## Elevation & Depth

Depth is communicated through **background color steps**, not shadows. There are four elevation levels:

1. **Page** — `primary` (`#0D0F0E`). The base layer.
2. **Surface** — `surface` (`#111311`). Default panel/container layer.
3. **Raised** — `surface-raised` (`#161916`). Interactive cards, focused panels.
4. **Overlay** — `surface-overlay` (`#1C1F1C`). Tooltips, dropdowns, modals.

No box shadows. The only exception is a faint green glow (`0 0 0 1px #00E87A33`) applied to the focused/active state of primary interactive elements — used sparingly to draw the eye to the single most important interactive element on screen.

Borders define containers. The `border` color (`#242824`) is the default. `border-active` (`#2F3A30`) indicates interaction.

## Shapes

**Minimal rounding**. This is a terminal-inspired system, not a consumer app. Corners should feel sharp and engineered.

- Default radius: 4px (`rounded.md`) for all interactive elements — inputs, buttons, badges.
- Cards and panels: 6px (`rounded.lg`).
- Pills and status indicators: `rounded.full` (9999px) only for live status badges and avatar circles.
- Never use `rounded.xl` (8px) on rectangular containers. That reads as consumer-soft.

The shape language reinforces precision. Round corners are functional, not decorative.

## Components

Agent log panels are a first-class component in this system. They should appear as a deep `primary` background surface with the `code` typography style, accent-green text for active output, and `text-secondary` for completed lines. A blinking cursor (`▋`) in accent green indicates an active stream.

Status badges always communicate agent state: `status-live` (pulsing green dot + "LIVE"), `badge-info` for queued/running tools, `badge-warning` for rate-limited states, `badge-error` for failures.

Cards use `surface-raised` with a `border` outline. On hover they transition to `surface-overlay` with `border-active`. The transition duration should be 120ms ease-out — fast enough to feel responsive, not so fast it feels jittery.

Inputs use `surface` fill with `border` outline. On focus: `border-active` outline, no glow ring, no box-shadow — keep it minimal.

Primary buttons use the accent green fill. They should be the rarest button on any screen — if there are two primary buttons visible simultaneously, one of them should be demoted to secondary or ghost.

## Do's and Don'ts

**Do:**
- Use the accent green for exactly one primary action per screen
- Show agent state explicitly — never leave the UI in an ambiguous "loading" state without indicating what is happening
- Use monospaced type for any value that changes in real time (counters, latency, token counts, timestamps)
- Keep borders at 1px or 0.5px — never thicker
- Use `text-secondary` for all metadata, labels, and helper text by default
- Maintain the 8px grid for all spacing decisions
- Use the full `agent-log` component for any streaming text output — never a plain `<p>` tag
- Apply `border-active` (the green-shifted border) to the currently focused or active container

**Don't:**
- Don't use white or near-white backgrounds anywhere — there is no light mode in this system
- Don't use the accent green for more than one purpose per screen
- Don't mix font weights — only 400 and 600–700 are active
- Don't use drop shadows, blur effects, or gradients — depth comes from surface color steps only
- Don't use more than 3 levels of type hierarchy in a single view
- Don't center-align body text — left-align always for content
- Don't animate anything that isn't communicating state change — motion is reserved for meaningful transitions
- Don't use the error color for warnings, or the warning color for info — semantic color discipline is strict in this system
