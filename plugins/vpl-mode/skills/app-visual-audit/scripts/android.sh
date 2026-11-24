#!/bin/bash
# Android emulator helper for visual audits. All positions are in dp (= Figma points),
# so they match the HiFi. The audit phone is 375x812dp at 3x (captures are 1126x2436 px).
#
# usage: android.sh <command> [args]
#   apk-info <file.apk>             CPU types (checks it runs here) and whether it's a bundle
#   create [name]                   make the audit phone (default "Audit_375") if it doesn't exist
#   boot [name]                     start it in its own window and wait until Android is ready
#   install <file.apk>              install or update the build; prints the package id
#   launch <package>                open the app
#   statusbar                       pin the status bar to 9:41, full battery, no notifications
#   shot <folder> <NN-screen-name>  save a full-res screenshot
#   burst <folder> <NN-name> [n]    n rapid captures (default 10) for splash and launch animations into
#                                   <folder>/burst-<NN-name>/; pick the right frame yourself
#   net [n]                         last n API calls and status codes (debug builds log them). Use it
#                                   when a button does nothing: a 5xx means the dev server is down
#   ui                              list what's on screen with tap positions in dp
#   tap <x> <y>                     tap at dp position
#   swipe <x1> <y1> <x2> <y2> [ms]  swipe in dp (to scroll down the page: swipe 187 650 187 200)
#   text "<words>"                  type into the focused field
#   clear                           empty the focused field (jumps to the end first, then deletes)
#   key <back|enter|home|tab|del>   press a key
#   reset <package>                 wipe the app's data (fresh install state) without reinstalling
#   uninstall <package>
#   stop                            shut the emulator down

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
[ -d /opt/homebrew/opt/openjdk@17 ] && export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}"
ADB="$ANDROID_HOME/platform-tools/adb"
EMU="$ANDROID_HOME/emulator/emulator"
AVDM="$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager"
IMAGE="system-images;android-35;google_apis;arm64-v8a"
HERE="$(cd "$(dirname "$0")" && pwd)"
DENSITY=3   # px per dp

cmd=$1; shift
px() { python3 -c "print(round(float('$1')*$DENSITY))"; }

case "$cmd" in
  apk-info)
    # (apkanalyzer needs the 100MB build-tools for the package id; `install` prints it instead)
    apk=$1
    [ -f "$apk" ] || { echo "no file: $apk"; exit 1; }
    echo "size: $(du -h "$apk" | cut -f1)"
    abis=$(unzip -l "$apk" 2>/dev/null | awk '{print $4}' | grep '^lib/' | cut -d/ -f2 | sort -u | tr '\n' ' ')
    if [ -z "$abis" ]; then echo "cpu: any (no native code)  -> OK on this Mac"
    elif echo "$abis" | grep -q arm64-v8a; then echo "cpu: $abis -> OK on this Mac"
    else echo "cpu: $abis -> WON'T RUN on an Apple-chip emulator. Ask the devs for an arm64-v8a or universal APK"; fi
    unzip -l "$apk" 2>/dev/null | grep -q 'base.apk\|\.apks' && echo "NOTE: looks like a bundle, not a plain APK"
    ;;
  create)
    name=${1:-Audit_375}
    if "$EMU" -list-avds 2>/dev/null | grep -qx "$name"; then echo "exists: $name"; exit 0; fi
    echo no | "$AVDM" create avd -n "$name" -k "$IMAGE" -d pixel_6 >/dev/null || exit 1
    cfg="$HOME/.android/avd/$name.avd/config.ini"
    python3 - "$cfg" <<'PY'
import sys
p=sys.argv[1]; want={'hw.lcd.width':'1125','hw.lcd.height':'2436','hw.lcd.density':'480',
 'skin.name':'1125x2436','skin.path':'_no_skin','showDeviceFrame':'no','hw.keyboard':'yes',
 'hw.gpu.enabled':'yes','hw.gpu.mode':'auto','disk.dataPartition.size':'6G','hw.ramSize':'3072'}
lines=[l for l in open(p).read().splitlines() if l.split('=')[0].strip() not in want]
lines+= [f'{k}={v}' for k,v in want.items()]
open(p,'w').write('\n'.join(lines)+'\n')
PY
    echo "created: $name (375x812dp, 1125x2436px)"
    ;;
  boot)
    name=${1:-Audit_375}
    if "$ADB" get-state >/dev/null 2>&1; then echo "already running"; exit 0; fi
    nohup "$EMU" -avd "$name" -no-boot-anim -no-snapshot-save -netdelay none -netspeed full -dns-server 8.8.8.8,1.1.1.1 \
      >"$HOME/.android/audit-emulator.log" 2>&1 &
    disown
    "$ADB" wait-for-device
    for i in $(seq 1 120); do
      [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ] && { for j in $(seq 1 30); do "$ADB" shell ping -c1 -W2 google.com >/dev/null 2>&1 && break; sleep 2; done; echo "ready"; exit 0; }
      sleep 2
    done
    echo "timed out; see ~/.android/audit-emulator.log"; exit 1
    ;;
  install)
    before=$("$ADB" shell pm list packages -3 | sort)
    "$ADB" install -r "$1" || exit 1
    after=$("$ADB" shell pm list packages -3 | sort)
    new=$(comm -13 <(echo "$before") <(echo "$after") | sed 's/package://' | tr -d '\r')
    if [ -n "$new" ]; then echo "package: $new"
    else echo "updated an existing app; installed packages:"; echo "$after" | sed 's/package:/  /'; fi
    ;;
  launch)    "$ADB" shell input keyevent 3; "$ADB" shell am force-stop "$1"   # start from home, cold, so a burst never catches the previous app
             # dev builds can have a second launcher icon (LeakCanary, Chucker): pick the app's own activity
             act=$("$ADB" shell cmd package query-activities --brief -a android.intent.action.MAIN -c android.intent.category.LAUNCHER "$1" \
               | tr -d '\r' | grep "^ *$1/" | grep -viE 'leakcanary|chucker|debug|flipper' | head -1 | tr -d ' ')
             if [ -n "$act" ]; then "$ADB" shell am start -n "$act" >/dev/null && echo "launched $act"
             else "$ADB" shell monkey -p "$1" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 && echo "launched $1"; fi ;;
  statusbar)
    s() { "$ADB" shell am broadcast -a com.android.systemui.demo "$@" >/dev/null; }
    "$ADB" shell settings put global sysui_demo_allowed 1
    "$ADB" shell settings put secure stylus_handwriting_enabled 0   # else a floating handwriting toolbar covers text fields
    s -e command exit; sleep 1          # reset any half-applied demo state
    s -e command enter
    s -e command clock -e hhmm 0941
    s -e command battery -e level 100 -e plugged false
    s -e command network -e mobile hide   # "datatype none" still draws 3G on Android 15
    s -e command network -e wifi show -e level 4 -e fully true   # after mobile, or wifi can vanish
    s -e command notifications -e visible false
    sleep 1; s -e command network -e wifi show -e level 4 -e fully true   # resend: the first one can be dropped right after boot
    echo "status bar pinned to 9:41"
    ;;
  shot)
    mkdir -p "$1"; "$ADB" exec-out screencap -p >"$1/$2.png" && echo "$1/$2.png" ;;
  burst)
    mkdir -p "$1"; n=${3:-10}; tmp=$(mktemp -d)
    for i in $(seq 1 "$n"); do "$ADB" exec-out screencap -p >"$tmp/$(printf %02d $i).png"; done
    mkdir -p "$1/burst-$2"; mv "$tmp"/*.png "$1/burst-$2/"; rmdir "$tmp"
    echo "frames 01-$(printf %02d $n) in $1/burst-$2/ : preview them with look.py, then copy the right one to $1/$2.png" ;;
  net)
    "$ADB" logcat -d | grep -E 'OkHttp *: (<-- [0-9]{3}|--> (GET|POST|PUT|PATCH|DELETE))' | tail -"${1:-10}" \
      | sed -E 's/.*OkHttp *: //' ;;
  clear)
    "$ADB" shell input keyevent 123
    "$ADB" shell input keyevent $(printf '67 %.0s' $(seq 1 80)) ;;
  ui)
    "$ADB" shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
    "$ADB" exec-out cat /sdcard/ui.xml | python3 "$HERE/android_ui.py" "$DENSITY" ;;
  tap)       "$ADB" shell input tap "$(px "$1")" "$(px "$2")" ;;
  swipe)     "$ADB" shell input swipe "$(px "$1")" "$(px "$2")" "$(px "$3")" "$(px "$4")" "${5:-300}" ;;
  text)
    # adb input text: spaces become %s, shell specials escaped
    t=$(python3 -c "import sys,re; s=sys.argv[1].replace('%','\\\\%').replace(' ','%s'); print(re.sub(r'([\"\\'()&<>;|*~\`\$!?#])', r'\\\\\1', s))" "$1")
    "$ADB" shell input text "$t" ;;
  key)
    case "$1" in back) k=4;; enter) k=66;; home) k=3;; tab) k=61;; del) k=67;; *) k=$1;; esac
    "$ADB" shell input keyevent "$k" ;;
  reset)     "$ADB" shell pm clear "$1" ;;
  uninstall) "$ADB" uninstall "$1" ;;
  stop)      "$ADB" emu kill ;;
  *)         sed -n '2,30p' "$0"; exit 1 ;;
esac
