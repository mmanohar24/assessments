# Phonely home page: redesign concept

Design concept by Manoj Venkatesun Manoharan. Not affiliated with Phonely.

A redesign of the phonely.ai home page, informed by a private audit of the live page (not published). It keeps Phonely's type (Geist), the warm off-white palette and the deep purple, and keeps the original section order. The idea is "the call is the demo": the hero orb plays a scripted sample call with a live transcript, "What I heard" chips, and a summary card at the end.

Open `index.html` in a browser. There is no build step and no backend. Only `index.html`, `og.png` and `audio/` are deployed (see `.vercelignore`).

## Decisions applied

- **Book a demo stays in the concept.** Every "Book a demo" button scrolls to this page's closing CTA section. That section's own button explains that this is a concept, with no form. The footer has one small "Original page" link to phonely.ai.
- **Facts:** only ones that appear consistently on the live page.
  - The FAQ uses Phonely's live security wording: SOC 2, HIPAA and GDPR. The hero still shows the hero's own list, which also names CCPA and PCI.
  - "100+ languages", "1,000+ voices" and the live logo-strip names are restored.
  - One cost figure: 72%, from Etech Global Services.
  - Not used: 70%+, 74%, the "15,000 calls a day" credit and the quote that contains it, and "Respond in any language".
- **Alma has its own section** after the logo strip: 182 ms to first token against 490 ms for GPT-4.1, as published by Phonely.
- **No personal data or brand assets:** there are no video thumbnails, photos, logos or illustrations. Logos are dashed text placeholders, avatars are initials, and product screens are placeholder UI.
- **Accessibility and motion:**
  - Reduced motion is supported.
  - The orb label is always visible.
  - The mobile menu's "Book a demo" fits on one line.
  - The FAQ uses native `<details>`, so it opens from the keyboard.
  - Tabs have visible focus rings.
  - All text meets WCAG AA.
  - There's a skip-to-content link and a `<footer>` element.
  - Tap targets are 44 px on mobile.
  - Tab state is kept in the URL.
  - A link preview image (`og.png`) is set.

## The sample call

"Watch a sample call: Sound on, no microphone." A scripted call to a fictional business, Harbor Street. The caller books an appointment, and the agent uses a neutral greeting. Nothing records the visitor, and nothing calls Phonely's API.

The 9 lines are voiced with ElevenLabs: Sarah is the agent and Chris is the caller. Both are standard voices, because the free plan can't use library voices through the API. Each line is a short MP3 in `audio/`.

The transcript reveals each word at its real timestamp, and the orb reacts while someone is speaking. Controls:
- **Mute** silences the audio and leaves the captions running.
- **Skip to summary** jumps to the end, and the play button ends the call early.
- If audio can't play, the call continues as text and says "showing the transcript only".
- If the call ends while the demo is off-screen, a "Call ended" toast appears.

### Regenerating the audio

1. Put a key in `.env.local` as `ELEVENLABS_API_KEY=…`. Git and Vercel both ignore that file. The key needs Text to Speech access; Voices: Read is optional.
2. Edit `LINES` or `VOICES` in `scripts/generate-audio.mjs`. Keep `LINES` identical to `SCRIPT` in `index.html`.
3. Run `node scripts/generate-audio.mjs --check` to check the voices and character count. This costs no credits.
4. Run `node scripts/generate-audio.mjs` to generate. This costs about 440 credits. It writes the MP3s and `audio/lines.json`, and refreshes the timings embedded in `index.html`.

To use the library voices Katie and Trevor, upgrade the ElevenLabs plan, swap their IDs into `VOICES` (they're in a comment there), and rerun.

Free-plan ElevenLabs audio may need attribution and may not cover commercial use. The demo footer credits ElevenLabs. Check their current terms before using this anywhere commercial.

## Tests

The tests need Playwright and Google Chrome. Point `NODE_PATH` at a folder where Playwright is installed:

```sh
NODE_PATH=<folder with playwright>/node_modules node tests/checks.cjs   # 1440 and 375: call flows, keyboard, focus, menu, tap targets, reduced motion, contrast
NODE_PATH=<folder with playwright>/node_modules node tests/shots.cjs    # full-page screenshots into tests/screenshots/
NODE_PATH=<folder with playwright>/node_modules node tests/og.cjs       # re-renders og.png from og.html
```

`?demo=fast` runs the sample call about 6 times faster. The tests use it.

## Not tested

- Real phones (iOS Safari, Android Chrome) and real touch.
- Screen readers. The live regions and labels are in place but haven't been listened to.
- Browsers other than desktop Chrome.
- Ultra-wide screens beyond a quick look, and zoom levels.
