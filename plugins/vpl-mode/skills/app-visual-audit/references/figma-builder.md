# Figma builder for an audit page

One `use_figma` call per 1 to 3 sections. Clone an existing comparison frame as the template (the one copied in from the team templates file, or one from the previous audit). Never edit an earlier audit page.

Quirks that cost time the first run:
- The Comment Card component in the team template uses SF Pro Display, which the cloud Figma connection can't load. **Clone a card that already exists in the template frame** instead of `mainComponent.createInstance()`, and set its text in Inter. If the template card itself errors on text edits, set `fontName` to Inter on it first.
- **Every text you edit goes to Inter** (cover, score card, frame titles, comment cards): Heavy/Bold → Inter Bold, Semibold → Inter Semi Bold, Medium → Inter Medium, Regular → Inter Regular. SF Pro Display can't load at all, and SF Pro loads but renders the *old* template text in screenshots (tested on NV, Nov 2026), so the page looks unedited. Check one card with `node.screenshot()` after editing.
- **HiFi copies lose the variable mode they inherit.** Dark-mode HiFi frames usually get "Dark" from their section; a copy moved to the audit page falls back to the default mode and components render in light colours (white text fields on NV). After cloning, walk the original's ancestors, collect `explicitVariableModes` (nearest wins) and `setExplicitVariableModeForCollection` on the copy. Snippet below.
- Comparison frames copied from a previous audit page don't always use the team names: the build slot can be called `IMG_xxxx` instead of `Rectangle 8`, the comments wrapper `Android Comments` instead of `IOS Comments`, and highlights can be library `Highlight` instances (number text in Open Sans Bold, loads fine). Find the build slot as the 375x812 RECTANGLE at x 924 and the comments list by `Android Comments`/`IOS Comments`.
- A previous audit's score card may have a dark outer frame with a black title. Make the title white if you can't read it.
- Score band fills: red `#FFD8D8` (from the team template). Yellow used so far `#FFF1C2`.
- HiFi artboards often use a font the cloud connection can't load: `src.clone()` then `figma.group([clone], inner)`. Never `appendChild` a HiFi clone.
- Highlights: clone a `Highlight` frame from the template or a previous audit (Inter only); `inner.appendChild` works. If none exists, build one: frame "Highlight", fill #FF5C5C at 10%, dashed stroke #F05757 1.5px (dash 4,4), radius 4, clipsContent off, with a 24x24 "Badge" (radius 4, fill #F7A1A1, number in #991212 Inter Bold 13) outside its left edge.
- Build image slot is `Rectangle 8` (x 924, y 158 in the inner frame); design slot is `Rectangle 9` (x 429). Upload with `upload_assets(nodeIds=[...Rectangle 8 ids])`, then `scripts/upload.sh`.
- Coordinates in specs are design points on the 375 grid. iPhone 13 mini captures (1080x2340) fill the 375x812 slot 1:1 in points.

## Page + cover (once)
```js
const audit1 = await figma.getNodeByIdAsync(AUDIT1_PAGE_ID);
const page = figma.createPage(); page.name = "🔍 Visual Audit N";
figma.root.insertChild(figma.root.children.indexOf(audit1) + 1, page);
await figma.setCurrentPageAsync(page);
const cover = (await figma.getNodeByIdAsync(COVER_ID)).clone(); cover.x = -40; cover.y = 0;
const score = (await figma.getNodeByIdAsync(SCORE_FRAME_ID)).clone(); score.x = 1889; score.y = -137;
// edit texts: set fontName to {family:'SF Pro', style:<same weight>} first, then characters
```

## Copy inherited variable modes onto HiFi copies
```js
// after: const c = src.clone(); figma.group([c], inner)
const modes = {};
for (let n = src; n && n.type !== 'DOCUMENT'; n = n.parent)
  for (const [col, mode] of Object.entries(n.explicitVariableModes || {})) if (!(col in modes)) modes[col] = mode;
for (const [colId, modeId] of Object.entries(modes)) {
  const col = await figma.variables.getVariableCollectionByIdAsync(colId);
  if (col) c.setExplicitVariableModeForCollection(col, modeId);
}
```

## Section builder
Spec issue shape: `{ num?, t, b, d?:[x,y,w,h], bb?:[x,y,w,h] }`. `num` gets highlights + badge on design (`d`) and build (`bb`); no `num` = recheck or note card only. Empty `issues` = "No comments".
```js
const page = await figma.getNodeByIdAsync(PAGE_ID); await figma.setCurrentPageAsync(page);
await Promise.all([figma.loadFontAsync({family:'Inter',style:'Bold'}), figma.loadFontAsync({family:'Inter',style:'Regular'})]);
const [tmpl, hlTmpl] = await Promise.all([figma.getNodeByIdAsync(TEMPLATE_GROUP_ID), figma.getNodeByIdAsync(TEMPLATE_HIGHLIGHT_ID)]);
const SECTIONS = [ { name: 'ROLE / Feature', specs: [ { k:'01-capture-name', name:'01 – Screen', hifi:'123:456', issues:[ ... ] } ] } ];
const out = { sections: [], rects: {}, errors: [] };
let Y = START_Y;
for (const SEC of SECTIONS) {
  const groups = []; let x = 60; let maxH = 0;
  for (const s of SEC.specs) {
    try {
      const g = tmpl.clone(); g.name = s.name; g.children[0].name = s.name; g.x = x; g.y = Y + 100;
      const inner = g.findOne(n => n.type === 'FRAME' && n.name === 'Exact Name of the Screen');
      const comments = g.findOne(n => n.type === 'FRAME' && n.name === 'Comments');
      for (const c of [...inner.children]) if (c.name === 'Highlight' || c.name.startsWith('HiFi')) c.remove();
      const r8 = inner.findOne(n => n.name === 'Rectangle 8'), r9 = inner.findOne(n => n.name === 'Rectangle 9');
      r8.fills = [{ type: 'SOLID', color: { r: 0.92, g: 0.92, b: 0.92 } }];
      let H = 812;
      if (s.hifi) { const src = await figma.getNodeByIdAsync(s.hifi); const c = src.clone(); c.x = inner.x + r9.x; c.y = inner.y + r9.y; H = Math.max(812, c.height); const w = figma.group([c], inner); w.name = 'HiFi – ' + src.name; }
      if (H > 812) { inner.resize(inner.width, 158 + H + 147); for (const lab of inner.children) if (lab.type === 'TEXT' && (lab.name === 'Original Design' || lab.name === 'iOS')) lab.y = 158 + H + 40; }
      for (const is of s.issues) { if (!is.num) continue;
        for (const [box, base] of [[is.d, r9], [is.bb, r8]]) { if (!box) continue;
          const h = hlTmpl.clone(); inner.appendChild(h);
          h.resize(Math.max(box[2], 8), Math.max(box[3], 8)); h.x = base.x + box[0]; h.y = base.y + box[1];
          h.findOne(n => n.type === 'TEXT').characters = String(is.num); } }
      const ios = comments.findOne(n => n.name === 'IOS Comments'); const card0 = ios.children[0];
      for (const c of [...ios.children].slice(1)) c.remove();
      const list = s.issues.length ? s.issues : [{ t: 'No comments', b: 'Matches the design.' }];
      list.forEach((is, i) => { const inst = i === 0 ? card0 : card0.clone(); if (i > 0) ios.appendChild(inst); const tx = inst.findAllWithCriteria({ types: ['TEXT'] }); tx[0].characters = is.t; tx[1].characters = is.b; });
      comments.y = inner.y + inner.height + 56;
      out.rects[s.k] = r8.id; groups.push(g); maxH = Math.max(maxH, g.height); x += 1728 + 80;
    } catch (e) { out.errors.push(s.k + ': ' + e.message); }
  }
  if (!groups.length) continue;
  const sec = figma.createSection(); sec.name = SEC.name; sec.x = -40; sec.y = Y;
  sec.resizeWithoutConstraints(200 + groups.length * 1728 + (groups.length - 1) * 80, 200 + maxH);
  const wrap = figma.group(groups, sec); wrap.name = SEC.name + ' – screens';
  out.sections.push({ id: sec.id, name: SEC.name, bottom: Math.round(sec.y + sec.height) });
  Y = Math.round(sec.y + sec.height) + 800;
}
out.nextY = Y; return out;
```

## Score card
Rows are FRAMEs with two TEXT children (label, `- N Pts`). Set values, `FINAL SCORE` to `NN/100`, and the inner card fill by band (green >80, yellow 60 to 80, red <60).

## Editing after review
Designers usually trim the page after reviewing it. Patterns that worked:
- Find frames with `page.findAll(n => n.type === 'GROUP' && n.parent?.type === 'GROUP' && n.parent.name.endsWith(' – screens'))`.
- Drop an issue: remove its two highlights (badge text = number) and its card, then renumber the remaining badges and `# N` titles.
- Move frames between sections: `figma.group(listOfFrames, targetSection)`, then set each frame's `x`/`y` (relative to the section) and resize the section. Empty wrapper groups delete themselves; delete an empty section yourself.
- Renumber frame names `01 – …` top to bottom after any move.
- If a frame you expect is gone, the designer probably deleted it: report it, don't rebuild it unless asked.

## New file, no template (view-only HiFi)
Tested on a client project, 4 Nov 2026. One `use_figma` call builds the whole page: cover frame (1290x640), score card (560x640, band fill), then per screen a white 1290-wide frame with title, "Design (HiFi)" and "Build" labels, two 375x812 RECTANGLE slots at x 40 and x 455 (y 112), highlights (frame, #FF5C5C at 10%, dashed #F05757 1.5px, 24x24 badge at x -28), and a vertical auto-layout comment column at x 870 of 380-wide cards (issue: fill #FFF5F5, stroke #F3C2C2; note: #F3F1EE / #DDD6CE). Return the slot ids, then `upload_assets` with `nodeIds` = the slots in order and POST each PNG as multipart `file=@...` (build captures at 1126x2436 fill the 375x812 slot cleanly). Sections via `figma.createSection()` and `resizeWithoutConstraints`.
