# Visual audit setup (for new teammates)

This sets up your Mac so Claude can run visual audits for you: it installs the app build on an iPhone simulator, takes every screenshot itself, compares it to the Figma designs and builds the audit page. You only approve.

You do this once. It takes about an hour, mostly waiting for downloads. You don't need to know any code: Claude walks you through it and runs the technical steps for you.

**The easy way:** open the Claude desktop app, go to the **Code** tab, and type: *"Set me up for visual audits."* Claude checks your Mac and takes you through only the steps you still need, one at a time.

The steps are below if you'd rather read them first.

---

## Before you start

- A **Mac with an Apple chip** (M1 or newer). Check: Apple menu → About This Mac → "Chip". Intel Macs mostly work but are slow.
- At least **30 GB free** (Apple menu → About This Mac → More Info → Storage).
- The **Claude desktop app** with the **Code** tab, signed in with your work account.
- **Edit access** to your project's Figma file, and view access to the team **Visual Audit templates** file (step 7). Ask your lead if you can't open them.

---

## Step 1. Add the skill to Claude

The visual audit comes with VPL mode. If you haven't installed it yet, paste this in Terminal, then restart Claude:

```bash
claude plugin install vpl-mode --marketplace clardg/vpl-mode
```

Check: start a new Code session and type *"visual audit"*. Claude should mention the app-visual-audit skill.

## Step 2. Install Xcode (Apple's free developer app)

The iPhone simulator comes with Xcode.

1. Open the **App Store**, search for **Xcode**, click **Get** and **Install**. It's big (about 10 GB), so expect 30 to 60 minutes.
2. When it's done, **open Xcode once**. Click **Agree** on the licence and enter your Mac password if asked. If it offers to install extra components, say yes.
3. You can close Xcode after that. You won't need to use it.

## Step 3. Download the iPhone simulator

Xcode needs the iPhone system that runs inside the simulator (about 8 GB).

- Easiest: ask Claude *"download the iOS simulator for me"*. It runs `xcodebuild -downloadPlatform iOS` in the background.
- Or in Xcode: **Xcode → Settings → Components**, then click **Get** next to iOS.

This takes 15 to 30 minutes. You can do step 4 meanwhile.

## Step 4. Connect Figma to Claude

1. In the Claude desktop app open **Settings → Connectors**.
2. Find **Figma**, click **Connect**, and log in with your work Figma account. Allow access.
3. Check: in the Code tab ask *"who am I in Figma?"*. Claude should answer with your name.

## Step 5. Install the image measuring tool

Claude measures colours and spacing in the screenshots with a small Python library called Pillow.

- Ask Claude: *"install Pillow for visual audits."* It runs `python3 -m pip install --user Pillow`. Approve it.
- If your Mac asks to install "command line developer tools", click **Install** and wait, then ask Claude again.

## Step 6. Allow the iPhone simulator panel

The first time Claude opens the simulator, the Claude app asks for permission to use it. Click **Allow**. You'll then see the simulated iPhone in a panel next to the chat and can watch Claude tap through the app.

## Step 7. Put the audit template in your project's Figma file (first audit on a project only)

Every audit page is built from the team's comparison frame and score table.

1. Open the team **Visual Audit templates** file:
   - iOS comparison frame: https://www.figma.com/design/Wr1LUWNWL593aXcsIXwAOD/?node-id=1043-55
   - Android: https://www.figma.com/design/Wr1LUWNWL593aXcsIXwAOD/?node-id=1043-56
   - Web: https://www.figma.com/design/Wr1LUWNWL593aXcsIXwAOD/?node-id=1043-54
   - Score table: https://www.figma.com/design/Wr1LUWNWL593aXcsIXwAOD/?node-id=506-318 (rubric: `506-337`)
2. Select the comparison frame for your platform and the score table, then copy them (**Cmd + C**).
3. In your project's Figma file, add a page called **🔍 Visual Audit** and paste (**Cmd + V**).
4. Send Claude the link to that page.

If the project already has an audit page, skip this. Claude copies from the previous audit.

## Step 8. Get a Simulator build from your developer

TestFlight and `.ipa` files only install on a real iPhone, so they won't work here. Your developer needs to send a **Simulator build**: a zipped `.app` file.

1. Ask Claude *"give me the message for the devs"*, or copy it from `templates/dev-request.md` in this skill.
2. Send it to your iOS developer. It's a one-time change on their side; after that they attach the file with each release.
3. In the same message, ask for a **staging test login** and whether there's a **verification code bypass** (many staging builds accept `00000`), so Claude can also test sign-up with a fresh account.

## Step 9 (optional). Faster repeat audits with Maestro

Not needed for your first audit. Maestro lets Claude replay its route through the app, so each new build is recaptured in one go instead of tapped through again.

- Ask Claude *"set up Maestro for visual audits."* It installs Java 17 (`brew install openjdk@17`) and Maestro from its official installer. You need Homebrew for this (https://brew.sh); Claude can help.
- Note: the Homebrew package called "maestro" is a different app. Use Maestro's own installer.

---

## Android

Android audits work from screenshots: go through the app on an Android phone, screenshot every screen in order, put them in one folder, and tell Claude where it is. No setup needed.

### Android emulator setup (experimental, optional)

Only if you want to try the automated Android route. Android builds run on an Android emulator on your Mac, the same way iOS builds run on the iPhone simulator. You don't need Android Studio. Skip steps 2, 3, 6 and 8 above if you only do Android. You need about **8 GB free**.

The easy way: in the Code tab type *"Set me up for Android visual audits."* Claude runs all three steps for you; you approve the prompts.

**Step A1. Android tools and Java (5 minutes).** Claude runs `brew install openjdk@17` and `brew install --cask android-commandlinetools`. You need Homebrew (https://brew.sh); Claude can help.

**Step A2. The emulator and an Android 15 phone image (15 to 30 minutes, about 6 GB).** Claude downloads them into `~/Library/Android/sdk`. This asks you to accept Google's Android SDK licence, the same one Android Studio shows. Claude asks you first.

**Step A3. The audit phone.** Claude makes a phone called **Audit_375**, sized 375x812 like the HiFi designs. When it starts, it opens in its own window on your Mac, so you can watch Claude tap through the app.

**Step A4. Get an APK from your developer.** Ask for a **staging or debug `.apk`** (the message is in `templates/dev-request.md`). A Play Store `.aab` won't install. Also ask for a test login and a verification code bypass, same as iOS.

Then: *"Run an Android visual audit for <Project>. Build: ~/Downloads/<app>.apk. Figma: <link>."*

---

## Running an audit

In the Code tab, type something like:

> Run a visual audit for **<Project>**. Build: ~/Downloads/<Project>-simulator.zip. Figma: <link to the project file or audit page>.

Claude then:
1. asks only for what it doesn't know yet (HiFi page, test login, anything to ignore) and saves the answers for next time
2. opens the simulator so you can watch, and goes through the app, including making a fresh test account
3. shows you which screen it matched to which design before building anything
4. builds the audit page in Figma: each screen next to its design, numbered highlights, one comment per issue, and the score
5. gives you a short summary to review

Then review the page and tell Claude what to change ("don't flag X", "remove Y", "that's intended"). It remembers these per project.

For Android, take screenshots on the phone, put them in one folder, and tell Claude where the folder is. The same works for any build you only have on your phone.

## If something goes wrong

| What you see | What to do |
|---|---|
| "Unable to boot" or no simulator | Step 3 isn't finished. Ask Claude to check the download |
| The build won't install, or Claude says it's for iPhone devices | You got an `.ipa` or TestFlight build. Ask the dev for the Simulator `.app` (step 8) |
| Claude says the APK "won't run on this Mac" | It was built only for Intel phones. Ask the dev for an arm64-v8a or universal APK |
| The APK won't install | You probably got an `.aab` (Play Store bundle). Ask for an `.apk` |
| Claude can't see Figma | Reconnect Figma in Settings → Connectors (step 4) |
| Stuck on a verification code screen | Ask the dev for a staging code bypass, or for a verified test account |
| Claude asks for permission a lot | That's normal on the first runs. Approve the simulator, Figma and terminal prompts |
| Something else | Tell Claude what you see, or paste a screenshot. It can re-run the setup check |
