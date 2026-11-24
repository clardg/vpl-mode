"""Print what's on the Android screen with tap centres in dp.
usage: adb exec-out cat /sdcard/ui.xml | python3 android_ui.py <px-per-dp>
Flutter apps often expose little here; fall back to the screenshot when the list is thin."""
import re
import sys
import xml.etree.ElementTree as ET

d = float(sys.argv[1]) if len(sys.argv) > 1 else 3.0
raw = sys.stdin.read()
start = raw.find("<?xml")
if start < 0:
    sys.exit("no UI dump (screen may be animating; try again)")
root = ET.fromstring(raw[start:raw.rfind(">") + 1])

for n in root.iter("node"):
    label = n.get("text") or n.get("content-desc") or ""
    rid = (n.get("resource-id") or "").split("/")[-1]
    tappable = n.get("clickable") == "true" or n.get("checkable") == "true"
    editable = n.get("class", "").endswith("EditText")
    if not (label or tappable or editable):
        continue
    x1, y1, x2, y2 = map(int, re.findall(r"\d+", n.get("bounds", "[0,0][0,0]")))
    if x2 <= x1 or y2 <= y1:
        continue
    kind = "field" if editable else ("tap" if tappable else "text")
    cx, cy = round((x1 + x2) / 2 / d), round((y1 + y2) / 2 / d)
    w, h = round((x2 - x1) / d), round((y2 - y1) / d)
    extra = f" #{rid}" if rid else ""
    print(f"{kind:5} ({cx:>3},{cy:>3})  {w}x{h}  {label[:60]!r}{extra}")
