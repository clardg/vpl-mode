#!/bin/bash
# Visual audit setup check. Prints OK / MISSING per item with the SETUP.md step to fix it.
# usage: bash preflight.sh [--android]   (exit code = number of required items missing)
#   --android checks the Android emulator instead of Xcode and the iPhone simulator

missing=0
ok()   { printf "  OK       %s\n" "$1"; }
miss() { printf "  MISSING  %s  ->  SETUP.md step %s\n" "$1" "$2"; missing=$((missing+1)); }
opt()  { printf "  OPTIONAL %s  ->  SETUP.md step %s\n" "$1" "$2"; }

android=0; [ "$1" = "--android" ] && android=1
echo "Visual audit setup check$( [ $android = 1 ] && echo ' (Android)')"

[ "$(uname -s)" = "Darwin" ] && ok "Mac ($(sw_vers -productVersion))" || miss "This needs a Mac" "Before you start"
[ "$(uname -m)" = "arm64" ] && ok "Apple chip" || printf "  NOTE     Intel Mac: works, but the simulator will be slow\n"

free_gb=$(df -g / | awk 'NR==2{print $4}')
[ "${free_gb:-0}" -ge 15 ] && ok "Free disk space (${free_gb} GB)" || miss "Free disk space (${free_gb} GB, need at least 15)" "Before you start"

[ -f "$(cd "$(dirname "$0")/.." && pwd)/SKILL.md" ] && ok "Skill installed" || miss "Skill files incomplete, reinstall VPL mode" "1"

if [ $android = 1 ]; then
sdk="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
[ -x /opt/homebrew/opt/openjdk@17/bin/java ] || [ -n "$JAVA_HOME" ] && ok "Java 17" || miss "Java 17" "A1"
[ -x "$sdk/cmdline-tools/latest/bin/avdmanager" ] && ok "Android tools" || miss "Android tools" "A1"
[ -x "$sdk/platform-tools/adb" ] && [ -x "$sdk/emulator/emulator" ] && ok "Android emulator" || miss "Android emulator" "A2"
[ -d "$sdk/system-images/android-35/google_apis/arm64-v8a" ] && ok "Android 15 phone image" || miss "Android 15 phone image" "A2"
"$sdk/emulator/emulator" -list-avds 2>/dev/null | grep -qx Audit_375 && ok "Audit phone (Audit_375, 375x812)" || miss "Audit phone (Claude makes it: android.sh create)" "A3"
else
if [ -d /Applications/Xcode.app ] || ls -d /Applications/Xcode*.app >/dev/null 2>&1; then
  ok "Xcode installed"
  if xcrun simctl help >/dev/null 2>&1; then ok "Xcode set up (licence accepted)"; else miss "Xcode not set up yet (open it once and accept the licence)" "2"; fi
else
  miss "Xcode" "2"
fi

runtime=$(xcrun simctl list runtimes 2>/dev/null | grep -E '^iOS [0-9]' | grep -v unavailable | tail -1)
[ -n "$runtime" ] && ok "iPhone simulator ($(echo "$runtime" | cut -d'(' -f1 | xargs))" || miss "iPhone simulator download" "3"

if xcrun simctl list devicetypes 2>/dev/null | grep -q "iPhone 13 mini"; then ok "iPhone 13 mini device available"
elif [ -n "$runtime" ]; then printf "  NOTE     iPhone 13 mini not offered; Claude will pick the closest 375pt-wide iPhone\n"; fi

fi

if python3 -c "import PIL" 2>/dev/null; then ok "Pillow (image measuring)"; else miss "Pillow (image measuring)" "5"; fi

echo "  CHECK    Figma connected: Claude confirms with the Figma whoami tool  (step 4)"

mae="$HOME/.maestro/bin/maestro"; [ -x "$mae" ] || mae=$(command -v maestro)
if [ -n "$mae" ] && "$mae" --version 2>/dev/null | grep -q '^[0-9]'; then ok "Maestro (optional)"; else opt "Maestro for faster repeat audits" "9"; fi

echo
[ $missing -eq 0 ] && echo "All set. Ready to run a visual audit." || echo "$missing item(s) to set up."
exit $missing
