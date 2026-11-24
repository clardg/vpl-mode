import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./figma-lint.js', import.meta.url), 'utf8');
const AsyncFunction = (async () => {}).constructor;

const box = (x, y, width = 100, height = 100) => ({ x, y, width, height });
const solid = (bound) => [{ type: 'SOLID', boundVariables: bound ? { color: {} } : {} }];
const text = (props) => ({ id: 't', name: 'T', type: 'TEXT', characters: 'Hi', visible: true, textStyleId: '', textAutoResize: 'HEIGHT', textTruncation: 'DISABLED', fills: solid(true), ...props });
const frame = (id, props = {}) => ({ id, name: id, type: 'FRAME', visible: true, absoluteBoundingBox: box(0, 0), fills: [], strokes: [], children: [], ...props });

async function lint(root, { baseline, leftovers = [] } = {}) {
  const page = { type: 'PAGE', children: [root] };
  const nodes = { root, base: baseline };
  for (const node of [root, baseline].filter(Boolean)) {
    node.parent = page;
    node.findAll ??= () => [];
  }
  const configured = source
    .replace("const ROOTS = ['<node id>'];", "const ROOTS = ['root'];")
    .replace('const BASELINE = [];', `const BASELINE = ${baseline ? "['base']" : '[]'};`)
    .replace('const LEFTOVERS = [];', `const LEFTOVERS = ${JSON.stringify(leftovers)};`);
  const figma = { mixed: Symbol('mixed'), currentPage: page, getNodeByIdAsync: async (id) => nodes[id], setCurrentPageAsync: async () => {} };
  return new AsyncFunction('figma', configured)(figma);
}
const section = (children, id = 's') => ({ id, name: id, type: 'SECTION', visible: true, absoluteBoundingBox: box(0, 0, 999, 999), fills: solid(false), strokes: solid(false), children });

assert.equal((await lint(section([frame('a')]))).verdict, 'pass', 'clean work and section chrome pass');
assert.equal((await lint(frame('a', { children: [text()] }))).summary['fail: text without style or variable'], 1, 'unbound text fails');
assert.equal((await lint(frame('a', { children: [text({ textStyleId: 'S:1' })] }))).verdict, 'pass', 'styled text passes');
assert.equal((await lint(frame('a', { fills: solid(false) }))).summary['fail: colour without style or variable'], 1, 'unbound fill fails');
assert.equal((await lint(frame('a', { detachedInfo: { type: 'local' } }))).summary['fail: detached instance'], 1, 'detached instance fails');
assert.equal((await lint(section([frame('a'), frame('b', { absoluteBoundingBox: box(50, 50) })]))).summary['fail: overlapping siblings'], 1, 'overlapping frames fail');
assert.equal((await lint(section([frame('a'), frame('b', { absoluteBoundingBox: box(200, 0) })]))).summary['fail: overlapping siblings'], undefined, 'separate frames pass');
assert.equal((await lint(frame('a', { children: [text({ textStyleId: 'S:1', textAutoResize: 'NONE' })] }))).summary['warn: fixed-height text may clip'], 1, 'fixed-height text warns');
assert.equal((await lint(frame('a', { layoutMode: 'VERTICAL', paddingTop: 8 }))).summary['warn: spacing or radius without variable'], 1, 'unbound padding warns');

// Leftovers from the source screen
const styled = (characters) => text({ textStyleId: 'S:1', characters });
assert.equal((await lint(frame('a', { children: [styled('Your VIC ballot')] }), { leftovers: ['VIC'] })).summary['fail: leftover from the source'], 1, 'leftover word fails, through a non-breaking space');
assert.equal((await lint(frame('a', { children: [styled('Victoria')] }), { leftovers: ['VIC'] })).verdict, 'pass', 'a longer word containing it passes');
const inInstance = { id: 'i', name: 'Card', type: 'INSTANCE', visible: true, fills: [], children: [styled('Lisa Ray')] };
assert.equal((await lint(frame('a', { children: [inInstance] }), { leftovers: ['Lisa Ray'] })).summary['fail: leftover from the source'], 1, 'leftover text inside an instance fails');
const photo = { id: 'p', name: 'Lisa Ray', type: 'RECTANGLE', visible: true, fills: [{ type: 'IMAGE' }], strokes: [] };
assert.equal((await lint(frame('a', { children: [photo] }), { leftovers: ['Lisa Ray'] })).summary['fail: leftover from the source'], 1, 'a photo layer named after the source fails');

// Fails copied from the source are inherited, not new
const screenWith = (id, children) => section([frame(id, { children })], `s-${id}`);
const vector = () => ({ id: 'v', name: 'Vector', type: 'VECTOR', visible: true, fills: solid(false), strokes: [] });
const inherited = await lint(screenWith('copy', [vector()]), { baseline: screenWith('original', [vector()]) });
assert.equal(inherited.verdict, 'pass', 'a fail at the same layer path in the source is inherited');
assert.equal(inherited.inherited['fail: colour without style or variable'], 1, 'inherited fails are still counted');
const added = await lint(screenWith('copy', [vector(), { ...vector(), name: 'New badge' }]), { baseline: screenWith('original', [vector()]) });
assert.equal(added.summary['fail: colour without style or variable'], 1, 'a fail the source does not have is new');
const nested = frame('artwork', { children: [frame('Device', { children: [frame('Screen', { children: [frame('Home', { children: [vector()] })] })] })] });
assert.equal((await lint(section([nested]), { baseline: section([frame('Home', { children: [vector()] })], 'src') })).verdict, 'pass', 'a source screen placed deeper, inside a device, still counts as inherited');
const leftover = await lint(screenWith('copy', [styled('VIC')]), { baseline: screenWith('original', [styled('VIC')]), leftovers: ['VIC'] });
assert.equal(leftover.summary['fail: leftover from the source'], 1, 'a leftover is never inherited from the source');
console.log('figma-lint: all checks passed');
