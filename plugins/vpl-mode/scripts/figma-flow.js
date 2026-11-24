// Read-only prototype check. Paste into use_figma with ROOTS set to the new or changed sections or screens.
// Links are read from the whole page, so links into the new work from existing screens count.
const ROOTS = ['<node id>'];
const SAMPLE_LIMIT = 15;

const findings = {
  'fail: link to a missing node': [],
  'fail: starting point to a missing node': [],
  'fail: duplicate starting point': [],
  'warn: link leaves the page': [],
  'warn: dead end': [],
  'warn: unreachable from any starting point': [],
  'note: entered only from a starting point': [],
};
const add = (rule, node, detail) => findings[rule].push({ id: node.id, name: node.name, detail });

// A screen is the top-level frame on the page or directly inside a section.
function screenOf(node) {
  while (node.parent && node.parent.type !== 'PAGE' && node.parent.type !== 'SECTION') node = node.parent;
  return node;
}

function pageOf(node) {
  while (node.type !== 'PAGE') node = node.parent;
  return node;
}

function screensUnder(node) {
  if (node.type === 'SECTION') return node.children.flatMap(screensUnder);
  return node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE' ? [node] : [];
}

function actionsOf(reaction) {
  const out = [];
  const visit = (action) => {
    if (!action) return;
    if (action.type === 'CONDITIONAL') action.conditionalBlocks.forEach((block) => block.actions.forEach(visit));
    else out.push(action);
  };
  (reaction.actions || [reaction.action]).forEach(visit);
  return out;
}

const roots = [];
for (const id of ROOTS) {
  const root = await figma.getNodeByIdAsync(id);
  if (root) roots.push(root);
}
if (!roots.length) return { verdict: 'fail', missingRoots: ROOTS };
const page = pageOf(roots[0]);
if (figma.currentPage !== page) await figma.setCurrentPageAsync(page);

const screens = roots.flatMap(screensUnder);
const checked = new Set(screens.map((screen) => screen.id));
const outgoing = new Map();
const incoming = new Map();
const link = (map, from, to) => map.set(from, (map.get(from) || new Set()).add(to));
const exits = new Set();

for (const node of page.findAll((n) => 'reactions' in n && n.reactions.length > 0)) {
  const from = screenOf(node);
  for (const reaction of node.reactions) {
    for (const action of actionsOf(reaction)) {
      if (action.type === 'BACK' || action.type === 'CLOSE' || action.type === 'URL') {
        exits.add(from.id);
        continue;
      }
      if (action.type !== 'NODE' || !action.destinationId) continue;
      if (action.navigation === 'SCROLL_TO' || action.navigation === 'CHANGE_TO') continue;
      const destination = await figma.getNodeByIdAsync(action.destinationId);
      if (!destination) {
        if (checked.has(from.id)) add('fail: link to a missing node', node, `on "${from.name}" to ${action.destinationId}`);
        continue;
      }
      if (pageOf(destination) !== page) {
        if (checked.has(from.id)) add('warn: link leaves the page', node, `on "${from.name}" to "${destination.name}" (${destination.id})`);
        exits.add(from.id);
        continue;
      }
      const to = screenOf(destination);
      if (to.id === from.id) continue;
      link(outgoing, from.id, to.id);
      link(incoming, to.id, from.id);
    }
  }
}

const starts = page.flowStartingPoints || [];
const seenIds = new Map();
const seenNames = new Map();
const startScreens = new Set();
const reached = new Set();
const queue = [];
for (const start of starts) {
  const node = await figma.getNodeByIdAsync(start.nodeId);
  if (!node) {
    add('fail: starting point to a missing node', { id: start.nodeId, name: start.name }, '');
    continue;
  }
  const screen = screenOf(node);
  startScreens.add(screen.id);
  if (checked.has(screen.id)) {
    if (seenIds.has(start.nodeId)) add('fail: duplicate starting point', node, `"${start.name}" and "${seenIds.get(start.nodeId)}" start on the same screen`);
    else if (seenNames.has(start.name)) add('fail: duplicate starting point', node, `name "${start.name}" is also used for ${seenNames.get(start.name)}`);
  }
  seenIds.set(start.nodeId, start.name);
  seenNames.set(start.name, start.nodeId);
  if (!reached.has(screen.id)) {
    reached.add(screen.id);
    queue.push(screen.id);
  }
}
while (queue.length) {
  for (const next of outgoing.get(queue.shift()) || []) {
    if (!reached.has(next)) {
      reached.add(next);
      queue.push(next);
    }
  }
}

for (const screen of screens) {
  if (!outgoing.has(screen.id) && !exits.has(screen.id)) add('warn: dead end', screen, 'no link, Back, Close or URL');
  if (!reached.has(screen.id)) add('warn: unreachable from any starting point', screen, '');
  else if (startScreens.has(screen.id) && !incoming.has(screen.id)) add('note: entered only from a starting point', screen, '');
}

const summary = {};
const samples = {};
for (const [rule, hits] of Object.entries(findings)) {
  if (!hits.length) continue;
  summary[rule] = hits.length;
  samples[rule] = hits.slice(0, SAMPLE_LIMIT);
}
const failed = Object.keys(summary).some((rule) => rule.startsWith('fail'));
return { verdict: failed ? 'fail' : 'pass', screensChecked: screens.length, startingPoints: starts.length, summary, samples };
