# Device Mockup Specifications

Reference dimensions for placing device frames in App Store screenshot artboards.

---

## iPhone 17 Pro Max — 6.9" (1320 × 2868 artboard)

- **Artboard:** 1320 × 2868 px
- **Device frame:** iPhone 17 Pro Max (Dynamic Island, titanium frame, no home button)
- **Recommended device width in artboard:** ~900–980 px (adjust based on layout)
- **Screen inset (inside device frame):**
  - Top (below Dynamic Island): ~60px
  - Left/Right bezel: ~30px each
  - Bottom (above home indicator): ~40px
- **Dynamic Island safe zone:** Top 80px of screen area — do not overlay important content
- **Home indicator area:** Bottom 34px — keep clear
- **Safe zone for headline text (Top layout):** y: 80–440px (top third of artboard)
- **Safe zone for headline text (Bottom layout):** y: 2400–2780px (bottom quarter)

---

## iPhone XS Max / 11 Pro Max style — 6.5" (1242 × 2688 artboard)

- **Artboard:** 1242 × 2688 px
- **Device frame:** iPhone XS Max / 11 Pro Max style (notch, no home button)
- **Recommended device width in artboard:** ~840–900 px
- **Screen inset:**
  - Top (below notch): ~44px
  - Left/Right bezel: ~28px each
  - Bottom (above home indicator): ~34px
- **Notch safe zone:** Top 50px — avoid critical content
- **Safe zone for headline text (Top layout):** y: 70–400px
- **Safe zone for headline text (Bottom layout):** y: 2260–2620px

---

## iPhone 8 Plus — 5.5" (1242 × 2208 artboard)

- **Artboard:** 1242 × 2208 px
- **Device frame:** iPhone 8 Plus (home button, rounded corners, no notch)
- **Recommended device width in artboard:** ~780–840 px
- **Screen inset:**
  - Top (status bar area): ~40px
  - Left/Right bezel: ~25px each
  - Bottom (home button area): ~100px (significant physical home button area)
- **Status bar safe zone:** Top 40px
- **Home button clearance:** Bottom 100px of device — no screen content here
- **Safe zone for headline text (Top layout):** y: 60–360px
- **Safe zone for headline text (Bottom layout):** y: 1840–2150px

---

## Layout Scaling Notes

When adapting a 6.9" design to 6.5" and 5.5":

- Scale device frame proportionally: multiply 6.9" device width by 0.94 for 6.5", and 0.88 for 5.5"
- Scale headline font size: multiply 6.9" px by 0.92 for 6.5", and 0.84 for 5.5"
- Maintain same proportional margins and padding
- Do NOT simply resize the artboard — rebuild each size at native resolution

---

## Breakout Element Guide

For the "breakout" style (UI element extending beyond device frame edge):
- The element should extend 60–120px beyond the device frame border
- Ensure the extended element still falls within the artboard safe zone (min 60px from artboard edge)
- Use a drop shadow (0 20px 60px rgba(0,0,0,0.3)) on the device frame to separate it from background
- The breakout element should reinforce the headline (e.g. a notification card if headline is about notifications)

---

## Status Bar Handling

For all device sizes, either:
1. **Hide the status bar** in the Figma screen (cleanest, most common in marketing screenshots)
2. **Set status bar to 9:41 AM** with full signal/wifi/battery (Apple's canonical demo time)

Never show: low battery, carrier name, unusual network status, debug overlays, or personal info.
