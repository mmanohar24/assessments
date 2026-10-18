# Restaurant Command Center

Operations dashboard prototype for **Spice Garden**, built for [Explorex](https://explorex.com).

Stack: React · Vite · Tailwind CSS. All restaurant data is hardcoded in `src/data.js` (no backend, API, or auth).

**Live demo:** [https://restaurant-command-center-git-curso-0abacc-mmanohar24s-projects.vercel.app](https://restaurant-command-center-git-curso-0abacc-mmanohar24s-projects.vercel.app)  
**Production alias:** [https://restaurant-command-center-explorex.vercel.app](https://restaurant-command-center-explorex.vercel.app)


## Setup

```bash
npm install
npm run dev
```

## Scripts

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Start Vite dev server    |
| `npm run build`   | Production build         |
| `npm run preview` | Preview production build |
| `npm run lint`    | Run oxlint               |

## Project structure

```
src/
  data.js                 # Hardcoded restaurant / table / order / revenue data
  App.jsx                 # Router
  main.jsx                # Entry point
  index.css               # Tailwind + theme tokens
  components/
    Layout.jsx            # App shell with sidebar + content area
    Sidebar.jsx           # Fixed left nav (Overview / Tables / Orders)
  pages/
    Overview.jsx          # Live overview (placeholder)
    Tables.jsx            # Table map (placeholder)
    Orders.jsx            # Today's orders (placeholder)
```
