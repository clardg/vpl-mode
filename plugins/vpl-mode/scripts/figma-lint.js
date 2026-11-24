// Read-only check for Figma work. Paste into use_figma with ROOTS set to the new or changed frames or sections.
const ROOTS = ['<node id>'];
// Sections or frames the new work was duplicated from. A finding at the same layer path there is inherited, not new.
const BASELINE = [];
// Words that must not survive in the new work, such as the source state or a source person's name.
const LEFTOVERS = [];
const SAMPLE_LIMIT = 15;

const RULES = [
  'fail: text without style or variable',
  'fail: colour without style or variable',
  'fail: detached instance',
  'fail: overlapping siblings',
  'fail: leftover from the source',
  'warn: fixed-height text may clip',
  'warn: spacing or radius without variable',
];

const SPACING = ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing', 'counterAxisSpacing', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'];
const leftoverPatterns = LEFTOVERS.map((word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'));

async function lintRoots(ids) {
  const findings = Object.fromEntries(RULES.map((rule) => [rule, []]));
  // trail is the layer path below the screen, so a duplicate and its source share it.
  const add = (rule, node, trail, detail) => findings[rule].push({ id: node.id, name: node.name, rule, trail, detail });

  function checkPaints(node, trail, paints, styleId, label) {
    if (paints === figma.mixed || !Array.isArray(paints)) return;
    if (styleId && styleId !== figma.mixed) return;
    for (const paint of paints) {
      if (paint.type === 'SOLID' && paint.visible !== false && !paint.boundVariables?.color) {
        add('fail: colour without style or variable', node, trail, label);
        return;
      }
    }
  }

  function checkText(node, trail) {
    const bound = node.boundVariables || {};
    const styled = node.textStyleId === figma.mixed || !!node.textStyleId;
    if (!styled && !bound.fontSize && !bound.fontFamily) {
      add('fail: text without style or variable', node, trail, node.characters.slice(0, 40));
    }
    if (node.textAutoResize === 'NONE' && node.textTruncation !== 'ENDING') {
      add('warn: fixed-height text may clip', node, trail, node.characters.slice(0, 40));
    }
  }

  function checkSpacing(node, trail) {
    const bound = node.boundVariables || {};
    const unbound = SPACING.filter((key) => {
      if (!(key in node) || bound[key]) return false;
      if (key.endsWith('Radius')) return typeof node[key] === 'number' && node[key] > 0;
      if (node.layoutMode === undefined || node.layoutMode === 'NONE') return false;
      return typeof node[key] === 'number' && node[key] > 0;
    });
    if (unbound.length) add('warn: spacing or radius without variable', node, trail, unbound.join(', '));
  }

  // Text is checked for leftovers, and so is the layer name of anything showing a photo.
  function checkLeftovers(node, trail) {
    const hasImage = Array.isArray(node.fills) && node.fills.some((paint) => paint.type === 'IMAGE');
    const haystacks = [];
    if (node.type === 'TEXT') haystacks.push(node.characters.replace(/ /g, ' '));
    if (hasImage) haystacks.push(node.name);
    for (const text of haystacks) {
      const hit = leftoverPatterns.find((pattern) => pattern.test(text));
      if (hit) add('fail: leftover from the source', node, trail, `"${text.slice(0, 40)}" matches ${hit}`);
    }
  }

  function checkOverlaps(parent) {
    const siblings = parent.children.filter((c) => c.visible && c.absoluteBoundingBox && (c.type === 'FRAME' || c.type === 'SECTION' || c.type === 'COMPONENT' || c.type === 'COMPONENT_SET'));
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        if (intersects(siblings[i].absoluteBoundingBox, siblings[j].absoluteBoundingBox)) {
          add('fail: overlapping siblings', siblings[i], [], `overlaps "${siblings[j].name}" (${siblings[j].id})`);
        }
      }
    }
  }

  // Instance contents come from their main component, so only the leftover check looks inside them.
  function walk(node, trail, inInstance) {
    if (leftoverPatterns.length) checkLeftovers(node, trail);
    if (!inInstance) {
      if ('detachedInfo' in node && node.detachedInfo) add('fail: detached instance', node, trail, '');
      if (node.type === 'TEXT') checkText(node, trail);
      if ('fills' in node && node.type !== 'SECTION') checkPaints(node, trail, node.fills, node.fillStyleId, 'fill');
      if ('strokes' in node && node.type !== 'SECTION') checkPaints(node, trail, node.strokes, node.strokeStyleId, 'stroke');
      if (node.type === 'FRAME' || node.type === 'COMPONENT') checkSpacing(node, trail);
    }
    if (!('children' in node)) return;
    if (node.type === 'INSTANCE' && !leftoverPatterns.length) return;
    const nested = inInstance || node.type === 'INSTANCE';
    for (const child of node.children) walk(child, node.type === 'SECTION' ? [] : [...trail, child.name], nested);
  }

  const missing = [];
  let nodeCount = 0;
  for (const id of ids) {
    const root = await figma.getNodeByIdAsync(id);
    if (!root) {
      missing.push(id);
      continue;
    }
    let page = root;
    while (page.type !== 'PAGE') page = page.parent;
    if (figma.currentPage !== page) await figma.setCurrentPageAsync(page);
    nodeCount += 'findAll' in root ? root.findAll(() => true).length + 1 : 1;
    walk(root, [], false);
    if (root.type === 'SECTION') checkOverlaps(root);
    if (root.parent && 'children' in root.parent) {
      for (const sibling of root.parent.children) {
        if (sibling !== root && sibling.visible && sibling.absoluteBoundingBox && root.absoluteBoundingBox && intersects(root.absoluteBoundingBox, sibling.absoluteBoundingBox)) {
          add('fail: overlapping siblings', root, [], `overlaps "${sibling.name}" (${sibling.id})`);
        }
      }
    }
  }
  return { findings, missing, nodeCount };
}

function intersects(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

const current = await lintRoots(ROOTS);
const inheritedKeys = new Set();
if (BASELINE.length) {
  const baseline = await lintRoots(BASELINE);
  // A leftover sits at the same path as the source by definition, so it is never inherited.
  for (const [rule, hits] of Object.entries(baseline.findings)) {
    if (rule !== 'fail: leftover from the source') hits.forEach((hit) => inheritedKeys.add(`${rule}|${hit.trail.join('/')}`));
  }
}

// A copy can sit deeper than its source (a screen placed inside a device frame), so match the end of the path.
function isInherited(hit) {
  for (let start = 0; start < hit.trail.length; start++) {
    if (inheritedKeys.has(`${hit.rule}|${hit.trail.slice(start).join('/')}`)) return true;
  }
  return false;
}

const summary = {};
const inherited = {};
const samples = {};
for (const [rule, hits] of Object.entries(current.findings)) {
  const fresh = hits.filter((hit) => !isInherited(hit));
  if (hits.length > fresh.length) inherited[rule] = hits.length - fresh.length;
  if (!fresh.length) continue;
  summary[rule] = fresh.length;
  samples[rule] = fresh.slice(0, SAMPLE_LIMIT).map(({ rule: _, trail, ...hit }) => hit);
}
const failed = Object.keys(summary).some((rule) => rule.startsWith('fail'));
return { verdict: failed ? 'fail' : 'pass', nodesScanned: current.nodeCount, missingRoots: current.missing, summary, inherited, samples };
