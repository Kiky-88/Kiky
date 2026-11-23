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
  player = core.moveOnRoad(player, dx, dy, 17.5);
  assert.ok(core.walkable(player.x, player.y), 'Keyboard movement leaves the road');
}
assert.equal(core.walkable(600, 350), false, 'Courtyard must remain non-walkable');
assert.equal(core.walkable(235, 100), false, 'Building must remain non-walkable');
assert.equal(core.walkable(340, 248), true, 'Off-center pavement must be walkable');
assert.equal(core.walkable(512, 275), true, 'The entire plaza must be walkable');
assert.equal(core.walkable(235, 365), false, 'Do not route through the academy');
assert.equal(core.walkable(750, 365), false, 'Do not route through the studio');
const lateral = core.moveOnRoad({x:340,y:255}, 0, -1, 6);
assert.ok(Math.abs(lateral.y-249)<0.01 && Math.abs(lateral.x-340)<0.01, 'Allow lateral movement within a horizontal road');
const diagonal = core.moveOnRoad({x:340,y:249}, 1, 1, 7);
assert.ok(diagonal.x>344 && diagonal.y>253, 'Allow diagonal movement within pavement');
const plazaWalk = core.moveOnRoad({x:490,y:255}, 1, 1, 38);
assert.ok(plazaWalk.x>516 && plazaWalk.y>281, 'Allow free diagonal movement across the plaza');
const edge = core.moveOnRoad({x:340,y:255}, 0, -1, 200);
assert.ok(edge.y>=244 && edge.y<250, 'Stop at the road boundary without returning to center');
const offCenterTarget = {x:345,y:248};
const exactRoute = core.findPath(core.nodes[0], offCenterTarget);
assert.ok(Math.hypot(exactRoute.at(-1).x-offCenterTarget.x, exactRoute.at(-1).y-offCenterTarget.y)<.01, 'Click target must not snap to center');
console.log(`PASS: 20 routes, ${sampled} path samples, 5,000 keyboard moves, building/landscape exclusion, free lateral/diagonal/plaza movement, exact click targets.`);
