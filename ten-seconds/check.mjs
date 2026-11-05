import {
  MODEL,
  QUAKE,
  describePhase,
  formatClock,
  prepareCities,
  surfaceRadiusKm,
} from "./scenario.js";

const cities = prepareCities();
const by = Object.fromEntries(cities.map((city) => [city.id, city]));
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    failed += 1;
    console.error(`FAIL ${message}`);
  }
}

assert(Math.abs(by.hualien.epi - 25.1) < 0.6, `hualien epi ${by.hualien.epi}`);
assert(by.hualien.blind, "hualien should be inside the teaching blind zone");
assert(by.hualien.alert === 8.1, "hualien first bulletin");
assert(by.yilan.alert === 8.1 && by.yilan.lead > 20 && !by.yilan.blind, "yilan lead");
assert(by.yilan.alert < by.yilan.p, "yilan alert beats local P");
assert(by.taipei.alert === null, "taipei national alert absent");
assert(by.newtaipei.alert === null && by.kaohsiung.alert === null, "press-release omissions");
assert(by["hsinchu-city"].alert === null && by["hsinchu-county"].alert === 14.1, "hsinchu contrast");
assert(by.tainan.lead > 30, "tainan keeps tens of seconds");
assert(formatClock(0) === "07:58:09.9", formatClock(0));
assert(formatClock(8.1) === "07:58:18.0", formatClock(8.1));
assert(formatClock(14.1) === "07:58:24.0", formatClock(14.1));
assert(describePhase(0, by.yilan).key === "wait-alert", "yilan opening phase");
assert(describePhase(10, by.yilan).key === "lead", "yilan warning window");
assert(describePhase(8.2, by.hualien).key === "blind", "hualien blind phase");
assert(describePhase(30, by.taipei).key === "miss", "taipei after P without alert");
assert(describePhase(50, by.taipei).key === "shake", "taipei shaking");
assert(surfaceRadiusKm(MODEL.vp, 0, QUAKE.depthKm) === 0, "no surface wave at t=0");
assert(surfaceRadiusKm(MODEL.vs, 2, QUAKE.depthKm) === 0, "S still below the surface at 2 s");

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}

console.log("scenario checks ok");
for (const city of cities) {
  const lead = city.lead == null ? "—" : city.lead.toFixed(1);
  const alert = city.alert == null ? "—" : city.alert.toFixed(1);
  console.log(
    `${city.name}\tepi ${city.epi.toFixed(1)}\tP ${city.p.toFixed(1)}\tS ${city.s.toFixed(1)}\talert ${alert}\tlead ${lead}`,
  );
}
