#!/bin/bash
# Simulator capture for visual audits.
# usage: capture.sh <device-udid-or-booted> <out-folder> <NN-screen-name>
# Saves a full-res PNG (iPhone 13 mini = 1080x2340, i.e. 375x812pt at 2.88x).
# Pin the status bar once per session first:
#   xcrun simctl status_bar <udid> override --time 9:41 --batteryState discharging --batteryLevel 100 --cellularBars 4 --wifiBars 3 --dataNetwork wifi
dev=${1:-booted}; dir=$2; name=$3
mkdir -p "$dir"
xcrun simctl io "$dev" screenshot --type=png "$dir/$name.png" >/dev/null 2>&1 && echo "$dir/$name.png"
