# Problems I hid in the demo page

I built the Pulse page with these problems on purpose, so I could see how many the critic would catch. I kept this file out of the agents' folder while testing, so they couldn't peek.

In my test run the critic found 15 of these 16. The only one it missed was #15.

| # | Problem | Where | Type |
|---|-------|-------|------|
| 1 | No doctype, no language set, no mobile viewport tag, and the page is a fixed 1100px wide, so it breaks on phones | top of index.html, `.page` | Mobile / accessibility |
| 2 | Focus outlines are turned off for everything (`*:focus { outline: none }`), so keyboard users can't see where they are | styles.css | Accessibility |
| 3 | Light gray text is too hard to read (#b5b5b5, #aaa, #999, #bbb and #ccc on white) | `.sub`, `.meta`, `.nav-links a`, `.terms`, `.footer` | Accessibility |
| 4 | The orange is too light for small text (#ff6a3d is about 2.9 to 1 on white) | `.spots`, `.btn-secondary`, white text on `.btn-primary` | Accessibility |
| 5 | Form fields have no labels, only placeholder text, and the placeholder is very light | checkout fields | Accessibility / usability |
| 6 | Phone and email fields use the wrong input type, and there's no autofill | checkout fields | Usability |
| 7 | The error message is vague ("Something went wrong"), only shown in red, not tied to a field, and screen readers never hear it | `#err` | Accessibility / usability |
| 8 | Three different "Book" buttons: a real button, a link and a div | class cards | Consistency |
| 9 | Divs pretending to be buttons, so you can't reach them with the keyboard | `.btn-fake`, `.icon-btn` | Accessibility |
| 10 | The menu button is only 22 by 22 pixels and has no label | `.icon-btn` | Accessibility |
| 11 | The HIIT class is full, but it still shows a "Reserve" link | HIIT card | Usability |
| 12 | Images have no alt text | card images | Accessibility |
| 13 | Headings jump from h1 straight to h4 | `.section-title` | Accessibility |
| 14 | A "click here" link, which tells you nothing about where it goes | terms | Accessibility |
| 15 | Font sizes and spacing are all over the place (11, 12, 13, 15, 17, 19px) with no system | styles.css | Consistency |
| 16 | The nav and footer are plain divs, so there are no landmarks for screen readers | index.html | Accessibility |
