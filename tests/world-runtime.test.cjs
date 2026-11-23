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
let clock = 0, lastPlayer = null;
const renderedPositions=[];
function element(id) {
  return { style: {}, dataset: { place: id },
    setAttribute(key, value) { this[key] = value; },
    addEventListener(key, fn) { events.set(`${id}:${key}`, fn); } };
}
for (const id of Object.keys(core.places)) elements.set(id, element(id));
for (const id of ['.world-spawn-label', '.world-reset']) elements.set(id, element(id));
const context = new Proxy({}, {
  get(object, key) {
    if (key === 'translate') return (x, y) => { assert.ok(core.walkable(x, y), 'Rendered avatar left a road'); lastPlayer = {x,y}; renderedPositions.push({x,y,time:clock}); };
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
  devicePixelRatio: 2, matchMedia() { return { matches: false }; }, addEventListener(key, fn) { events.set(`window:${key}`, fn); },
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
assert.equal(entries.length, 0, 'Hover must not navigate');
events.get('publications:pointerleave')(); flush();
// A click inside the road must keep its lateral offset, not attach to a centerline.
const target = {x:340,y:248};
events.get('canvas:click')({clientX:20+target.x/core.width*900,clientY:100+target.y/core.height*514}); flush();
assert.ok(Math.hypot(lastPlayer.x-target.x,lastPlayer.y-target.y)<0.01, 'Road click snapped to a centerline');
events.get('canvas:keydown')({key:'s',preventDefault(){}});
for(let i=0;i<3;i++)frames.shift()(clock+=16);
events.get('window:keyup')({key:'s'});flush();
assert.ok(lastPlayer.y>253 && Math.abs(lastPlayer.x-340)<.01, 'Keyboard cannot move sideways across pavement');
const beforeDiagonal = {...lastPlayer};
events.get('canvas:keydown')({key:'d',preventDefault(){}});
events.get('canvas:keydown')({key:'w',preventDefault(){}});
for(let i=0;i<3;i++)frames.shift()(clock+=16);
events.get('window:keyup')({key:'d'});events.get('window:keyup')({key:'w'});flush();
assert.ok(lastPlayer.x>beforeDiagonal.x+4 && lastPlayer.y<beforeDiagonal.y-4, 'Diagonal keyboard movement is constrained to a line');
events.get('.world-reset:click')();flush();

let maxDuration = 0;
for (let pass = 0; pass < 4; pass++) for (const id of Object.keys(core.places)) {
  const before = entries.length, start = clock;
  const origin={...lastPlayer}, sampleStart=renderedPositions.length;
  events.get(`${id}:click`)();
  assert.equal(entries.length,before,'Portal must wait for the teleport animation');
  flush();
  const target=core.places[id], near=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<.01;
  const samples=renderedPositions.slice(sampleStart);
  assert.ok(samples.every(p=>near(p,origin)||near(p,target)),'Teleport must not walk between the two points');
  assert.ok(samples.some(p=>near(p,target)&&p.time-start>=350),'Missing destination materialization');
  assert.equal(entries.length, before + 1);
  const last = entries.at(-1);
  assert.equal(last.url, core.places[id].href);
  assert.ok(Number.isFinite(last.options.portal.x) && Number.isFinite(last.options.portal.y));
  maxDuration = Math.max(maxDuration, last.time - start);
}
assert.ok(maxDuration >= 740 && maxDuration <= 780, 'Teleport must finish its departure and arrival animation');
events.get('.world-reset:click')(); flush();
console.log(`PASS: calibrated renderer, exact road clicks, lateral/diagonal input, hover, 16 automatic entries, reset, max ${maxDuration}ms travel.`);
