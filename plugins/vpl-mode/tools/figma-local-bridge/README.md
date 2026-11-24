# Figma local bridge

**When you need it:** the project's fonts are installed on your Mac but aren't Google Fonts or in Figma's cloud (General Sans, Satoshi, or a client's own font). The Figma MCP runs in Figma's cloud and can't load those fonts, so it can't edit text set in them. The bridge runs the same scripts inside your Figma desktop app, where your fonts load.

Read-only checks (lint, flow, audit) don't need it. Only edits to text in a local font do.

## Set up once (Mac)
1. Ask Claude: "set up the font bridge". It runs `install.sh` from this folder after you OK it. The script copies the bridge to `~/.vpl-mode/figma-local-bridge` and starts it at login.
2. In Figma desktop: Plugins > Development > **Import plugin from manifest**, and pick `~/.vpl-mode/figma-local-bridge/plugin/manifest.json`.

## Each time
1. Open the file in Figma desktop.
2. Run Plugins > Development > **Claude Local Bridge**. Keep its small window open while Claude works; a green dot means it's connected.
3. Claude runs scripts with `python3 -I ~/.vpl-mode/figma-local-bridge/bridge.py run script.js -d "what it does"`. Scripts are written like the Figma MCP's `use_figma`: top-level `await`, and `return` the result.

Avoid `figma.setCurrentPageAsync` in bridge scripts: it moves the page you're looking at in Figma. Use `await page.loadAsync()` instead.

## Safety
- The server listens only on this Mac (127.0.0.1:7337) and rejects other hosts.
- Sending code needs the token in `~/.figma-bridge-token`, which only your user can read.
- Nothing can reach Figma unless the plugin window is open. Close it and the bridge is off.
- Remove everything: `bash install.sh --remove`, then remove the plugin in Figma.

## Troubleshooting
- `python3 -I ~/.vpl-mode/figma-local-bridge/bridge.py status` says whether the server is up and the plugin is polling.
- Log: `~/Library/Logs/figma-local-bridge.log`.
