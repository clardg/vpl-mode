# Asking devs for a Simulator build

Give the designer this message to paste to their iOS dev (Slack or the project channel). Fill in the project name. It's a one-time setup on the dev's side; after that they attach the file with each release.

---

Hi! For visual audits we now run builds on the iOS Simulator on our Mac. Could you send a **Simulator build** of <Project> (staging) with each release, alongside the TestFlight one? It's the zipped `.app` from a simulator build:

- Expo / EAS: a build profile with `"ios": { "simulator": true }`
- Flutter: `flutter build ios --simulator`, then zip `build/ios/iphonesimulator/Runner.app`
- Native or React Native CLI: build with `-sdk iphonesimulator` (or `-destination 'generic/platform=iOS Simulator'`) and zip the `.app`

Please include arm64 (default when built on an Apple silicon Mac). No signing needed. An .ipa won't work for this one.

Also, is there a staging bypass for the email verification code? It lets us test sign-up with fresh accounts. Thanks!

---

What to tell the designer if they ask why:
- TestFlight and `.ipa` builds only install on a real iPhone. The Simulator needs its own build type, made from the same code with a different build command.
- Android is automated too, from an APK. Use the Android message below.

---

# Asking devs for an Android APK

Paste to the Android dev (or whoever builds Android):

---

Hi! For visual audits we now run Android builds on an emulator on our Mac. Could you send a **staging APK** of <Project> with each release? A debug or internal-testing build is fine.

- Please send an `.apk`, not the `.aab` Play Store bundle (an `.aab` won't install directly).
- It needs to run on **arm64-v8a** (we're on an Apple-chip Mac). A universal APK is fine. Expo / EAS: a build profile with `"android": { "buildType": "apk" }`. Flutter: `flutter build apk`. Gradle: `assembleDebug`, or a signed staging release (unsigned release APKs won't install).

Also, is there a staging bypass for the email verification code? It lets us test sign-up with fresh accounts. Thanks!

---
