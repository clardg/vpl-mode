// Read-only design audit of a HiFi page. Paste into use_figma with PAGE set to the HiFi page id.
// Reports the screen inventory, layers that should be component instances, and annotation coverage.
// Variable binding is figma-lint's job: run it on the returned componentRoots and on the page's sections.
const PAGE = '<page id>';
const SAMPLE_LIMIT = 15;
const ICON_MAX = 48;
// Layers the file uses as its own annotations, when it doesn't use Figma's.
// Overlay components often start with a dot, and "Infomation" is a real spelling in client files.
const ANNOTATION_NAME = /annotat|^\.?infor?mation\b|^\.info\b|dev ?notes?\b|^\.?notes?\b|callout|^\.?specs?\b/i;
// Layer names too generic to compare with component names.
const GENERIC = new Set(['frame', 'group', 'container', 'content', 'wrapper', 'layout', 'stack', 'row', 'column', 'section', 'rectangle', 'vector', 'image', 'text', 'body', 'left', 'right', 'top', 'bottom']);
const SHAPES = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'ELLIPSE', 'LINE', 'POLYGON', 'STAR', 'RECTANGLE']);

const findings = {
  'warn: hand-built copy of a component': [],
  'warn: icon not from a component': [],
  'warn: instance of a deleted component': [],
  'warn: section without annotations': [],
  'note: screen without annotations': [],
  'note: screen outside a section': [],
};
const add = (rule, node, detail) => findings[rule].push({ id: node.id, name: node.name, detail });

const normalise = (name) => name.split('/').pop().toLowerCase().replace(/[^a-z]+/g, ' ').trim();
const isAnnotationLayer = (node) => ANNOTATION_NAME.test(node.name.trim());
const hasNativeAnnotations = (node) => Array.isArray(node.annotations) && node.annotations.length > 0;
const hasImage = (node) => Array.isArray(node.fills) && node.fills.some((paint) => paint.type === 'IMAGE');

// A drawing made only of shapes, small enough to be an icon.
function isLooseIcon(node) {
  if (node.type === 'INSTANCE' || hasImage(node)) return false;
  const box = node.absoluteBoundingBox;
  if (!box || box.width > ICON_MAX || box.height > ICON_MAX) return false;
  if (SHAPES.has(node.type)) return node.type !== 'RECTANGLE';
  if (node.type !== 'GROUP' && node.type !== 'FRAME') return false;
  const leaves = node.findAll((n) => !('children' in n) || n.children.length === 0);
  return leaves.length > 0 && leaves.every((leaf) => SHAPES.has(leaf.type) && !hasImage(leaf)) && leaves.some((leaf) => leaf.type !== 'RECTANGLE');
}

const page = await figma.getNodeByIdAsync(PAGE);
if (!page || page.type !== 'PAGE') return { verdict: 'fail', error: `${PAGE} is not a page` };
if (figma.currentPage !== page) await figma.setCurrentPageAsync(page);

// Components are the ones the page uses, found through its instances, so other pages never load.
// Library components count by name. Local ones are also returned as componentRoots for figma-lint.
const componentNames = new Map();
const componentRoots = new Set();
const nameOf = (component) => (component.parent && component.parent.type === 'COMPONENT_SET' ? component.parent : component);
const onPage = (node) => {
  while (node && node.type !== 'PAGE') node = node.parent;
  return !!node;
};
const seenMains = new Set();
for (const instance of page.findAllWithCriteria({ types: ['INSTANCE'] })) {
  const main = await instance.getMainComponentAsync();
  if (!main || seenMains.has(main.id)) continue;
  seenMains.add(main.id);
  const named = nameOf(main);
  componentNames.set(normalise(named.name), { name: named.name, width: main.width, height: main.height });
  if (main.remote) continue;
  if (onPage(named)) componentRoots.add(named.id);
  else add('warn: instance of a deleted component', instance, `"${named.name}" is no longer on any page`);
}
for (const name of [...componentNames.keys()]) if (name.length < 3 || GENERIC.has(name)) componentNames.delete(name);

const SIZE_TOLERANCE = 0.15;
const close = (a, b) => Math.abs(a - b) <= Math.max(a, b) * SIZE_TOLERANCE;
const sameSize = (node, component) => close(node.width, component.width) && close(node.height, component.height);

// Instance contents come from their main component, so the walk stops at instances, including a screen that is one.
function checkScreen(screen) {
  if (screen.type === 'INSTANCE') return;
  const walk = (node) => {
    if (node !== screen) {
      if (node.type === 'INSTANCE') return;
      if (isLooseIcon(node)) {
        add('warn: icon not from a component', node, `in "${screen.name}"`);
        return;
      }
      // A detached instance is figma-lint's finding. A name match far from the component's size,
      // or one wrapping an instance of about its own size, is a wrapper that shares the name.
      const match = (node.type === 'FRAME' || node.type === 'GROUP') && !node.detachedInfo && componentNames.get(normalise(node.name));
      const wrapper = match && node.findAllWithCriteria({ types: ['INSTANCE'] }).some((inner) => sameSize(inner, node));
      if (match && sameSize(node, match) && !wrapper) add('warn: hand-built copy of a component', node, `in "${screen.name}", named like "${match.name}"`);
    }
    if ('children' in node) node.children.forEach(walk);
  };
  walk(screen);
}

const annotatedInside = (screen) => hasNativeAnnotations(screen) || screen.findAll((n) => hasNativeAnnotations(n) || isAnnotationLayer(n)).length > 0;
const isScreen = (node) => (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') && !isAnnotationLayer(node);

const sections = [];
let screenCount = 0;
let annotatedCount = 0;
// Nested section names often repeat their parent's already.
function auditSection(section, parentName) {
  const name = parentName && !section.name.startsWith(parentName) ? `${parentName} / ${section.name}` : section.name;
  const screens = section.children.filter(isScreen);
  const notes = section.children.filter((n) => n.type !== 'SECTION' && !isScreen(n) && (isAnnotationLayer(n) || hasNativeAnnotations(n)));
  let annotated = 0;
  for (const screen of screens) {
    checkScreen(screen);
    if (annotatedInside(screen)) annotated++;
    else add('note: screen without annotations', screen, `in "${name}"`);
  }
  if (screens.length) {
    sections.push({ id: section.id, name, screens: screens.length, annotatedScreens: annotated, sectionNotes: notes.length });
    if (!annotated && !notes.length) add('warn: section without annotations', section, `${screens.length} screens`);
  }
  screenCount += screens.length;
  annotatedCount += annotated;
  section.children.filter((n) => n.type === 'SECTION').forEach((child) => auditSection(child, name));
}

for (const node of page.children) {
  if (node.type === 'SECTION') auditSection(node, '');
  else if (isScreen(node)) {
    add('note: screen outside a section', node, '');
    checkScreen(node);
    screenCount++;
    if (annotatedInside(node)) annotatedCount++;
    else add('note: screen without annotations', node, 'outside a section');
  }
}

const summary = {};
const samples = {};
for (const [rule, hits] of Object.entries(findings)) {
  if (!hits.length) continue;
  summary[rule] = hits.length;
  samples[rule] = hits.slice(0, SAMPLE_LIMIT);
}
const warned = Object.keys(summary).some((rule) => rule.startsWith('warn'));
return { verdict: warned ? 'warn' : 'pass', page: page.name, screens: screenCount, annotatedScreens: annotatedCount, componentsKnown: componentNames.size, componentRoots: [...componentRoots], sections, summary, samples };
