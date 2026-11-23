/* Run with: node tests/world-core.test.cjs (no dependencies). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sandbox = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../world-engine.js'), 'utf8'), sandbox);
const core = sandbox.ResearchWorldCore;
const destinations = Object.values(core.places);
let sampled = 0;
for (const from of [core.nodes[0], ...destinations]) {
  for (const to of destinations) {
    const route = core.findPath(from, to);
    assert.ok(route.length > 0, `Unreachable: ${to.title}`);
    assert.ok(Math.hypot(route.at(-1).x - to.x, route.at(-1).y - to.y) < 0.01);
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1], b = route[i];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      for (let j = 0; j <= Math.ceil(length); j++) {
        const t = length ? Math.min(1, j / length) : 0;
        assert.ok(core.walkable(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t), 'Route leaves the road');
        sampled++;
      }
    }
  }
}
let player = { ...core.nodes[0] };
const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
for (let i = 0; i < 5000; i++) {
  const [dx, dy] = directions[(i * 31 + Math.floor(i / 8)) % directions.length];
  player = core.moveAlongRoad(player, dx, dy, 17.5);
  assert.ok(core.walkable(player.x, player.y), 'Keyboard movement leaves the road');
}
assert.equal(core.walkable(600, 350), false, 'Courtyard must remain non-walkable');
assert.equal(core.walkable(235, 100), false, 'Building must remain non-walkable');
console.log(`PASS: 20 routes, ${sampled} path samples, 5,000 keyboard moves, building/landscape exclusion.`);
