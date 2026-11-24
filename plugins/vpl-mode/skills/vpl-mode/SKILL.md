---
name: vpl-mode
description: Working mode for Appetiser Visual Product Leads (VPLs). Sets the standards, project-phase scope rules, and routing for product design work on client apps: taking over a project, design audits for missing flows, screens and states, Figma rounds, visual audits, App Store artwork, landing pages, client handover, and hand-off for review. Use for /vpl-mode, "VPL mode", or when someone starts VPL work on a client project and wants the full process applied.
---

# VPL mode

The VPL does the thinking that needs a human and approves the result. Claude does the rest end to end.

## Start here
1. Read `~/.claude/vpl-profile.md`. It says who this VPL is, where project facts live, and which taste and voice skills to load. If it's missing, copy `templates/vpl-profile.md` there, ask only for the blanks, and continue.
2. Read the project's context file before asking anything. Its facts are not the VPL's job to restate.
3. Find the project's phase (below) in the context file or ticket. If it isn't recorded, ask once and write it back.
4. Read [principles.md](principles.md). They apply to every playbook.
5. Match the task to a playbook and follow it.

## Project phase sets the scope

| Phase | Work allowed | Stop and flag |
|---|---|---|
| Momentum / UX Engineering | Lo-fi, hi-fi, branding, pitch deck | Normally the product designer's stage. Check that the VPL is meant to be doing this |
| MVP | Missing screens, empty states, errors, edge cases, secondary flows | A feature outside the agreed roadmap: consult the PM and PdM first |
| Post MVP | Features agreed from the backlog with the PM | Anything not prioritised with the PM |
| Support & Traction | Minimal design updates approved by the PM | Any new feature or significant flow change |

A flag is a short note with the source, then a drafted question to the PM. Don't build out-of-scope work on the assumption it will be approved.

## Playbooks

| Task | Use |
|---|---|
| New project from the product designer | [playbooks/takeover.md](playbooks/takeover.md) |
| Design audit: main flows, roadmap coverage, missing flows and states, annotations, variables, components | `vpl-design-audit` ([vpl-design-audit/SKILL.md](../vpl-design-audit/SKILL.md)) |
| Tickets, what's due, status changes | `clickup-triage` |
| Figma requests, revisions, comments, responsive, CMS | `figma-rounds` |
| Visual audit against a build | `app-visual-audit` ([app-visual-audit/SKILL.md](../app-visual-audit/SKILL.md)) |
| App Store screenshots | `app-store-artwork` ([app-store-artwork/SKILL.md](../app-store-artwork/SKILL.md)) |
| Landing page | `landing-page` |
| Microcopy | `microcopy` |
| Lost on a project, decision lookup, recording summary | `project-brief` |
| End-of-project client file | `figma-handover` |
| Work approved, ready for the PM | `close-the-loop` |

A task no playbook covers: apply the principles, state your approach in one line, and proceed. Skills in this table that aren't in the vpl-mode package may not be installed for every VPL. If one is missing, do the task with the principles, the autonomy rules, and the Figma checks below.

**Local fonts:** if the file's fonts can't be loaded through the Figma MCP, edit through the font bridge at `~/.vpl-mode/figma-local-bridge/` (see [its README](../../tools/figma-local-bridge/README.md)). If it isn't set up, offer to run `../../tools/figma-local-bridge/install.sh` (relative to this skill's folder) after the VPL says yes, and keep doing read-only work meanwhile. A VPL may have their own bridge on port 7337 already; the installer then stops without changing anything, so use theirs.

## Tickets
The assigned VPL is accountable for the ticket's project name, priority, start and due dates, time estimate, and type. Before starting a ticket:
- List any missing fields with a proposed value, in the approval card.
- If the request lacks a description, context, or expected behaviour, draft the question to the requester instead of guessing.
- Offer to start the ClickUp timer. The handbook requires it before work begins.

## Autonomy
**Just do:** reads, research, work on duplicates or new sections, internal iterations, and context-file updates.

**One approval card, then do:** ticket status, ticket comments, time tracking, and anything else other people will see in a shared tool.

**Draft only, the VPL presses send:** Slack, email, and Figma comments.

**Never:** edit approved pages unless told to for this task, give a client edit access to a working file, or delete work.

## Checks before showing Figma work
1. Run [figma-lint.js](../../scripts/figma-lint.js) through `use_figma` on every new or changed frame or section. Set `ROOTS` to the new work. When it was duplicated, set `BASELINE` to the sections it came from and `LEFTOVERS` to words from the source that mustn't survive, such as the old state or sample person. Fix every `fail` and fix each `warn` or say why it stays. Report the `inherited` counts in one line, since they came with the source.
2. Run [figma-flow.js](../../scripts/figma-flow.js) on the same `ROOTS`. Fix every `fail`. Link every dead end or unreachable screen, or say why it stays that way.
3. `get_screenshot` each changed frame and look at it.
4. Run the taste gate named in the profile.
5. End with a clickable link for each section or frame.

## Reply style
Brief and copy-pasteable. No em dashes. Lead with what's ready, then links, then the one decision needed with your recommendation. Report what you couldn't check.

## When a lesson repeats
When the VPL corrects the same thing twice, add it to the lint if a script can catch it, otherwise to the playbook or skill it belongs in. Team process goes here. Personal taste goes in the VPL's own taste skill.
