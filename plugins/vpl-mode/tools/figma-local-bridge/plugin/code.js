// Runs scripts sent by the local bridge server inside Figma desktop,
// so fonts installed only on this Mac can be loaded. Scripts use the same style
// as the Figma MCP's use_figma: top-level await and `return`.
figma.showUI(__html__, { width: 260, height: 132, title: 'Claude Local Bridge' });

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function safe(value) {
  const seen = new WeakSet();
  return JSON.parse(JSON.stringify(value === undefined ? null : value, (k, v) => {
    if (typeof v === 'symbol') return String(v);
    if (v && typeof v === 'object') {
      if (seen.has(v)) return '[circular]';
      seen.add(v);
      if (typeof v.id === 'string' && typeof v.type === 'string' && 'parent' in v) {
        return { id: v.id, type: v.type, name: v.name };
      }
    }
    return v;
  }));
}

figma.ui.onmessage = async (msg) => {
  if (!msg || msg.type !== 'job') return;
  let payload;
  try {
    const fn = new AsyncFunction('figma', msg.code);
    const result = await fn(figma);
    payload = { ok: true, result: safe(result), file: figma.root.name };
  } catch (e) {
    payload = { ok: false, error: String((e && e.stack) || e), file: figma.root.name };
  }
  figma.ui.postMessage({ type: 'result', id: msg.id, payload });
};
