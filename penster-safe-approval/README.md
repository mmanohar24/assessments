# Safe Approval: an independent concept for Penster

A working, mobile-first prototype of a "safe approval" experience for a healthcare marketing app. A doctor signs up, gets a first week of drafted posts, and approves them in minutes. A plain-words safety check flags risky claims (promises of results, "best" claims, patient photos or quotes without consent) and offers a safer rewrite in one tap.

**This is an independent concept. It is not affiliated with or endorsed by Penster.** All clinic data (Smile Studio Dental, Dr. Meera Rao and the posts) is made-up sample data. The safety check is a simple demo of the idea, not legal advice.

Author: Manoj Venkatesun Manoharan

## What is in it

- `index.html`: the whole app in one file (HTML, CSS and vanilla JS). No build step, no backend. Progress is saved in the browser, and there is a "Reset demo" button.
- `tests/contrast.cjs`: checks every text and background colour pair in both themes against WCAG AA.
- `tests/flows.cjs`: Playwright flows for sign-up, approve, edit, rewrite, override, approve all safe, reject, undo, reset and reload, plus screenshots at 360, 390 and 1280px.

## Run it

Open `index.html` in a browser. That is all.

To run the checks:

```sh
node tests/contrast.cjs
NODE_PATH=<folder with playwright installed>/node_modules node tests/flows.cjs
```

The flow tests launch the installed Google Chrome (`channel: 'chrome'`).
