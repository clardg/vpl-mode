# VPL mode

A working mode for Appetiser VPLs in Claude Code. You do the thinking that needs a designer and approve the result. Claude does the rest end to end: reading the project, checking the Figma file, building, and checking its own work before you see it.

## Install
Works in Claude Code: in Terminal, or in the **Code** tab of the Claude desktop app. Not in regular Claude chat. No GitHub account needed.

Open Terminal and paste these one at a time.

1. Install Claude Code (skip this if typing `claude --version` in Terminal already shows a version):

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

2. Install VPL mode:

```bash
claude plugin install vpl-mode --marketplace clardg/vpl-mode
```

Then restart Claude, or the Claude desktop app. The skills show up in both. If step 2 says `command not found`, close Terminal, open a new window and try again.

**Updates:** run `claude plugin update vpl-mode@appetiser-vpl`, or turn on auto-update for the `appetiser-vpl` marketplace in `/plugin` so new versions arrive on their own.

**Also connect:** the Figma plugin for Claude Code (signed in to Figma), and the ClickUp and Slack connectors if you want ticket comments and Slack drafts.

## First run
Say "VPL mode". The first time, Claude asks for the blanks in your profile (`~/.claude/vpl-profile.md`): your name, where you keep project notes, and your taste and voice preferences.

## Skills
Four skills. Say the phrase in Claude Code and the skill takes it from there.

### vpl-mode
The front door. Claude reads your profile and the project's notes, works out the project phase and what's in scope, and sends each task to the right skill. It also sets what Claude does on its own, what needs your OK, and what it only drafts for you. Includes the takeover playbook for projects handed over from the product designer (early, not tested on a real project yet).
**Say:** "VPL mode", "I'm taking over <project>"
**Give it:** the Figma link and the ClickUp ticket.

### vpl-design-audit
Checks a HiFi page is complete enough to build, at handover or MVP. It walks every main flow end to end, maps the roadmap to the screens, and finds missing flows, missing states (empty, error, loading, edge cases), missing annotations, and screens not built from components or variables. Read-only: it reports and proposes, and changes nothing.
**Say:** "design audit for <project>", "what's missing"
**Give it:** the HiFi page link, and the roadmap or wherever the requirements live.

### app-visual-audit
Checks a built app against its Figma HiFi. Claude installs the build on the iOS Simulator or Android emulator, goes through the app and screenshots every screen, measures the differences against the HiFi, then builds the audit page in Figma with comparisons, highlights, comments and a score. Also works from a folder of phone screenshots or a live web app. The first run walks you through setting up your Mac (Xcode, the simulator) step by step.
**Say:** "visual audit for <project>"
**Give it:** a Simulator build (a zipped `.app`) or an Android `.apk` from the devs, and the Figma link. No build yet? It drafts the message asking the devs for one.

### app-store-artwork
App Store and Google Play screenshots in Figma, built on a new page in the project's file from real HiFi screens in a device mockup, with headlines in the project's voice and every required size.
**Say:** "App Store artwork for <project>"
**Give it:** the project's Figma file, a reference (a Figma link, a screenshot, an App Store listing or anything the client sent), the request, the screens to feature if the client chose them, App Store or Google Play or both, and whether there's a Watch app. Claude asks for whatever's missing in one message.

## Also included
- **Figma checks:** read-only scripts Claude runs before showing you anything. They check variables and styles, overlaps, words left over from copied screens, prototype dead ends and unreachable screens, component use, and artwork sizes and grid.
- **Font bridge:** lets Claude edit text in fonts that are installed on your Mac but not in Figma's cloud. Only needed for those projects. Say "set up the font bridge".

## How Claude works with you
- **Just does:** reads, research, work on duplicates or a new page, and notes.
- **Asks once, in one card:** ticket status, ticket comments, anything others will see.
- **Drafts only, you send:** Slack, email, Figma comments.
- **Never:** edits approved pages unless you say so, gives a client edit access, or deletes work.

## Feedback
When you correct Claude on the same thing twice, tell the VPL lead so it becomes a check or a playbook rule for everyone.

## For maintainers
This repo is public. Keep client names, client copy and anything under NDA out of it.

Skills live in `plugins/vpl-mode/skills/`, scripts and their tests in `plugins/vpl-mode/scripts/` (`node <name>.test.mjs`). Push to `main` and the team picks it up on their next update.
