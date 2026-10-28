# Marlow Home: shop motion concept

Concept by Manoj Venkatesun Manoharan. Not a real store. Sample products.

A portfolio prototype for a Product Designer (E-Commerce and Motion) role. It shows a mobile shopping flow for an invented home-goods store, with motion that explains state changes, visible edge cases, and accessibility built in. It is a concept, not a shipped product, and it reports no metrics.

Open `index.html` in a browser. There is no build step and no backend. On desktop the app sits in a phone frame with a demo panel beside it. On mobile, open the panel from **Demo panel** at the top.

## What's in it

- **Listing:** room filter, sort, low-stock tags. The filter and sort state lives in the URL.
- **Product page:** a swipeable gallery (also arrows, dots and arrow keys), colour and size selectors, a live stock label, and an Add to bag button that goes idle → loading → added → View bag. The sold-out size is disabled and offers Notify me.
- **Bag sheet:** quantity stepper with a rolling number, remove with a 6-second Undo, a free-delivery bar (threshold ₹2,999), and a promo field. `WELCOME10` works; anything else shows an error.
- **Checkout in 3 steps:** home delivery or store pickup (Indiranagar, Koramangala, HSR Layout, each with its own stock), payment by UPI, card or cash on delivery, then review. The success screen shows an order timeline.
- **Edge cases, shown on screen:** an out-of-stock variant, an item that sells out during checkout (one tap to remove it or switch colour), failed payment (`fail@upi` or the panel), slow network with skeletons, and an empty bag.

## Motion

Tokens: durations of 120, 200 and 320ms, a standard easing for state changes, and an emphasized easing for things arriving. The demo panel's "Why things move" table lists all 10 motions, with what each does, why it exists and how long it takes. The test suite checks that the table's row count matches its caption.

Motion is built with CSS transitions, CSS keyframes and the Web Animations API. When the OS asks for reduced motion, or the panel toggle is on, movement becomes a fade or an instant change. Page changes, toasts, skeletons and hover colours are deliberately not animated.

## Tests

The tests need Playwright and Google Chrome. Playwright is not a dependency of this folder, so point `NODE_PATH` at a folder where it is installed:

```sh
NODE_PATH=<folder with playwright>/node_modules node tests/flows.cjs        # happy path + edge cases at 360, 390, 1280px; reduced motion
NODE_PATH=<folder with playwright>/node_modules node tests/contrast.cjs     # WCAG AA: token pairs + live sweep of visible text
NODE_PATH=<folder with playwright>/node_modules node tests/record-demo.cjs  # demo/happy-path.webm and demo/poster.png
```

`flows.cjs` fails on any console error or horizontal scroll. For the reduced-motion check, it records every animation the page starts and fails if any of them move something. It also confirms that full-motion mode does start those animations, so the check can't pass because the detector is broken. Screenshots go to `tests/screenshots/`, which git ignores.

## Not tested

- Real phones (iOS Safari, Android Chrome), including real touch swipes. Swipes were tested with simulated pointer events.
- Screen readers (VoiceOver, TalkBack, NVDA). The ARIA and live regions are in place but have not been listened to.
- Browsers other than desktop Chrome: no Safari, Firefox or Edge.
- Zoom levels, Windows High Contrast mode, and very long translated text.
