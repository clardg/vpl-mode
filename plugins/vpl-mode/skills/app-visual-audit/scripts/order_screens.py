#!/usr/bin/env python3
"""Order visual-audit screenshots by when they were taken and guess the platform.

usage: order_screens.py <folder-or-files...> [--json]
iPhone screenshots (IMG_1234.PNG) carry capture time in metadata; Android ones
(Screenshot_20260810_233119_App.jpg) carry it in the filename.
"""
import json, os, re, subprocess, sys
from datetime import datetime

IMG = re.compile(r'\.(png|jpe?g|heic)$', re.I)
ANDROID = re.compile(r'Screenshot_(\d{8})_(\d{6})')
SIM = re.compile(r'^\d{2,3}-')  # simulator captures from capture.sh: 01-walkthrough-01.png


def captured(path):
    m = ANDROID.search(os.path.basename(path))
    if m:
        return datetime.strptime(m.group(1) + m.group(2), '%Y%m%d%H%M%S'), 'android'
    name = os.path.basename(path)
    platform = 'ios' if re.match(r'IMG_\d+', name, re.I) else 'ios-sim' if SIM.match(name) else 'unknown'
    try:
        out = subprocess.run(['mdls', '-raw', '-name', 'kMDItemContentCreationDate', path],
                             capture_output=True, text=True, timeout=10).stdout.strip()
        return datetime.strptime(out[:19], '%Y-%m-%d %H:%M:%S'), platform
    except Exception:
        return datetime.fromtimestamp(os.path.getmtime(path)), platform


def main():
    args = [a for a in sys.argv[1:] if a != '--json']
    paths = []
    for a in args:
        if os.path.isdir(a):
            paths += [os.path.join(a, f) for f in os.listdir(a) if IMG.search(f)]
        elif IMG.search(a):
            paths.append(a)
    rows = sorted(({'path': p, 'taken': t.isoformat(sep=' '), 'platform': pf}
                   for p in paths for t, pf in [captured(p)]), key=lambda r: r['taken'])
    if '--json' in sys.argv:
        print(json.dumps(rows, indent=1))
        return
    for i, r in enumerate(rows, 1):
        print(f"{i:3d}  {r['taken']}  {r['platform']:<7}  {os.path.basename(r['path'])}")
    print(f"\n{len(rows)} screenshots · " + ', '.join(f"{p}: {sum(r['platform'] == p for r in rows)}" for p in ('ios', 'ios-sim', 'android', 'unknown')))


if __name__ == '__main__':
    main()
