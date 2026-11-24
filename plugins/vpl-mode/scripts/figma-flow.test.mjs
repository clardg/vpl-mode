import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./figma-flow.js', import.meta.url), 'utf8');
const AsyncFunction = (async () => {}).constructor;

const go = (to, navigation = 'NAVIGATE') => ({ actions: [{ type: 'NODE', destinationId: to, navigation }] });
const back = () => ({ actions: [{ type: 'BACK' }] });
const screen = (id, reactions = []) => ({ id, name: id, type: 'FRAME', reactions, children: [] });
const button = (id, reactions) => ({ id, name: id, type: 'INSTANCE', reactions, children: [] });

async function flow(screens, { starts = [], roots = ['new'], elsewhere = [] } = {}) {
  const section = { id: 'new', name: 'new', type: 'SECTION', children: screens };
  const page = { type: 'PAGE', children: [section], flowStartingPoints: starts.map(([name, nodeId]) => ({ name, nodeId })) };
  const otherPage = { type: 'PAGE', children: elsewhere };
  const nodes = {};
  const index = (node, parent) => {
    node.parent = parent;
    nodes[node.id] = node;
    (node.children || []).forEach((child) => index(child, node));
  };
  index(section, page);
  elsewhere.forEach((node) => index(node, otherPage));
  page.findAll = (test) => Object.values(nodes).filter((node) => pageOf(node) === page && test(node));
  const configured = source.replace("const ROOTS = ['<node id>'];", `const ROOTS = ${JSON.stringify(roots)};`);
  const figma = { currentPage: page, getNodeByIdAsync: async (id) => nodes[id] || null, setCurrentPageAsync: async () => {} };
  return new AsyncFunction('figma', configured)(figma);
}
const pageOf = (node) => (node.type === 'PAGE' ? node : pageOf(node.parent));

const linked = await flow([screen('a', [go('b')]), { ...screen('b'), children: [button('back', [back()])] }], { starts: [['Start', 'a']] });
assert.equal(linked.verdict, 'pass', 'a linked flow from a starting point passes');
assert.equal(linked.summary['warn: dead end'], undefined, 'a Back button inside the screen counts as a way out');
assert.equal(linked.summary['note: entered only from a starting point'], 1, 'a screen nothing links to is noted');

assert.equal((await flow([screen('a', [go('b')]), screen('b')], { starts: [['Start', 'a']] })).summary['warn: dead end'], 1, 'a screen with no way out warns');
assert.equal((await flow([screen('a', [back()]), screen('lost', [back()])], { starts: [['Start', 'a']] })).summary['warn: unreachable from any starting point'], 1, 'an unreachable screen warns');
assert.equal((await flow([screen('a', [go('gone')])], { starts: [['Start', 'a']] })).summary['fail: link to a missing node'], 1, 'a link to a deleted node fails');
assert.equal((await flow([screen('a', [go('old')])], { starts: [['Start', 'a']], elsewhere: [screen('old')] })).summary['warn: link leaves the page'], 1, 'a link to another page warns');
assert.equal((await flow([screen('a', [back()])], { starts: [['Start', 'a'], ['Copy', 'a']] })).summary['fail: duplicate starting point'], 1, 'two starting points on one screen fail');
assert.equal((await flow([screen('a', [back()]), screen('b', [back()])], { starts: [['Start', 'a'], ['Start', 'b']] })).summary['fail: duplicate starting point'], 1, 'two starting points with one name fail');
assert.equal((await flow([screen('a', [go('a', 'SCROLL_TO')])], { starts: [['Start', 'a']] })).summary['warn: dead end'], 1, 'scrolling within a screen is not a way out');
console.log('figma-flow: all checks passed');
