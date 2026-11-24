#!/bin/bash
# Copies the Figma local bridge to ~/.vpl-mode/figma-local-bridge and starts it now and at every login.
# The copy matters: the plugin's own folder changes with every update.
# Run once: bash install.sh    Undo: bash install.sh --remove
set -euo pipefail

LABEL="com.vpl.figma-local-bridge"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
SOURCE="$(cd "$(dirname "$0")" && pwd)"
HOME_DIR="$HOME/.vpl-mode/figma-local-bridge"
LOG="$HOME/Library/Logs/figma-local-bridge.log"

if [ "${1:-}" = "--remove" ]; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  rm -f "$PLIST"
  rm -rf "$HOME_DIR"
  echo "Bridge removed. Remove the Claude Local Bridge plugin in Figma too."
  exit 0
fi

if lsof -nP -iTCP:7337 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Something is already listening on port 7337, probably a bridge you set up before. Nothing changed."
  exit 1
fi

mkdir -p "$HOME_DIR" "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cp -R "$SOURCE/bridge.py" "$SOURCE/plugin" "$SOURCE/README.md" "$HOME_DIR/"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>-I</string>
    <string>$HOME_DIR/bridge.py</string>
    <string>serve</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
EOF
launchctl bootstrap "gui/$(id -u)" "$PLIST"
sleep 1
/usr/bin/python3 -I "$HOME_DIR/bridge.py" status || true
echo
echo "Next: in Figma desktop, Plugins > Development > Import plugin from manifest,"
echo "and pick $HOME_DIR/plugin/manifest.json"
