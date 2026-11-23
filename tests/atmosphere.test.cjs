/* Run with: node tests/atmosphere.test.cjs (no dependencies). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../atmosphere.js'), 'utf8');
new vm.Script(source);
function createScene(reduce = false) {
  const events = new Map(), frames = new Map(), stored = new Map();
  let sequence = 0, clock = 0, renders = 0, clears = 0, intersection;
  const stage = { dataset: {} };
  const toggle = { addEventListener(key, fn) { events.set(`toggle:${key}`, fn); }, setAttribute(key, value) { this[key] = value; } };
  const context = new Proxy({}, {
    get(object, key) {
      if (key === 'setTransform') return () => renders++;
      if (key === 'clearRect') return () => clears++;
      if (key === 'createRadialGradient') return () => ({ addColorStop() {} });
      return object[key] ?? (() => {});
    },
    set(object, key, value) { object[key] = value; return true; }
  });
  const canvas = { getContext: () => context, getBoundingClientRect: () => ({ width: 900, height: 514 }) };
  const preference = { matches: reduce, addEventListener(key, fn) { events.set(`preference:${key}`, fn); } };
  const document = {
    hidden: false,
    querySelector(selector) { return { '.world-stage': stage, '.atmosphere-canvas': canvas, '.ambience-toggle': toggle }[selector]; },
    addEventListener(key, fn) { events.set(`document:${key}`, fn); }
  };
  const sandbox = {
    document,
    window: { devicePixelRatio: 2, matchMedia: () => preference, addEventListener(key, fn) { events.set(`window:${key}`, fn); } },
    sessionStorage: { getItem(key) { return stored.get(key) ?? null; }, setItem(key, value) { stored.set(key, value); } },
    requestAnimationFrame(fn) { const id = ++sequence; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    IntersectionObserver: class { constructor(fn) { intersection = fn; } observe() {} },
    ResizeObserver: class { constructor(fn) { this.fn = fn; } observe() { this.fn(); } }
  };
  vm.runInNewContext(source, sandbox);
  function pump(count) {
    for (let i = 0; i < count; i++) {
      const first = frames.entries().next().value;
      if (!first) break;
      frames.delete(first[0]); first[1](clock += 1000 / 60);
    }
  }
  return { document, stage, toggle, frames, events, stored, pump, intersection: value => intersection([{ isIntersecting: value }]), renders: () => renders, clears: () => clears };
}
const scene = createScene();
assert.equal(scene.stage.dataset.ambient, 'playing');
const start = scene.renders(); scene.pump(60);
assert.ok(scene.renders() - start >= 20 && scene.renders() - start <= 26, 'Ambient drawing should run at about 24fps');
scene.intersection(false); assert.equal(scene.frames.size, 0);
scene.intersection(true); assert.equal(scene.frames.size, 1);
scene.document.hidden = true; scene.events.get('document:visibilitychange')(); assert.equal(scene.frames.size, 0);
scene.document.hidden = false; scene.events.get('document:visibilitychange')(); assert.equal(scene.frames.size, 1);
scene.events.get('window:pagehide')(); assert.equal(scene.frames.size, 0);
scene.events.get('window:pageshow')(); assert.equal(scene.frames.size, 1);
scene.events.get('preference:change')({ matches: true }); assert.equal(scene.frames.size, 0);
const reduced = createScene(true);
assert.equal(reduced.stage.dataset.ambient, 'paused'); assert.equal(reduced.frames.size, 0); assert.equal(reduced.renders(), 0);
console.log('PASS: ambient frame budget, offscreen suspension, background suspension, page restore, reduced motion.');
