# Audit method

## What to compare (build vs design)

Do separate passes per category; one pass misses things.
- **Colours:** headings, body, labels, placeholders, input values (default vs filled), icons, buttons, backgrounds, header and overlay opacity.
- **Typography:** font family, weight, size (including button labels), line height.
- **Spacing and alignment:** margins, gaps between rows, cards and chips, insets, checkbox-to-label alignment, a bottom that looks too empty.
- **Component sizes:** buttons, inputs, code boxes, chips, tab bars, sheets.
- **Copy:** wording, capitalisation, punctuation (full stops, commas in subheaders), missing or extra helper lines. Read the design text in full.
- **Imagery and icons:** wrong, missing or differently styled icons, stroke weight, illustrations, chevrons, cut-off images or phone mockups.
- **Missing or extra elements:** buttons, tabs, rows, fields, back arrows.
- **States:** default, active, filled, disabled, error, empty.
- **Border radius:** it's its own score category; check it or say you didn't.

Don't flag differences that only come from the device: the status bar height, or a phone wider than the 375pt design. On Android also skip the status bar icons, the gesture bar and the system splash (app icon on a plain background before the app's own splash). A 48pt-tall button where the design has 40pt *is* worth flagging: it's the Material minimum touch target leaking into the visual size, and devs can keep the touch area while matching the design.

When a whole bottom-anchored block (title, subtitle, Skip, dots, Next) sits a uniform 5 to 10pt off the design, it's usually the platform's safe area (iOS home indicator vs Android gesture bar), not a layout bug. Don't flag it unless elements move relative to each other.

Copy: compare apostrophes and quotes. Designs usually use curly ’ and builds often ship straight '. Flag it once (Incorrect Text content) and list the other screens.

## How to measure

Simulator captures from an iPhone 13 mini are 1080x2340, which maps 1:1 to a 375x812 design in points (factor 2.88). Android emulator captures (Audit_375) are 1126x2436, also 375x812 in points (factor 3). Phone screenshots from other devices: convert to the design's points first.

`scripts/px.py` (run without `-I` so Pillow loads), all coordinates in design points:
- `pair <hifi.png> <build.png> <out.png>`: side-by-side at 2x with a point ruler. Look at this first.
- `ink <img> x y w h`: background and text/icon colour in a box (the colour furthest from the background, so it works on dark UI too). Use it for text and icon colours.
- `box <img> x y w h #RRGGBB [tol]`: bounds of that colour inside a region. Use it for button, field, chip and dot sizes and positions.
- `rows <img> x y w h`: text rows and their pitch. Use it for line height (pitch between lines).
- `px <img> x y`: one pixel.

Pull HiFi frames with `get_screenshot` (download the URL with curl) at `maxDimension` = the frame's height, so it comes back at 1x.

## Highlights and comment cards

- For each issue, a numbered highlight on the design side and the build side, same number. Highlight the thing the issue is about (a sheet-level problem highlights the sheet). Build-only problems (extra element) get a highlight on the build side only.
- One comment card per number, titled `# N <Category>`. Body: `Incorrect <thing>. Design: <value>. Build: <value>.` with hex values and sizes. Keep it short and say what's correct. Functional observations, if worth recording at all: `Not a visual bug. <behaviour>.`
- Measure positions again if a frame was scrolled or cropped.

## Scoring rubric (team default)

Start at 100. Each category counts once, however many times it occurs. Subtract:

| Priority | Category | Points |
|---|---|---|
| High | Incorrect Fonts | wrong family on all screens 19, on some screens 12; right family but wrong weight or style 3 |
| High | Incorrect/Missing Imagery (photos, icons not matching or not built; not user content) | 15 |
| High | Missing CTAs (buttons, cells, cards, filters, tabs, text fields) | 15 |
| High | Incorrect Colours | 12 |
| Mid | Incorrect Spacing (margins, paddings, line height) | 10 |
| Mid | Missing Text content | 10 |
| Mid | Component Sizes (buttons, cells, cards, filters, tabs, text fields) | 10 |
| Low | Incorrect Border Radius | 3 |
| Low | Incorrect Text content | 3 |
| Low | Other | 3 |

Bands: 81 to 100 green, 60 to 80 yellow, below 60 red. The team rubric lives in the Visual Audit templates file (`SETUP.md` step 7); if it differs from this table, the file wins.

Map each finding to one category and keep the mapping. When a finding could sit in two, pick one, then tell the designer which way you went and what the score would be the other way. Then apply the project's scoring overrides from its notes.

## Web capture

For web apps, capture the live page in the browser: inject html2canvas from `cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js`, render with an explicit `height` (complex pages time out otherwise), and POST the blob to the Figma upload URL straight from the page. Keep the canvas on `window` between calls; navigation clears it. Compare at the HiFi's width.

## Figma upload tips

- `upload_assets` with `nodeIds` set to the build placeholders, then POST the files with `scripts/upload.sh` (parallel). Success means the response contains `placedOnNodeId`. If it's missing, request a fresh URL and upload again; don't reuse the old one.
- Node ids in tools use a colon (`123:456`); Figma URLs show a hyphen (`123-456`).
- If a Figma call drops mid-run, read the canvas before retrying: it may have finished.
