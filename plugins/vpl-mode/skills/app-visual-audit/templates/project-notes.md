# Project notes: `## Visual audit` block

Claude writes this into the project's notes file (its context file, or `~/Claude/<Project>/visual-audit.md`) and keeps it up to date after every audit and every round of feedback.

```markdown
## Visual audit
- figma file: <link>   · hifi page: <link>
- audit pages: Audit 1 <link> (<date>, <build>) · Audit 2 <link> ...  (never edit earlier pages)
- score table: <link or "on each audit page">
- layout: horizontal, one section per feature (match the HiFi page)
- build: iOS Simulator .app from <dev name>, app id <com.example.app.dev> · android: <.apk from <dev name>, package <com.example.app>, or "screenshots only">
- simulator: "<Project> Audit 13 mini" (iPhone 13 mini, matches 375x812 HiFi) · android emulator: Audit_375 (375x812dp)
- capture folder: ~/Claude/<Project>/audit/<date>-sim/
- test login: <email> / <password>   (given by <name>)
- accounts Claude created: <email> / <password> (<date>)
- verification code bypass: <e.g. 00000, or "none, ask devs">
- exclusions: user-generated content, dev-build labels, text wraps, <anything the designer said not to flag>
- scoring overrides: <e.g. "Imagery, Other, Missing text: flag but deduct 0">
- maestro flow: <path, or "not set up">
```
