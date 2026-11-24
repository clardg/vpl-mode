import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./figma-artwork.js', import.meta.url), 'utf8');
const AsyncFunction = (async () => {}).constructor;

// Children take positions relative to their frame; artboard() turns them absolute.
const layer = (name, x, y, width, height, props = {}) => ({ id: name, name, type: 'FRAME', x, y, width, height, children: [], ...props });
const headline = (x = 90, width = 1110, lines = 2) => layer('Headline', x, 180, width, lines * 136, { children: [{ id: 'h', name: 'Title', type: 'TEXT', x, y: 180, width, height: lines * 136, fontSize: 120, lineHeight: { unit: 'PIXELS', value: 136 }, children: [] }] });
const device = (x = 175, children = [screen()]) => layer('Device', x, 736, 940, 1975, { children });
const screen = (width = 888, height = 1923, fills = []) => layer('Screen', 201, 762, width, height, { fills });
const parts = () => [layer('Background', 0, 0, 1290, 2796), headline(), device()];

function artboard(name, x, children = parts(), props = {}) {
  const frame = { id: name, name, type: 'FRAME', width: 1290, height: 2796, fills: [{ type: 'SOLID' }], exportSettings: [{ format: 'PNG', constraint: { type: 'SCALE', value: 1 } }], children, absoluteBoundingBox: { x, y: 0, width: 1290, height: 2796 }, ...props };
  const place = (node) => {
    node.absoluteBoundingBox ??= { x: x + node.x, y: node.y, width: node.width, height: node.height };
    node.children.forEach(place);
  };
  children.forEach(place);
  return frame;
}

async function check(frames) {
  const page = { id: 'page', type: 'PAGE', children: frames };
  const configured = source.replace("const ROOTS = ['<node id>'];", "const ROOTS = ['page'];");
  const figma = { currentPage: page, getNodeByIdAsync: async (id) => (id === 'page' ? page : null), setCurrentPageAsync: async () => {} };
  return new AsyncFunction('figma', configured)(figma);
}

const clean = await check([artboard('01-find-6.9', 0), artboard('02-book-6.9', 1400)]);
assert.equal(clean.verdict, 'pass', 'a set on the proven grid passes');
assert.deepEqual(clean.summary, {}, 'and has no warnings');

assert.equal((await check([artboard('01-find', 0)])).summary['fail: frame name has no size'], 1, 'a frame without a size suffix fails');
assert.equal((await check([artboard('01-find-6.5', 0)])).summary['fail: frame size wrong'], 1, 'a 6.9 artboard named 6.5 fails');
assert.equal((await check([artboard('01-find-6.9', 0, parts(), { width: 1320, height: 2868 })])).summary['fail: frame size wrong'], undefined, '1320×2868 is also accepted for 6.9');

const stretched = artboard('01-find-6.9', 0, [headline(), device(175, [screen(888, 1923, [{ type: 'IMAGE', scaleMode: 'STRETCH' }])])]);
assert.equal((await check([stretched])).summary['fail: screen image stretched'], 1, 'a stretched screenshot fails');
assert.equal((await check([artboard('01-find-6.9', 0, [headline(), device(175, [screen(888, 1500)])])])).summary['warn: screen proportions off'], 1, 'a squashed screen warns');
assert.equal((await check([artboard('01-find-6.9', 0, [headline(), device(175, [screen(888, 1579)])])])).summary['warn: screen proportions off'], undefined, 'a home-button iPhone screen passes');

assert.equal((await check([artboard('01-find-6.9', 0), artboard('02-book-6.9', 1400, [headline(), device(200)])])).summary['warn: grid differs from the first frame'], 1, 'a device moved in one frame warns');
assert.equal((await check([artboard('01-find-6.9', 0, [headline(60, 1110), device()])])).summary['warn: unequal side margins'], 1, 'an off-centre headline warns');
assert.equal((await check([artboard('01-find-6.9', 0, [headline(90, 1110, 3), device()])])).summary['warn: headline over 2 lines'], 1, 'a 3-line headline warns');
assert.equal((await check([artboard('01-find-6.9', 0, [headline(), device(), ...[1, 2, 3].map((i) => layer('Breakout', 100 * i, 1200, 600, 300))])])).summary['warn: more than 2 breakouts'], 1, 'three breakouts warn');

const second = artboard('02-book-6.9', 1400);
second.absoluteBoundingBox.y = 3000;
assert.equal((await check([artboard('01-find-6.9', 0), second])).summary['warn: size not in one row'], 1, 'one size spread over two rows warns');
assert.equal((await check([artboard('01-find-6.9', 0, parts(), { exportSettings: [] })])).summary['warn: no PNG 1x export'], 1, 'missing export settings warn');
assert.equal((await check([artboard('01-find-6.9', 0, [headline(), device()], { fills: [] })])).summary['warn: no background fill'], 1, 'no fill and no Background layer warns');
assert.equal((await check([artboard('00-intro-6.9', 0, [layer('Logo', 500, 1200, 290, 290)])])).summary['note: no Headline or Device layer'], 1, 'an intro frame is noted, not failed');
assert.equal((await check([artboard('01-find-play', 0, [], { width: 1080, height: 1920 })])).summary['fail: frame size wrong'], undefined, 'a 1080×1920 Play frame passes');
assert.equal((await check([artboard('01-find-play', 0)])).summary['fail: frame size wrong'], 1, 'an iPhone-size frame named play fails');
assert.equal((await check([artboard('00-banner', 0, [], { width: 1024, height: 500 })])).summary['fail: frame name has no size'], 1, 'a feature graphic needs the -feature suffix');
assert.equal((await check([artboard('00-banner-feature', 0, [], { width: 1024, height: 500 })])).summary['fail: frame size wrong'], undefined, 'a 1024×500 feature graphic passes');
console.log('figma-artwork: all checks passed');
