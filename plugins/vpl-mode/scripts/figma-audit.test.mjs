import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./figma-audit.js', import.meta.url), 'utf8');
const AsyncFunction = (async () => {}).constructor;

const box = (width = 24, height = 24) => ({ x: 0, y: 0, width, height });
const node = (type, name, props = {}) => ({ id: name, name, type, fills: [], absoluteBoundingBox: box(375, 812), children: [], ...props });
const frame = (name, children = [], props) => node('FRAME', name, { children, ...props });
const section = (name, children) => node('SECTION', name, { children });
const vector = (name = 'Vector') => node('VECTOR', name, { absoluteBoundingBox: box() });
const instance = (name, main) => node('INSTANCE', name, { getMainComponentAsync: async () => main });

function findAll(root, test) {
  const out = [];
  const visit = (n) => (n.children || []).forEach((child) => {
    if (test(child)) out.push(child);
    visit(child);
  });
  visit(root);
  return out;
}
function index(n, parent) {
  n.parent = parent;
  n.findAll = (test) => findAll(n, test);
  n.findAllWithCriteria = ({ types }) => findAll(n, (child) => types.includes(child.type));
  (n.children || []).forEach((child) => index(child, n));
}

async function audit(children, { components = [] } = {}) {
  const page = node('PAGE', 'HiFi', { children });
  const library = node('PAGE', 'Components', { children: components });
  index(node('DOCUMENT', 'file', { children: [page, library] }), null);
  const configured = source.replace("const PAGE = '<page id>';", "const PAGE = 'HiFi';");
  const figma = { currentPage: page, getNodeByIdAsync: async (id) => (id === 'HiFi' ? page : null), setCurrentPageAsync: async () => {} };
  return new AsyncFunction('figma', configured)(figma);
}

const button = node('COMPONENT', 'Button', { width: 343, height: 48 });
const noted = (name, children = []) => frame(name, children, { annotations: [{ label: 'Tap opens the sheet' }] });

const clean = await audit([section('Sign up', [noted('Welcome', [instance('Button', button)])])], { components: [button] });
assert.equal(clean.verdict, 'pass', 'an annotated screen built from instances passes');
assert.deepEqual(clean.componentRoots, ['Button'], 'local components the page uses are returned for figma-lint');
assert.equal(clean.sections[0].annotatedScreens, 1, 'native annotations count');

const handBuilt = await audit([section('Sign up', [noted('Welcome', [frame('Button 2', [], { width: 343, height: 48 })]), noted('Done', [instance('Button', button)])])], { components: [button] });
assert.equal(handBuilt.summary['warn: hand-built copy of a component'], 1, 'a frame named like a component warns');
const generic = node('COMPONENT', 'Container');
assert.equal((await audit([section('S', [noted('A', [frame('Container'), instance('Box', generic)])])], { components: [generic] })).verdict, 'pass', 'generic names are not compared');
const set = node('COMPONENT_SET', 'Text field', { children: [node('COMPONENT', 'State=Error', { width: 343, height: 56 })] });
index(set, null);
const libraryUse = await audit([section('S', [noted('A', [instance('Field', set.children[0]), frame('Text field', [], { width: 343, height: 56 })])])]);
assert.equal(libraryUse.summary['warn: hand-built copy of a component'], 1, 'a component set used by an instance is known by its set name');

assert.equal((await audit([section('S', [noted('A', [frame('Close', [vector(), vector()], { absoluteBoundingBox: box() })])])])).summary['warn: icon not from a component'], 1, 'a small group of vectors warns once');
assert.equal((await audit([section('S', [noted('A', [frame('Divider', [node('RECTANGLE', 'Line', { absoluteBoundingBox: box(24, 1) })], { absoluteBoundingBox: box(24, 1) })])])])).verdict, 'pass', 'rectangles alone are not icons');
const closeIcon = node('COMPONENT', 'Icon/close');
assert.equal((await audit([section('S', [noted('A', [instance('Icon', closeIcon)])])], { components: [closeIcon] })).verdict, 'pass', 'an icon instance passes');

const bare = await audit([section('Profile', [frame('Edit'), frame('View')])]);
assert.equal(bare.summary['warn: section without annotations'], 1, 'a section with no annotations warns');
assert.equal(bare.summary['note: screen without annotations'], 2, 'each unannotated screen is noted');
const sideNotes = await audit([section('Profile', [frame('Edit'), frame('Dev notes')])]);
assert.equal(sideNotes.summary['warn: section without annotations'], undefined, 'a notes frame beside the screens counts for the section');
assert.equal(sideNotes.screens, 1, 'a notes frame is not a screen');

assert.equal((await audit([noted('Loose')])).summary['note: screen outside a section'], 1, 'a screen outside a section is noted');
const picker = node('COMPONENT', 'Photo picker');
const overlay = { ...instance('.PhotoPicker', picker), children: [frame('Wifi', [vector()], { absoluteBoundingBox: box() })], annotations: [{}] };
assert.equal((await audit([section('S', [overlay])], { components: [picker] })).verdict, 'pass', 'a screen that is an instance is not searched');
const nested = await audit([section('Sign Up / Email', [noted('A'), section('Sign Up / Email / Password States', [noted('B')])])]);
assert.equal(nested.sections[1].name, 'Sign Up / Email / Password States', 'a nested section name that repeats its parent is not doubled');
const wrapper = await audit([section('S', [noted('A', [frame('Button', [], { width: 343, height: 184 }), instance('Button', button)])])]);
assert.equal(wrapper.verdict, 'pass', 'a frame named like a component but far from its size is a wrapper');
const detached = await audit([section('S', [noted('A', [frame('Button', [], { width: 343, height: 48, detachedInfo: { type: 'local' } }), instance('Button', button)])])]);
assert.equal(detached.verdict, 'pass', 'a detached instance is left to figma-lint');
const sized = (name, main) => ({ ...instance(name, main), width: 343, height: 48 });
const wrapped = await audit([section('S', [noted('A', [frame('Button', [sized('Button', button)], { width: 343, height: 48 })])])]);
assert.equal(wrapped.verdict, 'pass', 'a frame wrapping an instance of its own size is a wrapper');
const infoCard = await audit([section('Home', [frame('Home'), instance('.Infomation', node('COMPONENT', '.Infomation'))])]);
assert.equal(infoCard.summary['warn: section without annotations'], undefined, 'an .Infomation card beside the screens counts as an annotation');
assert.equal(infoCard.screens, 1, 'an .Infomation card is not a screen');
const deleted = { ...node('COMPONENT', '.Index Bar'), parent: null };
const orphan = await audit([section('Trade Book', [noted('List', [instance('Index', deleted)])])]);
assert.equal(orphan.summary['warn: instance of a deleted component'], 1, 'an instance whose component left the file warns');
assert.deepEqual(orphan.componentRoots, [], 'a deleted component is not handed to figma-lint');
const infoText = await audit([section('Membership', [frame('Plans', [node('TEXT', 'Info Text')])])]);
assert.equal(infoText.summary['warn: section without annotations'], 1, 'a text layer called Info Text is not an annotation');
console.log('figma-audit: all checks passed');
