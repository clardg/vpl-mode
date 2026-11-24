---
name: vpl-design-audit
description: Design audit of a client project's HiFi Figma page, run when a project is handed over to the VPL or at MVP to find what's missing before development needs it. Checks that every main flow is designed end to end, every roadmap requirement is in the design, missing flows, missing states (empty, error, loading, edge cases), annotations, components bound to variables, and screens built from the file's components. Read-only, reports and proposes. Use for "design audit", "audit the HiFi", "what's missing", "check for missing screens", "MVP coverage", "new project handed over to us". Not the end-of-project audit of a built app against Figma (that's app-visual-audit).
---

# VPL design audit

Is the design complete enough to build? Part of vpl-mode. Read-only: never edit the HiFi page. Building what's missing goes through `figma-rounds` after the VPL approves.

## Before starting
Run vpl-mode's "Start here": the profile, the project context file, the phase, and the principles. The phase decides what counts as missing and what is out of scope.

Scripts live in vpl-mode's scripts folder: [figma-audit.js](../../scripts/figma-audit.js), [figma-flow.js](../../scripts/figma-flow.js), [figma-lint.js](../../scripts/figma-lint.js). Each is read-only. Paste it into `use_figma` with its constants set.

## 1. Requirements
Build the list the design is checked against, from the roadmap first, then tickets, calls, and any prototype. Each requirement gets its source and whether the phase covers it.

Mark the **main flows**: the ones the roadmap calls core or MVP. If it doesn't say, take the path to the app's core value (sign up, the core action, its result, getting paid if it charges) and mark the choice as inferred.

No roadmap access: say so, work from the other sources, and draft the access request to the PM.

## 2. Inventory
1. `create_session` for the file. List each section's screen names and ids with a short read-only `use_figma` call. On a HiFi page that's far smaller than `get_metadata`.
2. Run `figma-audit.js` with `PAGE` set to the HiFi page. It returns sections with screen counts, component roots, and findings for hand-built component copies, loose icons, deleted components, and annotations.
3. Screen names are often wrong (one file had twenty unrelated screens called "01 Add To-Do"). Settle a state from the screen's visible text, read through `use_figma`, or from `get_screenshot`. Don't conclude a state is missing from a name alone.

## 3. Main flows
Walk each main flow step by step against the screens. A main flow is done when every step has a screen, its errors and empty states are covered, and the prototype carries you from start to finish.

Run `figma-flow.js` with `ROOTS` set to the HiFi sections. A dead end, an unreachable screen, or a link to another page inside a main flow is a gap in that flow, not a prototype nit. Overlays, snackbars, error states, and note cards also show up as dead ends or unreachable. That's expected, so judge only the screens a main flow steps through.

## 4. Roadmap coverage
Map every requirement to the screens that cover it: `present` with a link, `partial` with what's missing, `missing`, or `unsure`. Then the reverse: a flow in the design that no source asks for is a finding too. It may be scope creep or a requirement the VPL doesn't have yet.

## 5. Missing flows
Flows a requirement implies but nobody listed:
- The other half of an action: edit and delete what you create, undo, cancel a booking, unsubscribe.
- Baseplate: sign-up, OTP, password reset, account settings, delete account, sign out.
- Each user role, signed-out, and an expired subscription or session.
- Notifications the app sends and where each one lands.

## 6. Missing states
Check each flow against the states that apply to it:

| State | Look for |
|---|---|
| Empty | No data yet, no results, cleared filter |
| First-run | Onboarding, first use of a feature, permission prompts |
| Loading | Skeleton or progress where the wait is noticeable |
| Error | Validation on each input, network failure, failed payment or upload |
| Offline | Only if the app can be used without a connection |
| Success | Confirmation, snackbar, next step |
| Destructive | Confirmation modal for delete, cancel, leave, sign out |
| Limits | Long names, long lists, max selections, zero and plural counts |
| Navigation | Back and close from every screen, deep-link entry if used |

Mark each `present` with a link, `missing`, `not applicable` with a reason, or `unsure`. A screen reached only through a link to an old or exploration page counts as `stranded`, even though it exists.

## 7. Annotations
From `figma-audit.js`, list the screens without annotations, then judge which need them: behaviour a static screen can't show, such as gestures, conditional logic, validation rules, timers, animation, sorting, and what happens after an action. A screen whose behaviour is obvious doesn't need one. Report sections with no annotations at all as one finding.

## 8. Design system
- **Components bound to variables:** run `figma-lint.js` with `ROOTS` set to `componentRoots` from `figma-audit.js`, which leaves out deleted components and reports them itself. Every `fail` there is a component that will spread unbound values to every screen using it. Unbound fills inside illustrations, logos, and iOS system parts are expected, so say so rather than counting them.
- **Screens bound to variables:** run `figma-lint.js` with `ROOTS` set to the HiFi sections. Report counts per rule and the worst sections, not every layer.
- **Built from components:** `figma-audit.js` flags frames named like a component that aren't instances of it, and small vector drawings that aren't icon instances. Screenshot a sample to confirm before reporting, since both checks go by name and shape. `figma-lint.js` flags detached instances.

Raise a repeated system issue once, with its count and where it clusters.

## 9. Sort and rank
- **Blocker:** a main flow incomplete or broken, or a roadmap requirement with no design.
- **Add:** clearly needed and in scope. A missing flow, state, or annotation.
- **Ask:** depends on behaviour no source settles. Draft the question and name who answers.
- **Out of scope:** not allowed in this phase. Record it, don't propose building it.
- **System:** variable binding and component fixes.

Rank by what blocks development first. Don't invent features, count visual polish as a gap, or list the same missing state per screen.

## 10. Save
Write the result to the project context file under `## Design audit`, dated, with the counts by category and every finding's link. A later audit compares against it and reports what changed.

## Reply
Lead with the verdict in one line: ready to build, or how many blockers. Then counts by category, the blockers and top gaps with links, the system summary in a few lines, questions ready to paste, and the one decision needed with your recommendation. Say what you couldn't check, such as no roadmap access or a page too big to screenshot fully. Offer to build the Add list through `figma-rounds`.
