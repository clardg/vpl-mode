---
name: app-store-artwork
description: Build App Store and Google Play artwork (store screenshots and the Play feature graphic) for a client app in Figma from the client's request and the designer's reference artwork. Covers headlines, on-brand layouts, real device mockups, and every required size, on a new page in the project's file. Part of vpl-mode. Use for "appstore artwork", "App Store screenshots", "Play Store screenshots", "feature graphic", "ASO screenshots", "/aso-figma-screenshots", "artwork for <project>", or when someone shares a client artwork request.
---

# App Store artwork

A request lands every few weeks, and the same corrections came up every time. This skill builds the whole set to that standard and asks **once**. Part of vpl-mode.

Load first: vpl-mode's "Start here" (profile, project context file, phase, principles), `figma:figma-use`, and the taste gate named in the profile. Read `references/` when you need sizes, mockup insets, copy patterns or past sets.

## 1. What the designer gives you
Always start by checking these. Show the designer this list with what's already found ticked, and ask only for what's missing, in one message:

```
For the App Store artwork I need:
1. The project's Figma file link. I'll add a new page there for the artwork.
2. Your reference artwork. Anything works: a Figma link, a screenshot, an App Store
   listing, a site like screensdesign.com, or something the client sent.
   No reference? Pick one of our approved sets below, or say "no reference".
3. The request: ClickUp ticket or client form link.
4. Screens to feature, in order, if the client chose them.
5. Any copy the client gave, and brand notes.
6. Which stores: App Store, Google Play, or both?
7. Is there an Apple Watch app? (adds a Watch set)
```
Under the list, show the sets in `references/templates.md` as links, each with one line on what it's good for.

Find these yourself, don't ask:
- **The HiFi page:** from the project context file or registry, else the page named HiFi in the file. If it's ambiguous, add it to the list above.
- **Brand:** text styles, colour variables, and textures or accents from the app's own screens.
- **Voice:** the `voice:` line in the project context file. If there isn't one, read the app's own copy, propose a voice in the approval card, and write it back once approved.

The reference is **read-only**. Never edit it, even if it's in the same file.

## 2. One approval card
Show this, then wait for a single yes or edits:
```
<Project> App Store artwork
Page: new page "App Store Artwork" in <file>
Reference: <link> (<what you'll keep: grid, type scale, mockup, accents>)
Screens (in swipe order): 1 <intro/logo?> · 2 <screen> · 3 … (client-requested marked ★)
Headlines (≤2 lines, ≤28 chars/line):  1 "…"  2 "…"  …   [sub-lines if any]
Look: background <token/hex>, <texture/accent from the app>
Sizes: 6.9" 1290×2796 · 6.5" 1242×2688 · 5.5" 1242×2208 <+ Watch if any>
       <Google Play: phone 1080×1920 + feature graphic 1024×500, if asked>
```
If the HiFi screens you picked show something that contradicts a project decision (the wrong courier, an old price), flag it in the card instead of putting it in the artwork unchanged.

Headlines follow the project's voice. Lead with the outcome. **Never claim what the product can't guarantee** (one client's "one tap, you're checked in" had to be pulled because it depended on partner studios), and no feature the build doesn't have. Patterns are in `references/aso-copy-patterns.md`.

## 3. Build (after the yes)
1. **Always create a new page** in the project's file: "App Store Artwork", or "App Store Artwork · <date>" if that name is taken. Never draw on an existing page. Use one row per size: a 6.9" row, then 6.5", then 5.5". Name frames `01-<slug>-6.9`.
2. **Follow the reference.**
   - **Same Figma file:** duplicate its frames onto the new page and swap screens, copy and colours.
   - **Another Figma file:** measure its grid, type scale and mockup treatment and rebuild them on the new page.
   - **An image, listing or website** (another company's app, or something the client sent): study the layout, hierarchy, type treatment and mockup style, then rebuild them with the project's own fonts, colours and screens. Take the ideas, never the assets: don't copy their imagery, illustrations or wording. If it's a store listing or website you can't open, ask for screenshots. Say in the approval card what you're taking from it.
   - **No reference:** start from the proven grid below.

   Use a device mockup from a published library if one exists. Otherwise, ask the designer to paste one onto the new page, and keep going on the rest meanwhile.
3. **Name the parts** in every frame, so the checks can measure them: `Headline`, `Subheadline`, `Device`, `Screen` (the app screen inside the device), `Breakout`, `Background`.
   Check the project's own onboarding or walkthrough screens first: they often already have a photographic phone mockup to reuse. Hide its screen image and put the real HiFi screen underneath the bezel.
4. Build the full **6.9" set first**. Put real screens from the HiFi into a **real device mockup** that's photographic, not stretched, never a plain black border. Place the screen by the insets in `references/device-mockup-specs.md` and never distort it.
5. **Brand-true look:** the background comes from the app's palette (not white, not a colour that clashes with the UI). Borrow the app's own textures or accents (headline textures, handwritten underlines and arrows) instead of inventing decoration. Fonts come from the file's text styles. Keep headlines to 2 lines max, sized for thumbnail reading. Keep the logo on an intro frame small.
6. **Checks before showing:**
   - Run [figma-artwork.js](../../scripts/figma-artwork.js) with `ROOTS` set to the new page. It checks frame sizes, naming, one row per size, the same grid in every frame, equal side margins, stretched screens, headline lines, breakouts, export settings and background.
   - Run `figma-lint.js` on the same page for text styles, colour variables and overlaps, with `BASELINE` set to the HiFi screens you used. Scaling a screen into the device unbinds some of its spacing and text styles, and images and mockups show as unbound colours. Judge only findings outside `Screen`, and say the rest come from scaling.
   - Artwork headlines are bigger than any app text style. Bind their font family and weight to the file's font variables instead, if it has them.
   - Fix every `fail`. Fix each `warn` or say why it stays. Then `get_screenshot` the row and look at it.
7. Show the 6.9" row with a link. Designers often refine spacing by hand at this point, so **read their edited frames before making the other sizes** and carry the changes over.
8. **Other sizes:** recompose 6.5" and 5.5" from the final 6.9", re-spacing rather than scaling. 5.5" is shorter, so tighten the gap between headline and phone. Add a Watch set only if the app ships a Watch app. For Google Play, add a `-play` row and one `-feature` graphic, following `references/google-play-specs.md`: an Android mockup or none (never an iPhone), and no Apple-only features in the copy. Run the checks again on the full page.
9. Export settings: PNG, 1x, sRGB, no transparency. Report the frame links per row, plus the upload-slot guide from `references/apple-specs-2026.md`.

**Proven 6.9" grid** (measured from an approved set, 1290×2796). Use it when there's no reference:
- Full-bleed texture or background layer taken from the app's own header image.
- Copy block at x 90, y 180, width 1110 (90px side margins): headline (~272px tall for 2 lines), a 28px gap, then a sub-headline (~77px).
- Device 940×1975 at x 175, y 736, with the screen inset 26px on each side. The device starts about 180px below the copy and leaves about 85px at the bottom.
- Breakout: a real UI piece from the same flow (e.g. a filter sheet, ~656px wide) overlapping the device edge to show the feature in action. One or two per frame at most.

## Sizes
- **iPhone 6.9":** 1290×2796 is the team default. 1320×2868 is also accepted; keep whichever the project or reference already uses. **6.5":** 1242×2688. **5.5":** 1242×2208.
- **Google Play:** phone 1080×1920 (`-play`), 2 to 8 of them, plus a feature graphic 1024×500 (`-feature`). See `references/google-play-specs.md`, and check the Play Console's current requirements before exporting.
- **Apple Watch:** a separate upload set. The iPhone set must still show real iPhone UI (Guideline 2.3.3), because Watch-only iPhone screenshots get rejected. Watch sizes depend on the model. **Check Apple's current screenshot spec page before exporting**, because community sources have been wrong before.

## When the client changes copy
Change only the named frame's copy across all three sizes, keeping the line count. If they call a line redundant, give 3 replacements that keep the rest of the headline.

## Hand-off
When the designer approves, follow vpl-mode's autonomy rules: one approval card for the ticket status and a comment with the artwork page link, and a Slack draft to the PM that the designer sends. If the profile names a hand-off or voice skill, use it.

## After the client approves
Add the set to `references/templates.md` with a short description instead of the client's name (the repo is public), its link, sizes and what it's good for, so the next designer has more references to choose from.
