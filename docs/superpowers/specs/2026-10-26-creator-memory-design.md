# Creator Memory — Design Spec

**Project: Creator Memory — React + Tailwind + Framer Motion**

**Stack:** React 18, Tailwind CSS (config with custom tokens), Framer Motion, Vite. No backend. Deploy to Vercel.

**What this is:** A product concept prototype showing how an AI video editor (Cardboard) learns a creator's editing style over time and applies those preferences automatically. This is a portfolio/outreach piece — it needs to look and feel like a real product, not a demo.

---

**Design tokens (add to tailwind.config.js):**
```
bg: #0a0a0a
bg1: #111111
bg2: #191919
bg3: #212121
bg4: #2a2a2a
border-subtle: rgba(255,255,255,0.06)
border-md: rgba(255,255,255,0.10)
border-hi: rgba(255,255,255,0.16)
fg: #f2f2f2
fg2: #999999
fg3: #555555
accent: #e8c97a
accent-dim: rgba(232,201,122,0.10)
green: #5ec97a
blue: #7b8fff
radius: 6 / 10 / 16 / 22px
font: Inter (Google Fonts, variable, weights 300/400/500/600)
color-scheme: dark
```

---

**Layout:**
- Fixed left sidebar (240px) with logo, nav links for the 4 tabs, and a user avatar at the bottom
- Sidebar collapses to icon-only on mobile (≤768px), full-width sheet on tap
- Top header bar: page title, a `?` help button, and a notification bell
- Main content area scrolls independently

---

**Tab 1 — Memory:**

Profile bar across the top with 4 stat chips: Videos Analyzed (247), Consistency Score (94%), Avg Confidence (87%), Active Memories (6).

Below that, two columns (60/40 split):

Left: "Learned Traits" heading. Six trait rows, each showing trait name, a horizontal confidence bar, and the percentage. Traits: Pacing 94%, Music 88%, Captions 100%, B-roll 79%, Color Grading 72%, Format 91%. Clicking a row expands it (Framer Motion `AnimatePresence`) to show: last updated date, example description, and a "View examples" button. Only one row open at a time.

Right: "Recent Activity" — 4 timeline items showing what the AI recently learned (e.g., "Noticed consistent 0.3s J-cut on dialog cuts — 12 videos"). Below that: "Auto-Apply Threshold" — a slider set to 85% with a label explaining that traits above this fire automatically.

---

**Tab 2 — New Project:**

A "Start from your style" heading. Five suggestion cards, each with a toggle (on/off), a trait badge (e.g., "Pacing"), and a one-line description. A sticky pill at the top right shows "X of 5 applied" and updates live. A "Create project" button at the bottom.

---

**Tab 3 — In Editor:**

A mock video timeline (non-interactive, visual only) — a dark bar with a playhead and 3 gold diamond markers labeled "Memory". Below the timeline, an annotation card slides in: explains which memory triggered, shows the confidence score, has "Apply" and "Dismiss" buttons.

To the right: a mini AI chat panel. Three pre-written messages alternating between user and AI. Two AI messages contain a `[mem: Pacing]` chip in amber — clickable, opens a small tooltip explaining the memory reference.

---

**Tab 4 — Settings:**

Five toggle rows:
1. Auto-apply memories (on)
2. Record new memories while editing (on)
3. Show memory markers in timeline (on)
4. Notify when new pattern detected (off)
5. Share memory data to improve AI (off)

Below: two buttons — "Export my memory data" (outlined) and "Reset all memories" (red text, outlined).

---

**Onboarding overlay:**
- On first visit, check `localStorage.getItem('cm_onboarded')`. If not set, show a centered modal with backdrop blur.
- 3 steps with Framer Motion slide transition:
  1. "Your editing style, remembered." — explains the concept
  2. "Four views, one workflow." — explains the tabs
  3. "Memory markers guide your edits." — explains the gold dots
- Each step has a visual icon (SVG), heading, 2-sentence description.
- Prev / Next / "Get started" buttons. "Skip" in top right.
- On close, set `localStorage.setItem('cm_onboarded', 'true')`.

---

**Help drawer:**
- The `?` button in the header triggers a right-side drawer (Framer Motion slide from right, backdrop).
- Contents: 4 sections matching the tabs, each with a heading and 2–3 sentences. A 5th section explaining the confidence threshold system.
- Close button top right, click outside closes it.

---

**Animations:**
- Tab switch: `AnimatePresence` with a fade + 8px upward slide (duration 0.2s)
- Trait row expand/collapse: `AnimatePresence` height animation
- Onboarding steps: horizontal slide
- Help drawer: `x: '100%'` to `x: 0`
- Suggestion toggles: spring scale on the thumb

---

**File structure:**
```
src/
  components/
    Sidebar.jsx
    Header.jsx
    OnboardingOverlay.jsx
    HelpDrawer.jsx
    tabs/
      Memory.jsx
      NewProject.jsx
      InEditor.jsx
      Settings.jsx
  App.jsx
  main.jsx
  index.css
tailwind.config.js
vite.config.js
```

---

**Deploy:** Include a `vercel.json` with SPA rewrites so direct URLs work. After build, run `vercel --prod`.

---

## Decisions confirmed by user (supersede earlier builder guesses)

- **Routing:** `react-router-dom` with real routes `/memory`, `/new-project`, `/in-editor`, `/settings`. The index route `/` redirects to `/memory`. Tab switch animation applies per-route via `AnimatePresence mode="wait"` keyed on location.
- **State:** No backend, so all tab/toggle/slider state is local component state (`useState`), not persisted across reloads except the onboarding flag (explicitly specified to use `localStorage`).
- **Project location:** New sibling top-level directory `creator-memory/` in this multi-project repo, matching the pattern of other standalone prototypes in the repo (e.g. `restaurant-command-center-main/`).
- **Production deploy:** User explicitly authorized running `vercel --prod` automatically at the end of the build (portfolio prototype, no confirmation needed), then pushing to a new branch `creator-memory` on `https://github.com/mmanohar24/assessments` and opening a PR from that branch to `main`.
