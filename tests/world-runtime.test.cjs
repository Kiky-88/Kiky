/* Run with: node tests/world-runtime.test.cjs (no dependencies). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = {};
for (const file of ['world-engine.js', 'world.js', 'script.js']) {
  source[file] = fs.readFileSync(path.join(root, file), 'utf8');
  new vm.Script(source[file]);
}
const sandbox = {};
vm.runInNewContext(source['world-engine.js'], sandbox);
const core = sandbox.ResearchWorldCore;
const events = new Map(), elements = new Map(), frames = [], entries = [];
let clock = 0;
function element(id) {
  return { style: {}, dataset: { place: id },
    setAttribute(key, value) { this[key] = value; },
    addEventListener(key, fn) { events.set(`${id}:${key}`, fn); } };
}
for (const id of Object.keys(core.places)) elements.set(id, element(id));
for (const id of ['.world-spawn-label', '#destination-kicker', '#destination-title', '#destination-description', '#destination-link', '.world-reset']) elements.set(id, element(id));
const context = new Proxy({}, {
  get(object, key) {
    if (key === 'translate') return (x, y) => assert.ok(core.walkable(x, y), 'Rendered avatar left a road');
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
    return object[key] ?? (() => {});
  },
  set(object, key, value) { object[key] = value; return true; }
});
const canvas = element('canvas');
canvas.getContext = () => context;
canvas.getBoundingClientRect = () => ({ left: 20, top: 100, width: 900, height: 514 });
canvas.focus = () => {};
sandbox.document = {
  querySelector(selector) { return selector === '#research-map' ? canvas : elements.get(selector); },
  querySelectorAll() { return Object.keys(core.places).map(key => elements.get(key)); },
  addEventListener() {}
};
sandbox.window = {
  devicePixelRatio: 2, matchMedia() { return { matches: false }; }, addEventListener() {},
  navigatePage(url, options) { entries.push({ url, options, time: clock }); },
  location: { assign() { throw Error('Expected shared portal transition'); } }
};
sandbox.requestAnimationFrame = fn => { frames.push(fn); return frames.length; };
sandbox.ResizeObserver = class { constructor(fn) { this.fn = fn; } observe() { this.fn(); } };
vm.runInNewContext(source['world.js'], sandbox);
function flush() {
  let count = 0;
  while (frames.length) {
    assert.ok(++count <= 100, 'Animation failed to idle');
    frames.shift()(clock += 16);
  }
}
events.get('publications:pointerenter')(); flush();
assert.equal(elements.get('#destination-title').textContent, 'Publications');
assert.equal(entries.length, 0, 'Hover must not navigate');
events.get('publications:pointerleave')(); flush();
let maxDuration = 0;
for (let pass = 0; pass < 4; pass++) for (const id of Object.keys(core.places)) {
  const before = entries.length, start = clock;
  events.get(`${id}:click`)(); flush();
  assert.equal(entries.length, before + 1);
  const last = entries.at(-1);
  assert.equal(last.url, core.places[id].href);
  assert.ok(Number.isFinite(last.options.portal.x) && Number.isFinite(last.options.portal.y));
  maxDuration = Math.max(maxDuration, last.time - start);
}
assert.ok(maxDuration <= 340, 'Travel became too slow');
events.get('.world-reset:click')(); flush();
assert.equal(elements.get('#destination-title').textContent, 'Choose your next stop.');
console.log(`PASS: calibrated renderer, hover preview, 16 automatic entries, reset, max ${maxDuration}ms travel.`);
