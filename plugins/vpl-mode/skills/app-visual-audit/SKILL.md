---
name: app-visual-audit
description: Run a visual audit (QA of a built app against its Figma HiFi designs) end to end, for any project. Claude installs the build on the iOS Simulator or Android emulator, captures every screen itself, measures differences against the HiFi, builds the audit page in Figma (comparison frames, highlights, comment cards, score), and reports. Also works from a folder of phone screenshots or a live web app. Includes a guided first-time setup for new teammates. Use when someone says "visual audit", "audit <project>", "second audit", "/visual-audit", sends a simulator build, .app zip or Android .apk, drops build screenshots to compare against Figma, or asks how to set up visual audits.
---

# App visual audit

The same process for every project. Project-specific things (Figma links, logins, exclusions, scoring changes) live in that project's notes, never in this skill.

| Step | What happens |
|---|---|
| 0 | First-run check: is this Mac set up? If not, walk the person through setup |
| 1 | Project settings: read (or create) the project's `## Visual audit` notes |
| 2 | Capture: install the build on the iOS Simulator or Android emulator and screenshot every screen |
| 3 | Compare and measure against the HiFi |
| 4 | Build the audit page in Figma |
| 5 | Score |
| 6 | Report and hand off |

## 0. First-run check (always run it first)

Run `bash <this skill's folder>/scripts/preflight.sh` (add `--android` when the build is an APK; it then checks the emulator instead of Xcode). It prints a checklist with step numbers from `SETUP.md`. Also confirm Figma is connected by calling the Figma `whoami` tool.

If everything passes, say so in one line and go to step 1.

If anything is missing, **become the setup guide**. Many teammates are not technical, so:
- Read `SETUP.md` and walk them through **one step at a time**, in the order the checklist shows. Never paste the whole guide.
- For each step: say what it is for in one sentence, then exactly what to click or type. Use plain words. No jargon like "runtime", "SDK" or "MCP"; say "the iPhone simulator download" or "the Figma connection".
- Offer to run terminal steps for them (they approve the prompt). Only ask them to do things Claude can't do: App Store installs, logins, clicking in Figma, messaging their devs.
- After each step, wait for them to say done, then re-run the preflight to confirm before moving on.
- Big downloads (Xcode, the simulator) take a while. Tell them roughly how long, and start the next step that doesn't depend on it.
- If they don't have a build yet, give them the paste-ready message in `templates/dev-request.md` and stop there until it arrives.

## 1. Project settings

Find the project's notes file: the project's context file if there is one (where the VPL profile says project notes live, for example `~/Claude/<Project>/CONTEXT.md`, or a `CLAUDE.md`/`CONTEXT.md` in the working folder). If none exists, create `~/Claude/<Project>/visual-audit.md`.

Read its `## Visual audit` block. If it's missing or incomplete, ask **only for what's missing, one question at a time**, then write it back using `templates/project-notes.md` so the next audit needs nothing. The block holds:
- Figma file and HiFi page, the audit page (or "none yet"), the score table
- build type and app id, simulator device name, capture folder
- test login(s) and the verification code bypass, if the devs have one
- **exclusions and scoring overrides** for this project (things the designer said not to flag, or to flag but not deduct). Apply them to every frame, and add to them whenever the designer gives feedback.

First audit on a project: the audit page needs the team comparison template. If the file has none, ask them to copy it in (`SETUP.md` step 7) and wait.

## 2. Capture

Pick the route from what they hand over:

**A. iOS Simulator build (preferred, fully automatic).** A zipped `.app` from the devs. An `.ipa` or TestFlight build cannot run on the Simulator; if that's what they have, send them `templates/dev-request.md`.
1. Unzip into the scratchpad. Check `Info.plist`: `DTPlatformName` must be `iphonesimulator`; note `CFBundleIdentifier` and `MinimumOSVersion`.
2. Use a simulator that matches the HiFi width. Most HiFi files are 375x812, so use **iPhone 13 mini** (`xcrun simctl create "<Project> Audit 13 mini" com.apple.CoreSimulator.SimDeviceType.iPhone-13-mini <iOS runtime>`). Boot it, open the live panel with the simulator tool (`attach`), then `launch` the `.app` so they can watch.
3. Pin the status bar to 9:41 (command in `scripts/capture.sh`). The 13 mini status bar is about 6pt taller than a 375x812 HiFi; treat that offset as the device, not a bug.
4. Go through the app with the simulator tool. Save every screen with `scripts/capture.sh <udid> <capture folder> NN-screen-name` (two-digit order prefix).
5. **Accounts.** Use the project's test login for signed-in flows. Also create a **fresh account through the app's own email sign-up** every audit (never Google/Apple/Facebook sign-in): it's the only way to reach onboarding, first-run prompts and empty states. **If the app only offers Google or Apple sign-in, Claude can't sign in** (it never types third-party credentials). Audit everything before sign-in first, then ask the designer to sign in themselves on the simulator or emulator window with a *test* Google/Apple account (not their personal one), or ask the devs for a dev-build login. On the Android emulator, tapping "Continue with Google" with no account opens Android's add-account flow: that's where the designer signs in. If Google sign-in then fails with a generic error and `adb logcat -d | grep -i 'Developer console'` shows `[28444] Developer console is not set up correctly` (or `ApiException: 10`), the build's signing certificate isn't registered for Google sign-in. Only the devs can fix it: send them the SHA-1 from `python3 -I scripts/apk_cert.py <apk>` and the package id, to add in Firebase or Google Cloud, then ask for a new build or retry. If sign-up needs an emailed code, use the bypass in the project notes (ask the devs for one if there isn't; many staging builds accept 00000). Record any account Claude creates in the project notes. **Production builds** (they point at the live API, for example `api.<brand>.com` instead of a dev or staging host): Claude never creates accounts or signs in there. Real users share that database, and on social or dating apps a test profile can show up to them. Audit everything before sign-in, then the designer signs in on the emulator window with an account the client or devs set aside for QA, and Claude carries on from the signed-in app. Find the API host with `unzip -p <apk> 'classes*.dex' | strings | grep -Eo 'https://api[^"/ ]+'`.
6. Reset between accounts: `xcrun simctl uninstall <udid> <app id>`, then launch the `.app` again.
7. Simulator quirks: typed text is dropped if the field isn't focused yet, and input can lag. Tap the field, type, wait about 2 seconds, screenshot, then tap Continue. Dismiss iOS tips and permission prompts as you meet them.
8. Optional repeat runs: once Maestro is set up (`SETUP.md` step 9), save the route as a flow (`templates/maestro-flow.yaml`) in the project's audit folder so the next build is captured in one command. Test it on a freshly erased simulator before relying on it.

**B. Folder of phone screenshots** (TestFlight, Firebase or any device). Put them in the capture folder and order them with `python3 <this skill's folder>/scripts/order_screens.py <folder>`; it sorts by capture time and tags iOS, Android and simulator files. Run iOS and Android as separate audits.

**C. Web app.** Capture the live page in the browser (see `references/method.md`, "Web capture").

**D. Android APK on the emulator (fully automatic).** A plain `.apk` from the devs (staging or debug). A Play Store `.aab` won't install; ask for an APK (`templates/dev-request.md`, Android section). Everything goes through `scripts/android.sh` (call it `A` below), which works in dp, so positions read straight against the HiFi.
1. Copy the APK into the project's audit folder and run `A apk-info <apk>`. It must say "OK on this Mac" (arm64-v8a, universal, or no native code). `A install` prints the package id; note it.
2. `A create` (once per Mac) makes **Audit_375**: 375x812dp at 3x, the same size as the team template's Android slot. If the project's HiFi uses another width (for example 360x800), make a second phone and note it in the project notes. Captures come out 1126x2436px (the emulator rounds the width to an even number); scale to 375pt wide before measuring, the 1px is not a bug.
3. `A boot`. The emulator opens in its own window on the Mac, so tell the designer they can watch it there (the simulator panel in the app is iOS only). Then `A install <apk>`, `A statusbar`, `A launch <package>`.
   **Splash:** most apps show Android's own splash (app icon on a plain background) and then their designed splash, often fading in. Capture it with `A burst <folder> 01-splash` right after `launch`, check the frames, and audit the designed splash, not the system one. Frames are numbered 01 to 10 in capture order; the splash is often only frame 02 or 03.
4. To move through the app: `A ui` lists buttons, fields and text with tap centres in dp; `A tap x y`, `A text "..."`, `A key back|enter`, `A swipe`. Read the screenshot when `A ui` is thin (Flutter apps expose little). Save every screen with `A shot <capture folder> NN-screen-name`. Empty a field with `A clear` (deleting with `A key del` starts wherever the cursor is). To read captures yourself, render them small: `python3 scripts/look.py <out.png> <capture>...` (375 wide, side by side), then read the out file.
5. **If a button does nothing, check the server before blaming the app:** `A net` lists the last API calls with status codes (debug builds log them). A 5xx on every call means the dev server is down: capture everything reachable before sign-in, put the blocker in the report, and watch the API in the background (`curl` the API host once a minute) so the signed-in flows can follow if it comes back. If pages show `net::ERR_NAME_NOT_RESOLVED` or nothing loads, the emulator has lost DNS (it happens after the Mac changes networks): `A stop`, then `A boot`; boot now pins DNS to 8.8.8.8 and waits for the network. Web pages in the app (Terms, Privacy) can take 8 seconds or more: wait before the capture. Error toasts and snackbars disappear after a few seconds, so capture right after the tap (or `A burst`) before deciding there is no error state.
6. Accounts and quirks are the same as route A: test login, plus a fresh email sign-up every audit. On a dev server Claude can sign up with a public Mailinator address (`<project>.audit.<mmdd>@mailinator.com`) and read the code at `mailinator.com/v4/public/inboxes.jsp?to=<name>` in the built-in browser; mail takes about a minute. Keep the generated password in a file in the project folder, not in chat. **Paywalls and in-app purchases** need Google Play billing: the Audit_375 image (google_apis) has no Play Store, so plans never load (`BillingClient ... result: 3` in logcat). Capture the paywall as blocked, then ask the devs for an account with a subscription already granted, or set up a Play Store emulator image with a licence-tester account. Tap the field, type, wait about 2 seconds, then screenshot. After opening a new screen wait 3 to 4 seconds: a capture taken mid-transition comes out black, so retake it. Allow or deny Android permission prompts as you meet them; don't flag them (they're system UI).
7. Reset between accounts with `A reset <package>` (wipes app data, keeps the install). Re-run `A statusbar` after a reboot.
8. The Android status bar and navigation bar differ from an iOS-style HiFi. Treat them as the device, not a bug, unless the HiFi has Android-specific frames.
9. `A stop` when done. Maestro flows (step 8 of route A) also run on the emulator.

Before you capture, read the HiFi page for platform-specific frames (for example an "Android Sign Up" frame next to the iOS one) and map Android captures to those first.

Run iOS and Android as separate audits, on separate audit pages or clearly separate sections, using the template's Android comparison frame.

## 3. Compare and measure

Map every capture to its HiFi frame and show the mapping table before building anything. Then compare each pair using `references/method.md`. **Measure, don't eyeball:** pull the HiFi frame with `get_screenshot`, then use `scripts/px.py` (`pair` for a side-by-side with a point ruler, `ink` for text and icon colour on light or dark UI, `box` for the size of a button, field or chip by its colour, `rows` for line height). Read the design values (font, size, line height, colours, boxes) straight from the HiFi frame with a read-only `use_figma` call too; it's faster and exact. Keep a running log in the capture folder: one row per recheck verdict and per new issue, with design vs build values.

## 4. Build the audit page in Figma

**View-only HiFi file.** If the designer can't edit the project file, read the HiFi read-only (`get_screenshot` of each frame at 1x into `<capture folder>/hifi/`, design values from a read-only `use_figma`) and put the findings in a **new Figma file** (`create_new_file`; ask which team if there are several). There is no team template to clone there, so build the page from scratch per `references/figma-builder.md` ("New file, no template"): cover, score card, one section per feature, comparison frames with the HiFi screenshot and build capture as image fills, Inter text.

If every screen you could reach matches, don't build a page with only a cover and a 100 score. Report the match with the measured values and what's still blocked, and build the page once there's something to show.

Follow `references/figma-builder.md`. Standing rules for every project:
- Never edit an earlier audit page. Each audit gets its own page placed right after the previous one ("🔍 Visual Audit N"), with a copied cover and score card.
- One comparison frame per screen: the real HiFi artboard (a copy, never the original) on the left, the build capture on the right, laid out horizontally and grouped into **one section per feature** (match the HiFi page's grouping). Screens from a fresh account go into their normal feature sections.
- **Only show what's wrong.** No frames for screens that match, no "Fixed" or "No comments" cards, no explanation notes. Keep only notes that need someone's decision (scope, intent).
- **Raise an issue once.** If it repeats on other screens, flag it on the first and write "Same on X" in that card.
- **Don't be rigid on sizes.** Skip size or position differences that aren't obvious and don't distract from other components (a few points of card height, a block 10 to 15pt off, a 1 to 2pt icon). Flag colour, line height, missing elements and clearly visible size changes.
- Numbered highlight on both sides, one comment card per number: `Incorrect <thing>. Design: <value>. Build: <value>.` Background-colour issues go in a general card, not a full-screen highlight.
- Never flag text wraps, user-generated or CMS content, or dev-build labels.

**Follow-up audits (2, 3...).** Recheck every issue from the previous audit first. Record Fixed / Partly fixed / Not fixed / Not checked in the log and the report. On the page, only issues that are still open appear: a Not fixed one is titled `# k <Category> · Not fixed (Audit N-1 #j)`. If something can't be checked, say why in the report (for example, the test account has data, so the empty state can't show).

## 5. Score

Use the team rubric in `references/method.md`. One score for the whole audit, each category deducted once. Apply the project's scoring overrides from its notes (for example, a category that's flagged but deducts 0). Fill in the score card and its band colour. Be honest about categories you did not check systematically, so a 0 isn't read as "verified fine".

A score only compares fairly with the previous audit if the same screens were covered. When coverage grew, also give the score for the previous audit's screens only.

## 6. Report and hand off

Short summary: link to the audit page, recheck counts (fixed, partly, not fixed, not checked), the main new issues, the score and band, and open items (screens with no HiFi match, blocked flows, frames that went missing). Save decisions and new exclusions to the project notes. Drafts only: never post Figma comments, ClickUp updates or messages without the designer's yes.

## Files in this skill
- `SETUP.md`: step-by-step setup for a new teammate (Claude walks them through it)
- `references/method.md`: what to compare, how to measure, highlight and card style, scoring rubric, web capture, Figma upload tips
- `references/figma-builder.md`: tested Plugin API code for the audit page and its quirks
- `templates/`: project notes block, message asking devs for a Simulator build, Maestro flow starter
- `scripts/`: `preflight.sh` (`--android` for the Android checks), `capture.sh`, `android.sh` + `android_ui.py` (emulator), `px.py`, `upload.sh`, `order_screens.py`
