# VPL mode

A working mode for Appetiser VPLs in Claude Code. You do the thinking that needs a designer and approve the result. Claude does the rest end to end: reading the project, checking the Figma file, building, and checking its own work before you see it.

## Install
You need Claude Code. No GitHub account needed.

In Terminal:

```bash
claude plugin install vpl-mode --marketplace clardg/vpl-mode
```

Or inside Claude Code: `/plugin install vpl-mode --marketplace clardg/vpl-mode`. Then restart Claude Code.

**Updates:** run `claude plugin update vpl-mode@appetiser-vpl`, or turn on auto-update for the `appetiser-vpl` marketplace in `/plugin` so new versions arrive on their own.

**Also connect:** the Figma plugin for Claude Code (signed in to Figma), and the ClickUp and Slack connectors if you want ticket comments and Slack drafts.

## First run
Say "VPL mode". The first time, Claude asks for the blanks in your profile (`~/.claude/vpl-profile.md`): your name, where you keep project notes, and your taste and voice preferences.

## What's in it
| Part | What it does | Say |
|---|---|---|
| **vpl-mode** | Reads your profile and the project's notes, works out the project phase and what's in scope, and sends the task to the right skill. Sets what Claude does alone, what needs your OK, and what it only drafts | "VPL mode" |
| **vpl-design-audit** | Checks a HiFi page is complete enough to build: main flows, roadmap coverage, missing flows and states, annotations, variables, components. Read-only | "design audit for <project>", "what's missing" |
| **app-store-artwork** | App Store and Google Play screenshots in Figma, on a new page, from your reference | "App Store artwork for <project>" |
| **Takeover playbook** | Taking a project over from the product designer. Early, not tested on a real project yet | "I'm taking over <project>" |
| **Figma checks** | Read-only scripts Claude runs before showing you anything: lint (variables, styles, overlaps, leftovers from copied screens), flow (dead ends, unreachable screens), audit (component use, annotations), artwork (sizes, grid, stretched screens) | Runs on its own |
| **Font bridge** | Lets Claude edit text in fonts that are only on your Mac | "set up the font bridge" |

## What to give Claude
- **Any task:** the Figma link and the ClickUp ticket. Claude reads the project notes before asking you anything.
- **Design audit:** the HiFi page link and roadmap access, or say where the requirements live.
- **App Store artwork:** the project's Figma file, a reference (a Figma link, screenshot, App Store listing or anything the client sent), the request, the screens to feature if the client chose them, App Store or Google Play or both, and whether there's a Watch app. Claude asks for whatever's missing in one message.

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
