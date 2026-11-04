# Fix my meal (independent design concept)

Fix a meal logged from a photo in plain words, using rotis, katoris and ladles.
Not made by or affiliated with Healthify. Demo data only. No accounts, no tracking, nothing stored.

- `index.html`: the whole app. All numbers live in the `ITEMS` object.
- Routes: `#/` (photo result), `#/fix` (plain-words box), `#/updated` (numbers change), `#/next` (remembered next time).
- The "understanding" is a small rule-based reader in `parseFix`. There is no AI model and no network call.
- `fonts/`: self-hosted Anek Latin by Ek Type (SIL Open Font License, see `fonts/OFL.txt`).

## Deploy
Static site with no build step. From this folder: `vercel`, then `vercel --prod`.

## Checks
With `playwright` and `axe-core` on `NODE_PATH`, and the folder served at port 4174:

    python3 -m http.server 4174
    node tests/checks.cjs

Runs in the installed Google Chrome at 390px, 320px and 1440px. Screenshots go to `tests/screenshots/`. Nothing in `tests/` is deployed.
