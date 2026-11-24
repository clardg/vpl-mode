// Read-only check for App Store artwork. Paste into use_figma with ROOTS set to the artwork page or its sections.
// Frames are named `01-<slug>-6.9` (or -6.5, -5.5, -watch, -play, -feature), with layers named Headline, Device, Screen and Breakout (see app-store-artwork).
const ROOTS = ['<node id>'];
const TOLERANCE = 2;
const SAMPLE_LIMIT = 15;

const SIZES = {
  '6.9': [[1290, 2796], [1320, 2868]],
  '6.5': [[1242, 2688]],
  '5.5': [[1242, 2208]],
  play: [[1080, 1920], [1440, 2560]],
  feature: [[1024, 500]],
};
// Width / height of phone screens: modern iPhones are about 0.46, home-button iPhones 0.5625.
const SCREEN_RATIOS = [0.4615, 0.5625];

const findings = {
  'fail: frame size wrong': [],
  'fail: frame name has no size': [],
  'fail: screen image stretched': [],
  'warn: size not in one row': [],
  'warn: grid differs from the first frame': [],
  'warn: unequal side margins': [],
  'warn: screen proportions off': [],
  'warn: headline over 2 lines': [],
  'warn: more than 2 breakouts': [],
  'warn: no PNG 1x export': [],
  'warn: no background fill': [],
  'note: no Headline or Device layer': [],
};
const add = (rule, node, detail) => findings[rule].push({ id: node.id, name: node.name, detail });

function framesUnder(node) {
  if (node.type === 'PAGE' || node.type === 'SECTION') return node.children.flatMap(framesUnder);
  return node.type === 'FRAME' ? [node] : [];
}

// Matches on the first word, so "Breakout — Date filter" counts as a Breakout.
function findAllNamed(node, name) {
  const pattern = new RegExp(`^${name}\\b`, 'i');
  const out = [];
  const visit = (n) => {
    if (pattern.test(n.name.trim())) out.push(n);
    if ('children' in n) n.children.forEach(visit);
  };
  node.children.forEach(visit);
  return out;
}

function relativeBox(node, frame) {
  const a = node.absoluteBoundingBox;
  const f = frame.absoluteBoundingBox;
  return { x: a.x - f.x, y: a.y - f.y, width: a.width, height: a.height };
}

function firstText(node) {
  if (node.type === 'TEXT') return node;
  for (const child of node.children || []) {
    const hit = firstText(child);
    if (hit) return hit;
  }
  return null;
}

function headlineLines(text) {
  if (typeof text.fontSize !== 'number' || !text.lineHeight || typeof text.lineHeight !== 'object') return null;
  const { unit, value } = text.lineHeight;
  const lineHeight = unit === 'PIXELS' ? value : unit === 'PERCENT' ? (text.fontSize * value) / 100 : text.fontSize * 1.2;
  return Math.round(text.height / lineHeight);
}

function stretchedImages(node) {
  const hits = [];
  const visit = (n) => {
    if (Array.isArray(n.fills) && n.fills.some((paint) => paint.type === 'IMAGE' && paint.scaleMode === 'STRETCH')) hits.push(n);
    if ('children' in n) n.children.forEach(visit);
  };
  visit(node);
  return hits;
}

const near = (a, b) => Math.abs(a - b) <= TOLERANCE;

const frames = [];
const missing = [];
for (const id of ROOTS) {
  const root = await figma.getNodeByIdAsync(id);
  if (!root) {
    missing.push(id);
    continue;
  }
  let page = root;
  while (page.type !== 'PAGE') page = page.parent;
  if (figma.currentPage !== page) await figma.setCurrentPageAsync(page);
  frames.push(...framesUnder(root));
}

const bySize = {};
for (const frame of frames) {
  const match = frame.name.trim().match(/-(6\.9|6\.5|5\.5|watch|play|feature)$/i);
  if (!match) {
    add('fail: frame name has no size', frame, 'end the name with -6.9, -6.5, -5.5, -watch, -play or -feature');
    continue;
  }
  const size = match[1].toLowerCase();
  (bySize[size] ||= []).push(frame);
  if (SIZES[size] && !SIZES[size].some(([w, h]) => near(frame.width, w) && near(frame.height, h))) {
    add('fail: frame size wrong', frame, `${Math.round(frame.width)}×${Math.round(frame.height)}, expected ${SIZES[size].map(([w, h]) => `${w}×${h}`).join(' or ')}`);
  }

  const visibleFills = Array.isArray(frame.fills) && frame.fills.some((paint) => paint.visible !== false && (paint.opacity ?? 1) === 1);
  if (!visibleFills && !findAllNamed(frame, 'background').length) add('warn: no background fill', frame, 'Apple rejects transparent screenshots');

  const exportsPng = (frame.exportSettings || []).some((s) => s.format === 'PNG' && (!s.constraint || (s.constraint.type === 'SCALE' && s.constraint.value === 1)));
  if (!exportsPng) add('warn: no PNG 1x export', frame, '');

  const breakouts = findAllNamed(frame, 'breakout');
  if (breakouts.length > 2) add('warn: more than 2 breakouts', frame, `${breakouts.length} breakouts`);

  for (const screen of findAllNamed(frame, 'screen')) {
    stretchedImages(screen).forEach((node) => add('fail: screen image stretched', node, `in "${frame.name}"`));
    const ratio = screen.width / screen.height;
    if (!SCREEN_RATIOS.some((r) => Math.abs(ratio - r) / r <= 0.02)) add('warn: screen proportions off', screen, `in "${frame.name}", ratio ${ratio.toFixed(3)}`);
  }

  const [headline] = findAllNamed(frame, 'headline');
  if (headline) {
    const box = relativeBox(headline, frame);
    const right = frame.width - box.x - box.width;
    if (!near(box.x, right)) add('warn: unequal side margins', headline, `in "${frame.name}": left ${Math.round(box.x)}, right ${Math.round(right)}`);
    const text = firstText(headline);
    const lines = text && headlineLines(text);
    if (lines > 2) add('warn: headline over 2 lines', text, `in "${frame.name}": ${lines} lines`);
  }
}

for (const [size, group] of Object.entries(bySize)) {
  const rows = new Set(group.map((frame) => Math.round(frame.absoluteBoundingBox.y)));
  if (rows.size > 1) add('warn: size not in one row', group[0], `${size} frames sit on ${rows.size} different rows`);

  const measured = group
    .map((frame) => {
      const [headline] = findAllNamed(frame, 'headline');
      const [device] = findAllNamed(frame, 'device');
      if (!headline || !device) {
        add('note: no Headline or Device layer', frame, 'grid not checked (fine for an intro frame)');
        return null;
      }
      return { frame, headline: relativeBox(headline, frame), device: relativeBox(device, frame) };
    })
    .filter(Boolean)
    .sort((a, b) => a.frame.absoluteBoundingBox.x - b.frame.absoluteBoundingBox.x);
  const [first, ...rest] = measured;
  for (const item of rest) {
    const diffs = [];
    if (!near(item.headline.x, first.headline.x) || !near(item.headline.width, first.headline.width)) diffs.push('headline position or width');
    if (!near(item.device.x, first.device.x) || !near(item.device.y, first.device.y) || !near(item.device.width, first.device.width)) diffs.push('device position or size');
    if (diffs.length) add('warn: grid differs from the first frame', item.frame, `${diffs.join(', ')} differ from "${first.frame.name}"`);
  }
}

const summary = {};
const samples = {};
for (const [rule, hits] of Object.entries(findings)) {
  if (!hits.length) continue;
  summary[rule] = hits.length;
  samples[rule] = hits.slice(0, SAMPLE_LIMIT);
}
const failed = Object.keys(summary).some((rule) => rule.startsWith('fail'));
return { verdict: failed ? 'fail' : 'pass', framesChecked: frames.length, missingRoots: missing, sizes: Object.fromEntries(Object.entries(bySize).map(([s, g]) => [s, g.length])), summary, samples };
