# Your Week with WorkHero (design concept)

A mobile-first concept: a calm weekly check-in for a small HVAC owner and their office manager.
Sample data. Not affiliated with WorkHero.

- `index.html`: the whole app. All numbers live in the `DATA` object.
- Routes: `#/` (dashboard), `#/update` (thread sheet), `#/approved/<id>` (confirmation).
- `fonts/`: self-hosted EB Garamond and Figtree, subset (SIL Open Font License).
- `og.html` renders `og.png` through `tests/og.cjs`.

## Checks
With `playwright`, `axe-core`, `lighthouse` and `chrome-launcher` available on `NODE_PATH`:

    node tests/checks.cjs https://workhero-concept.vercel.app/
    node tests/lighthouse.cjs https://workhero-concept.vercel.app/

Screenshots go to `tests/screenshots/cream/`. Real WebKit runs too if `PLAYWRIGHT_BROWSERS_PATH` points at an install. Nothing in `tests/` is deployed.
