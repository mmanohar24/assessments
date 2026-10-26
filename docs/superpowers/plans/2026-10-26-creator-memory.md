# Creator Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy "Creator Memory," a no-backend React/Tailwind/Framer Motion portfolio prototype demonstrating an AI video editor that learns and applies a creator's editing style.

**Architecture:** Vite + React 18 SPA with `react-router-dom` routing the 4 tabs as real routes (`/memory`, `/new-project`, `/in-editor`, `/settings`, with `/` redirecting to `/memory`), a fixed sidebar + header shell wrapping an `AnimatePresence`-animated route outlet, and two overlay components (onboarding modal, help drawer) mounted at the app root. All state is local `useState`/`useReducer` except the onboarding flag, which persists to `localStorage`.

**Tech Stack:** React 18, Vite, Tailwind CSS, Framer Motion, react-router-dom, Vitest + @testing-library/react + jsdom for component tests.

**Spec:** `docs/superpowers/specs/2026-10-26-creator-memory-design.md`

## Global Constraints

- Project lives at `creator-memory/` (new sibling directory in this multi-project repo).
- No backend, no network calls, no persisted state other than `localStorage.getItem/setItem('cm_onboarded')`.
- Dark-only theme; tokens exactly as listed in the spec's design-tokens block (hex/rgba values, radius scale, Inter font via Google Fonts, `color-scheme: dark`).
- 4 tabs are routes: `/memory` = Memory, `/new-project` = New Project, `/in-editor` = In Editor, `/settings` = Settings. `/` redirects to `/memory`.
- Sidebar: 240px fixed desktop, icon-only ≤768px collapsing to a full-width sheet on tap.
- All animations use Framer Motion with the exact transitions specified (fade+8px slide 0.2s tab switch, height AnimatePresence for trait rows, horizontal slide onboarding, `x: '100%'→0` help drawer, spring scale toggle thumbs).
- `vercel.json` must include SPA rewrites (all paths → `/index.html`).
- User has explicitly authorized running `vercel --prod` automatically at the end of Task 9, then pushing to a new branch `creator-memory` on `https://github.com/mmanohar24/assessments` and opening a PR to `main` (Task 10) — no confirmation needed for this portfolio prototype.

## Review Focus

- **Mobile width (≤768px):** sidebar must collapse to icon-only / tap-open sheet, not just shrink — a task's test should assert the collapsed state renders at a mobile viewport/class, not just that desktop renders.
- **Direct URL / page refresh on a non-root route** (e.g. refreshing on `/settings`): must render that tab directly, not blank or redirect to `/` — this is the entire reason `vercel.json` rewrites exist, so it must actually be exercised, not just declared in config.
- **Onboarding re-visit:** after `cm_onboarded` is set, reloading the app must NOT show the overlay again — test must set the flag first and assert the overlay is absent, not just test the "first visit" path.
- **Accordion mutual exclusivity under rapid clicks:** opening trait row B while row A is open must close A, including the case of clicking the already-open row (it should collapse, not stay open) — test both directions.
- **Empty/edge toggle state in New Project:** toggling all 5 off must show "0 of 5 applied" (not blank or NaN), and all 5 on must show "5 of 5 applied" — test both boundaries, not just one toggle.

---

### Task 1: Project scaffold

**Files:**
- Create: `creator-memory/package.json`
- Create: `creator-memory/vite.config.js`
- Create: `creator-memory/postcss.config.js`
- Create: `creator-memory/tailwind.config.js`
- Create: `creator-memory/index.html`
- Create: `creator-memory/src/index.css`
- Create: `creator-memory/src/main.jsx`
- Create: `creator-memory/.gitignore`
- Create: `creator-memory/vercel.json`

**Interfaces:**
- Produces: Tailwind tokens as theme extensions: `colors.bg, bg1, bg2, bg3, bg4, fg, fg2, fg3, accent, 'accent-dim', green, blue`, `borderColor.subtle/md/hi` (or custom color keys `border-subtle/border-md/border-hi`), `borderRadius: {sm:'6px', md:'10px', lg:'16px', xl:'22px'}`. Every later task's Tailwind classes assume these exact token names exist.
- Produces: `main.jsx` renders `<BrowserRouter><App /></BrowserRouter>` into `#root`. Task 2 defines `App`.

- [ ] **Step 1: Write `package.json`** with deps `react`, `react-dom`, `react-router-dom`, `framer-motion`, devDeps `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`; scripts `dev`, `build`, `preview`, `test`.

- [ ] **Step 2: Write `vite.config.js`** using `@vitejs/plugin-react`, and a `test` block (`environment: 'jsdom'`, `globals: true`, `setupFiles: './src/setupTests.js'`).

- [ ] **Step 3: Write `src/setupTests.js`** importing `@testing-library/jest-dom`.

- [ ] **Step 4: Write `tailwind.config.js`** with `content: ['./index.html', './src/**/*.{js,jsx}']` and the token `theme.extend` values listed in Interfaces, copied verbatim from the spec's design-tokens block.

- [ ] **Step 5: Write `postcss.config.js`** with `tailwindcss` and `autoprefixer` plugins.

- [ ] **Step 6: Write `index.html`** with a Google Fonts `<link>` for Inter (weights 300/400/500/600, variable), `<div id="root">`, and `color-scheme: dark` set via a `<meta name="color-scheme" content="dark">` or inline style on `html`.

- [ ] **Step 7: Write `src/index.css`** with `@tailwind base; @tailwind components; @tailwind utilities;` plus `body { background: theme token bg; color: token fg; font-family: 'Inter', sans-serif; }`.

- [ ] **Step 8: Write `src/main.jsx`** per the Produces interface above (imports `App` from `./App.jsx`, which does not exist yet).

- [ ] **Step 9: Write `.gitignore`** (`node_modules`, `dist`, `.vercel`).

- [ ] **Step 10: Write `vercel.json`** with `{"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]}`.

- [ ] **Step 11: Install dependencies**

Run: `cd creator-memory && npm install`
Expected: installs without error.

- [ ] **Step 12: Commit**

```bash
git add creator-memory/package.json creator-memory/package-lock.json creator-memory/vite.config.js creator-memory/postcss.config.js creator-memory/tailwind.config.js creator-memory/index.html creator-memory/src/index.css creator-memory/src/main.jsx creator-memory/src/setupTests.js creator-memory/.gitignore creator-memory/vercel.json
git commit -m "scaffold creator-memory project"
```

---

### Task 2: App shell, routing, Sidebar, Header

**Files:**
- Create: `creator-memory/src/App.jsx`
- Create: `creator-memory/src/components/Sidebar.jsx`
- Create: `creator-memory/src/components/Header.jsx`
- Test: `creator-memory/src/components/Sidebar.test.jsx`
- Test: `creator-memory/src/App.test.jsx`

**Interfaces:**
- Consumes: `main.jsx` renders `<App/>` inside a `BrowserRouter` (Task 1).
- Produces: `Sidebar` renders 4 nav links with `to="/memory"` (label "Memory"), `to="/new-project"` (label "New Project"), `to="/in-editor"` (label "In Editor"), `to="/settings"` (label "Settings"), using `NavLink` so the active route gets an `aria-current="page"` (react-router's default on `NavLink`). Exposes a mobile toggle button with `aria-label="Toggle navigation"`.
- Produces: `Header` accepts `title: string` prop and renders it, plus a button `aria-label="Help"` and a button `aria-label="Notifications"`. `Header` accepts `onHelpClick: () => void` prop, called when the Help button is clicked.
- Produces: `App` renders `Sidebar`, `Header` (title derived from current route), a `<Routes>` with `path="/"` → `<Navigate to="/memory" replace />` and the 4 real paths each lazy-rendering its tab component (stub components created later tasks will replace placeholders), wrapped in `<AnimatePresence mode="wait">` keyed on `useLocation().pathname`, with `motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}} transition={{duration:0.2}}` around the active route's element.

- [ ] **Step 1: Write failing test for Sidebar nav + active state**

```jsx
// Sidebar.test.jsx
test('marks the current route link as active', () => {
  render(<MemoryRouter initialEntries={['/settings']}><Sidebar /></MemoryRouter>)
  expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: 'Memory' })).not.toHaveAttribute('aria-current', 'page')
})
```

(Note: `MemoryRouter` here is react-router-dom's in-memory router for tests — unrelated to the app's "Memory" tab, which happens to share the name.)

- [ ] **Step 2: Run test, verify it fails** (Sidebar doesn't exist)

Run: `cd creator-memory && npx vitest run src/components/Sidebar.test.jsx`
Expected: FAIL — cannot resolve `./Sidebar`

- [ ] **Step 3: Implement `Sidebar.jsx`** per the Produces interface: logo at top, the 4 `NavLink`s, a user-avatar placeholder (initials circle) pinned to the bottom via flex, `≤768px`: collapse labels and show only icons by default (`md:` prefix for labels, i.e. Tailwind `hidden md:inline` on label text), with a mobile toggle button that expands the sidebar into a full-width fixed sheet (`fixed inset-0` panel) when clicked, controlled by local `useState`.

- [ ] **Step 4: Run test, verify it passes**

Run: `cd creator-memory && npx vitest run src/components/Sidebar.test.jsx`
Expected: PASS

- [ ] **Step 5: Write failing test for mobile collapse behavior**

```jsx
test('mobile toggle opens a full-width sheet', () => {
  render(<MemoryRouter><Sidebar /></MemoryRouter>)
  fireEvent.click(screen.getByLabelText('Toggle navigation'))
  expect(screen.getByRole('navigation')).toHaveClass(/* the full-sheet class your implementation uses, e.g. 'w-full' */)
})
```

Implementer picks the exact class asserted here to match Step 3's implementation; the test and implementation must agree on one concrete class name.

- [ ] **Step 6: Run test, verify it passes** (adjust implementation or test to match, then re-run)

Run: `cd creator-memory && npx vitest run src/components/Sidebar.test.jsx`
Expected: PASS

- [ ] **Step 7: Implement `Header.jsx`** per the Produces interface (no test required beyond App-level smoke test in Step 9 — purely presentational besides the one callback prop).

- [ ] **Step 8: Write failing test for App routing + direct-URL rendering**

```jsx
// App.test.jsx — covers Review Focus: direct URL on a non-root route
test('rendering App with initial route /settings shows the Settings tab heading, not Memory', () => {
  render(<MemoryRouter initialEntries={['/settings']}><App /></MemoryRouter>)
  expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: /learned traits/i })).not.toBeInTheDocument()
})

test('rendering App at / redirects to /memory', () => {
  render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
  expect(screen.queryByRole('heading', { name: /settings/i })).not.toBeInTheDocument()
})
```

(This test exercises what `vercel.json`'s rewrite exists to support: a non-root path must render its own content directly, independent of navigation history.)

- [ ] **Step 9: Run test, verify it fails**

Run: `cd creator-memory && npx vitest run src/App.test.jsx`
Expected: FAIL — `App` / tab components don't exist yet

- [ ] **Step 10: Implement `App.jsx`** per the Produces interface, with temporary placeholder tab components inline (`<h1>Memory</h1>` etc. with the exact headings the test and later tasks expect: "Learned Traits" appears inside the real Memory tab, not the placeholder — so write minimal real headings now: `<h1>Settings</h1>` for Settings route, and for Memory route a heading that does NOT match `/learned traits/i` yet is fine since Task 5 replaces this placeholder). Adjust the test in Step 8 to assert against the placeholder heading text actually used (e.g. just assert the Settings heading appears and the Memory-tab-only heading used by the placeholder does not).

- [ ] **Step 11: Run test, verify it passes**

Run: `cd creator-memory && npx vitest run src/App.test.jsx`
Expected: PASS

- [ ] **Step 12: Commit**

```bash
git add creator-memory/src/App.jsx creator-memory/src/App.test.jsx creator-memory/src/components/Sidebar.jsx creator-memory/src/components/Sidebar.test.jsx creator-memory/src/components/Header.jsx
git commit -m "add app shell, routing, sidebar, header"
```

---

### Task 3: OnboardingOverlay

**Files:**
- Create: `creator-memory/src/components/OnboardingOverlay.jsx`
- Test: `creator-memory/src/components/OnboardingOverlay.test.jsx`

**Interfaces:**
- Consumes: nothing from other components; mounted by `App` (Task 2, wire-up happens in Task 9) at root, always rendered — the component itself decides visibility from `localStorage`.
- Produces: `OnboardingOverlay` reads `localStorage.getItem('cm_onboarded')` on mount. Renders `null` if truthy. Otherwise renders a centered modal with backdrop blur, 3 steps (exact headings: "Your editing style, remembered.", "Four views, one workflow.", "Memory markers guide your edits."), each with an SVG icon, heading, 2-sentence description, Prev/Next buttons (Prev disabled on step 1, "Next" becomes "Get started" on step 3), and a "Skip" button top-right. Calling "Get started" or "Skip" calls `localStorage.setItem('cm_onboarded', 'true')` and unmounts (renders `null`).

- [ ] **Step 1: Write failing test for first-visit display and step navigation**

```jsx
test('shows step 1 on first visit, advances through steps, and Get started persists the flag', () => {
  localStorage.clear()
  render(<OnboardingOverlay />)
  expect(screen.getByText('Your editing style, remembered.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByText('Four views, one workflow.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByText('Memory markers guide your edits.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Get started' }))
  expect(localStorage.getItem('cm_onboarded')).toBe('true')
  expect(screen.queryByText('Memory markers guide your edits.')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd creator-memory && npx vitest run src/components/OnboardingOverlay.test.jsx`
Expected: FAIL — component doesn't exist

- [ ] **Step 3: Write failing test for the Review-Focus re-visit case**

```jsx
test('does not show the overlay when cm_onboarded is already set', () => {
  localStorage.setItem('cm_onboarded', 'true')
  render(<OnboardingOverlay />)
  expect(screen.queryByText('Your editing style, remembered.')).not.toBeInTheDocument()
})
```

- [ ] **Step 4: Implement `OnboardingOverlay.jsx`** per the Produces interface, using `AnimatePresence`/`motion.div` with a horizontal slide transition (`x: 40 → 0` entering, `x: -40` exiting) between steps keyed on step index.

- [ ] **Step 5: Run both tests, verify they pass**

Run: `cd creator-memory && npx vitest run src/components/OnboardingOverlay.test.jsx`
Expected: PASS (both tests)

- [ ] **Step 6: Write failing test for Skip**

```jsx
test('Skip persists the flag and closes immediately from step 1', () => {
  localStorage.clear()
  render(<OnboardingOverlay />)
  fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
  expect(localStorage.getItem('cm_onboarded')).toBe('true')
  expect(screen.queryByText('Your editing style, remembered.')).not.toBeInTheDocument()
})
```

- [ ] **Step 7: Run test, verify it passes** (implementation from Step 4 already covers this if Skip calls the same close handler as Step 3's "Get started" — if not, fix `OnboardingOverlay.jsx` so Skip calls it from any step)

Run: `cd creator-memory && npx vitest run src/components/OnboardingOverlay.test.jsx`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add creator-memory/src/components/OnboardingOverlay.jsx creator-memory/src/components/OnboardingOverlay.test.jsx
git commit -m "add onboarding overlay with localStorage gate"
```

---

### Task 4: HelpDrawer

**Files:**
- Create: `creator-memory/src/components/HelpDrawer.jsx`
- Test: `creator-memory/src/components/HelpDrawer.test.jsx`

**Interfaces:**
- Consumes: `isOpen: boolean`, `onClose: () => void` props (wired from `App`/`Header` in Task 9).
- Produces: `HelpDrawer` renders `null` when `isOpen` is false. When `isOpen`, renders a right-side drawer (`motion.div` sliding `x: '100%' → 0`) with a backdrop (`motion.div` fading in), 5 sections (4 matching the tabs — "Memory", "New Project", "In Editor", "Settings" — each a heading + 2-3 sentences, plus a 5th section "Confidence Threshold" explaining the threshold system), and a close button `aria-label="Close help"`. Clicking the close button or the backdrop calls `onClose`.

- [ ] **Step 1: Write failing test**

```jsx
test('renders nothing when closed, and calls onClose on close-button and backdrop clicks', () => {
  const onClose = vi.fn()
  const { rerender } = render(<HelpDrawer isOpen={false} onClose={onClose} />)
  expect(screen.queryByLabelText('Close help')).not.toBeInTheDocument()
  rerender(<HelpDrawer isOpen={true} onClose={onClose} />)
  expect(screen.getByRole('heading', { name: 'Confidence Threshold' })).toBeInTheDocument()
  fireEvent.click(screen.getByLabelText('Close help'))
  expect(onClose).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByTestId('help-drawer-backdrop'))
  expect(onClose).toHaveBeenCalledTimes(2)
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd creator-memory && npx vitest run src/components/HelpDrawer.test.jsx`
Expected: FAIL — component doesn't exist

- [ ] **Step 3: Implement `HelpDrawer.jsx`** per the Produces interface, backdrop has `data-testid="help-drawer-backdrop"`.

- [ ] **Step 4: Run test, verify it passes**

Run: `cd creator-memory && npx vitest run src/components/HelpDrawer.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add creator-memory/src/components/HelpDrawer.jsx creator-memory/src/components/HelpDrawer.test.jsx
git commit -m "add help drawer"
```

---

### Task 5: Memory tab

**Files:**
- Create: `creator-memory/src/components/tabs/Memory.jsx`
- Test: `creator-memory/src/components/tabs/Memory.test.jsx`

**Interfaces:**
- Produces: `Memory` renders (no props) a heading `"Memory"`, a stat-chip bar with 4 chips: "Videos Analyzed" 247, "Consistency Score" 94%, "Avg Confidence" 87%, "Active Memories" 6; a left column headed "Learned Traits" with 6 trait rows (name, confidence bar, percentage) for Pacing 94, Music 88, Captions 100, B-roll 79, Color Grading 72, Format 91, each row a `button` with `aria-expanded`; clicking a row's button toggles its expanded panel (last-updated date, example description, "View examples" button) via `AnimatePresence` height animation, and expanding one row collapses any other open row; a right column headed "Recent Activity" with 4 timeline items (static copy, e.g. "Noticed consistent 0.3s J-cut on dialog cuts — 12 videos") and an "Auto-Apply Threshold" slider (`role="slider"` or `input[type=range]`) defaulting to value `85`, with a label describing that traits above this threshold auto-apply.

- [ ] **Step 1: Write failing test for single-open accordion (both directions, per Review Focus)**

```jsx
test('only one trait row is expanded at a time, including re-clicking the open row to close it', () => {
  render(<Memory />)
  const pacing = screen.getByRole('button', { name: /Pacing/ })
  const music = screen.getByRole('button', { name: /Music/ })
  fireEvent.click(pacing)
  expect(pacing).toHaveAttribute('aria-expanded', 'true')
  fireEvent.click(music)
  expect(pacing).toHaveAttribute('aria-expanded', 'false')
  expect(music).toHaveAttribute('aria-expanded', 'true')
  fireEvent.click(music)
  expect(music).toHaveAttribute('aria-expanded', 'false')
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd creator-memory && npx vitest run src/components/tabs/Memory.test.jsx`
Expected: FAIL — component doesn't exist

- [ ] **Step 3: Write failing test for stat chips and threshold slider defaults**

```jsx
test('renders the 4 stat chips and a threshold slider defaulting to 85', () => {
  render(<Memory />)
  expect(screen.getByText('247')).toBeInTheDocument()
  expect(screen.getByText('94%')).toBeInTheDocument() // Consistency Score
  expect(screen.getByText('87%')).toBeInTheDocument()
  expect(screen.getByText('6')).toBeInTheDocument()
  expect(screen.getByRole('slider')).toHaveValue('85')
})
```

- [ ] **Step 4: Implement `Memory.jsx`** per the Produces interface. Expanded-row state is a single `useState<string|null>` holding the open trait's key; clicking a row's button sets it to its own key or `null` if already open (satisfies Step 1 directly).

- [ ] **Step 5: Run both tests, verify they pass**

Run: `cd creator-memory && npx vitest run src/components/tabs/Memory.test.jsx`
Expected: PASS (both tests)

- [ ] **Step 6: Commit**

```bash
git add creator-memory/src/components/tabs/Memory.jsx creator-memory/src/components/tabs/Memory.test.jsx
git commit -m "add Memory tab with trait accordion and threshold slider"
```

---

### Task 6: New Project tab

**Files:**
- Create: `creator-memory/src/components/tabs/NewProject.jsx`
- Test: `creator-memory/src/components/tabs/NewProject.test.jsx`

**Interfaces:**
- Produces: `NewProject` renders a heading "Start from your style", 5 suggestion cards each with a toggle switch (`role="switch"`, default all `aria-checked="true"`), a trait badge (e.g. "Pacing"), a one-line description, a sticky pill reading `"{n} of 5 applied"` where `n` is the count of currently-on toggles, and a "Create project" button.

- [ ] **Step 1: Write failing test for the two boundary states from Review Focus**

```jsx
test('pill reads "5 of 5 applied" by default, and "0 of 5 applied" once all toggles are off', () => {
  render(<NewProject />)
  expect(screen.getByText('5 of 5 applied')).toBeInTheDocument()
  screen.getAllByRole('switch').forEach(sw => fireEvent.click(sw))
  expect(screen.getByText('0 of 5 applied')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd creator-memory && npx vitest run src/components/tabs/NewProject.test.jsx`
Expected: FAIL — component doesn't exist

- [ ] **Step 3: Write failing test for single-toggle live update**

```jsx
test('toggling one card off updates the pill to 4 of 5', () => {
  render(<NewProject />)
  fireEvent.click(screen.getAllByRole('switch')[0])
  expect(screen.getByText('4 of 5 applied')).toBeInTheDocument()
})
```

- [ ] **Step 4: Implement `NewProject.jsx`** per the Produces interface: state is an array/object of 5 booleans defaulting to `true`; the toggle thumb uses a Framer Motion spring scale (`whileTap={{scale: 0.9}}` plus a `motion.span` thumb with `transition={{type:'spring'}}` on position change).

- [ ] **Step 5: Run both tests, verify they pass**

Run: `cd creator-memory && npx vitest run src/components/tabs/NewProject.test.jsx`
Expected: PASS (both tests)

- [ ] **Step 6: Commit**

```bash
git add creator-memory/src/components/tabs/NewProject.jsx creator-memory/src/components/tabs/NewProject.test.jsx
git commit -m "add New Project tab with live suggestion toggle count"
```

---

### Task 7: In Editor tab

**Files:**
- Create: `creator-memory/src/components/tabs/InEditor.jsx`
- Test: `creator-memory/src/components/tabs/InEditor.test.jsx`

**Interfaces:**
- Produces: `InEditor` renders a non-interactive mock timeline (a bar with a playhead and 3 gold diamond markers each labeled "Memory"), an annotation card (visible by default, showing which memory triggered, a confidence score, "Apply" and "Dismiss" buttons — clicking either dismisses the card, i.e. sets a `useState` boolean to hide it), and a chat panel with 3 fixed messages alternating user/AI; 2 of the AI messages contain a clickable `[mem: Pacing]` chip (`button`, text `"[mem: Pacing]"`) that toggles a small tooltip explaining the memory reference when clicked (click again, or click elsewhere via a second chip, closes the first).

- [ ] **Step 1: Write failing test for annotation Apply/Dismiss**

```jsx
test('clicking Apply or Dismiss hides the annotation card', () => {
  render(<InEditor />)
  expect(screen.getByText(/confidence/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
  expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd creator-memory && npx vitest run src/components/tabs/InEditor.test.jsx`
Expected: FAIL — component doesn't exist

- [ ] **Step 3: Write failing test for mem-chip tooltip toggle**

```jsx
test('clicking a [mem: Pacing] chip opens its tooltip, clicking again closes it', () => {
  render(<InEditor />)
  const chip = screen.getAllByRole('button', { name: '[mem: Pacing]' })[0]
  fireEvent.click(chip)
  expect(screen.getByRole('tooltip')).toBeInTheDocument()
  fireEvent.click(chip)
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
})
```

- [ ] **Step 4: Implement `InEditor.jsx`** per the Produces interface. Timeline markers are purely decorative (`aria-hidden`, no interaction). Tooltip element has `role="tooltip"`.

- [ ] **Step 5: Run both tests, verify they pass**

Run: `cd creator-memory && npx vitest run src/components/tabs/InEditor.test.jsx`
Expected: PASS (both tests)

- [ ] **Step 6: Commit**

```bash
git add creator-memory/src/components/tabs/InEditor.jsx creator-memory/src/components/tabs/InEditor.test.jsx
git commit -m "add In Editor tab with mock timeline, annotation card, chat mem chips"
```

---

### Task 8: Settings tab

**Files:**
- Create: `creator-memory/src/components/tabs/Settings.jsx`
- Test: `creator-memory/src/components/tabs/Settings.test.jsx`

**Interfaces:**
- Produces: `Settings` renders a heading "Settings" and 5 toggle rows (`role="switch"`), defaults: "Auto-apply memories" on, "Record new memories while editing" on, "Show memory markers in timeline" on, "Notify when new pattern detected" off, "Share memory data to improve AI" off; plus two buttons "Export my memory data" (outlined style) and "Reset all memories" (red outlined style). No persistence — state is local only, reset on reload (matches Global Constraints: no backend/persistence beyond the onboarding flag).

- [ ] **Step 1: Write failing test for default states and one toggle flip**

```jsx
test('renders correct default toggle states and flips one on click', () => {
  render(<Settings />)
  expect(screen.getByRole('switch', { name: 'Auto-apply memories' })).toHaveAttribute('aria-checked', 'true')
  expect(screen.getByRole('switch', { name: 'Notify when new pattern detected' })).toHaveAttribute('aria-checked', 'false')
  fireEvent.click(screen.getByRole('switch', { name: 'Notify when new pattern detected' }))
  expect(screen.getByRole('switch', { name: 'Notify when new pattern detected' })).toHaveAttribute('aria-checked', 'true')
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd creator-memory && npx vitest run src/components/tabs/Settings.test.jsx`
Expected: FAIL — component doesn't exist

- [ ] **Step 3: Implement `Settings.jsx`** per the Produces interface (each toggle its own `useState`, or one object-of-booleans state).

- [ ] **Step 4: Run test, verify it passes**

Run: `cd creator-memory && npx vitest run src/components/tabs/Settings.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add creator-memory/src/components/tabs/Settings.jsx creator-memory/src/components/tabs/Settings.test.jsx
git commit -m "add Settings tab with toggle rows and data actions"
```

---

### Task 9: Wire real tabs + overlays into App, mobile review-focus coverage, production build

**Files:**
- Modify: `creator-memory/src/App.jsx`
- Modify: `creator-memory/src/App.test.jsx`

**Interfaces:**
- Consumes: `Memory`, `NewProject`, `InEditor`, `Settings` (Tasks 5-8) as the real route elements, replacing Task 2's placeholders; `OnboardingOverlay` (Task 3) and `HelpDrawer` (Task 4) mounted at the `App` root, with `App` holding `const [helpOpen, setHelpOpen] = useState(false)` passed to `Header`'s `onHelpClick` and `HelpDrawer`'s `isOpen`/`onClose`.

- [ ] **Step 1: Update `App.test.jsx`'s Step-8 placeholder assertion** to match the real `Memory` tab's actual "Learned Traits" heading now that it's wired in: re-assert the direct-URL tests from Task 2 Step 8 against the real tabs — `/memory` shows "Learned Traits", `/settings` shows "Settings" heading and not "Learned Traits", and `/` redirects to `/memory` (shows "Learned Traits").

- [ ] **Step 2: Run test, verify it fails** (placeholders no longer match)

Run: `cd creator-memory && npx vitest run src/App.test.jsx`
Expected: FAIL

- [ ] **Step 3: Update `App.jsx`** to import and route to the 4 real tab components, and mount `OnboardingOverlay` + `HelpDrawer` with the state wiring described in Interfaces.

- [ ] **Step 4: Run test, verify it passes**

Run: `cd creator-memory && npx vitest run src/App.test.jsx`
Expected: PASS

- [ ] **Step 5: Write failing test for the Help button opening the drawer end-to-end**

```jsx
test('clicking the header Help button opens the HelpDrawer', () => {
  render(<MemoryRouter><App /></MemoryRouter>)
  fireEvent.click(screen.getByLabelText('Help'))
  expect(screen.getByRole('heading', { name: 'Confidence Threshold' })).toBeInTheDocument()
})
```

- [ ] **Step 6: Run test, verify it fails, then fix wiring until it passes**

Run: `cd creator-memory && npx vitest run src/App.test.jsx`
Expected: FAIL then PASS after wiring is correct

- [ ] **Step 7: Run the full test suite**

Run: `cd creator-memory && npx vitest run`
Expected: all tests PASS

- [ ] **Step 8: Run a production build**

Run: `cd creator-memory && npm run build`
Expected: build succeeds with no errors, `dist/` produced

- [ ] **Step 9: Commit**

```bash
git add creator-memory/src/App.jsx creator-memory/src/App.test.jsx
git commit -m "wire real tabs, onboarding, and help drawer into App"
```

---

### Task 10: Deploy, push branch, open PR

User has explicitly authorized all of the following without further confirmation (portfolio prototype, not a production app).

**Files:** none (operational task only).

- [ ] **Step 1: Deploy to Vercel production**

Run: `cd creator-memory && vercel --prod` (first run links/creates the Vercel project non-interactively if needed, e.g. `vercel --prod --yes`)
Expected: deployment succeeds; capture the printed production URL.

- [ ] **Step 2: Push the `creator-memory` branch**

All Tasks 1-9 commits were made directly on branch `creator-memory` (created before Task 1). Push it to `https://github.com/mmanohar24/assessments`.

Run:
```bash
cd "/Users/manojvenkatesunmanoharan/Desktop/Claude Code Projects/assessments"
git push -u origin creator-memory
```
Expected: branch pushed, visible on GitHub.

- [ ] **Step 3: Open a pull request from `creator-memory` to `main`**

Run: `gh pr create --base main --head creator-memory --title "Add Creator Memory portfolio prototype" --body "<summary of the 9 tasks + live Vercel URL from Step 1>"`
Expected: PR created; capture the PR URL.

- [ ] **Step 4: Report the live Vercel URL and PR URL to the user.**
