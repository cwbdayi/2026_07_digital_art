import {
  MAX_T,
  STORIES,
  cityBrief,
  describePhase,
  formatClock,
  formatSeconds,
  prepareCities,
} from "./scenario.js";
import { createMap } from "./map.js";
import { createCues } from "./audio.js";

const cities = prepareCities();
const byId = Object.fromEntries(cities.map((city) => [city.id, city]));
const cues = createCues();
const canvas = document.getElementById("map");
const map = createMap(canvas, cities, (id) => selectCity(id, false));

const briefEl = document.getElementById("brief");
const countEl = document.getElementById("count");
const countLabel = document.getElementById("countLabel");
const countNum = document.getElementById("countNum");
const countSub = document.getElementById("countSub");
const live = document.getElementById("live");
const clock = document.getElementById("clock");
const timeline = document.getElementById("timeline");
const shakeBar = document.getElementById("shakeBar");
const playBtn = document.getElementById("playBtn");
const resetBtn = document.getElementById("resetBtn");
const soundBtn = document.getElementById("soundBtn");
const scrub = document.getElementById("scrub");
const soundNote = document.getElementById("soundNote");
const volume = document.getElementById("volume");

let selectedId = "yilan";
let t = 0;
let playing = false;
let speed = 1;
let liveKey = "";

function chipText(city) {
  if (city.alert == null) return `${city.name} · 未發`;
  if (city.blind) return `${city.name} · 盲區`;
  return `${city.name} · ${Math.round(city.lead)}秒`;
}

function buildStories() {
  const root = document.getElementById("stories");
  for (const story of STORIES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "story";
    button.dataset.id = story.cityId;
    button.innerHTML = `<span class="kicker">${story.kicker}</span><span class="story-title">${story.title}</span><span class="hint">${story.hint}</span>`;
    button.addEventListener("click", () => selectCity(story.cityId, true));
    root.append(button);
  }
}

function buildCities() {
  const root = document.getElementById("cities");
  const groups = [
    [1, "第一報 · 07:58:18"],
    [2, "第二報 · 07:58:24"],
    [0, "未發國家級警報"],
  ];
  for (const [batch, legend] of groups) {
    const field = document.createElement("fieldset");
    const title = document.createElement("legend");
    title.textContent = legend;
    const row = document.createElement("div");
    row.className = "chips";
    field.append(title, row);
    for (const city of cities.filter((item) => item.batch === batch)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chip";
      button.dataset.id = city.id;
      button.textContent = chipText(city);
      button.addEventListener("click", () => selectCity(city.id, false));
      row.append(button);
    }
    root.append(field);
  }
}

let timelineSig = "";

function paintTimeline(city) {
  const rows = [
    { key: "origin", at: 0, name: "發震", time: "0.0s" },
    { key: "p", at: city.p, name: "P 波", time: `${formatSeconds(city.p)}s` },
    {
      key: "alert",
      at: city.alert,
      name: city.alert == null ? "國家級警報未發" : "國家級警報",
      time: city.alert == null ? "—" : `${formatSeconds(city.alert)}s`,
    },
    { key: "s", at: city.s, name: "S 波 · 強震", time: `${formatSeconds(city.s)}s` },
  ];
  let nextKey = null;
  let nextAt = Infinity;
  for (const row of rows) {
    if (row.at == null) continue;
    if (row.at > t && row.at < nextAt) {
      nextAt = row.at;
      nextKey = row.key;
    }
  }
  const sig = `${city.id}|${rows
    .map((row) => {
      if (row.at == null) return `${row.key}:absent`;
      if (t >= row.at) return `${row.key}:done`;
      if (row.key === nextKey) return `${row.key}:next`;
      return `${row.key}:wait`;
    })
    .join(",")}`;
  if (sig === timelineSig) return;
  timelineSig = sig;
  timeline.replaceChildren();
  for (const row of rows) {
    const li = document.createElement("li");
    if (row.at == null) li.className = "absent";
    else if (t >= row.at) li.className = "done";
    else if (row.key === nextKey) li.className = "next";
    const when = document.createElement("span");
    when.className = "when";
    when.textContent = row.time;
    const name = document.createElement("b");
    name.textContent = row.name;
    li.append(when, name);
    timeline.append(li);
  }
}

function markPressed() {
  for (const button of document.querySelectorAll(".chip, .story")) {
    button.setAttribute("aria-pressed", String(button.dataset.id === selectedId));
  }
}

function renderStatic() {
  const city = byId[selectedId];
  briefEl.textContent = cityBrief(city);
  shakeBar.style.width = `${Math.round(city.shake * 100)}%`;
  markPressed();
  paintTimeline(city);
}

function selectCity(id, restart) {
  if (!byId[id]) return;
  selectedId = id;
  if (restart) {
    t = 0;
    playing = true;
    cues.unlock().catch((error) => {
      soundNote.textContent = error.message || "無法啟動音效。";
    });
  }
  renderStatic();
  renderDynamic(true);
}

function cross(prev, next, city) {
  if (!(next > prev) || next - prev > 1.2) return;
  const hit = (mark) => mark != null && mark > prev && mark <= next;
  if (hit(city.p)) cues.p();
  if (hit(city.alert)) cues.alert();
  if (hit(city.s)) cues.shake(city.shake);
}

function renderDynamic(forceLive) {
  const city = byId[selectedId];
  const phase = describePhase(t, city);
  countEl.dataset.tone = phase.tone;
  if (countLabel.textContent !== phase.label) countLabel.textContent = phase.label;
  const secondsLabel = formatSeconds(phase.seconds);
  if (countNum.dataset.v !== secondsLabel) {
    countNum.dataset.v = secondsLabel;
    countNum.innerHTML = `${secondsLabel}<small>秒</small>`;
  }
  if (countSub.textContent !== phase.sub) countSub.textContent = phase.sub;
  clock.textContent = `t = ${formatSeconds(t)} s　${formatClock(t)}`;
  scrub.value = String(t);
  const second = `${phase.key}:${Math.ceil(phase.seconds)}`;
  if (forceLive || second !== liveKey) {
    liveKey = second;
    live.textContent = `${city.name}，${phase.label}，${formatSeconds(phase.seconds)} 秒。${phase.sub}`;
  }
  paintTimeline(city);
  playBtn.textContent = playing ? "暫停" : "播放";
  playBtn.setAttribute("aria-pressed", String(playing));
  map.draw({ t, selectedId, reduced: false });
}

async function togglePlay() {
  playing = !playing;
  if (playing) {
    if (t >= MAX_T) t = 0;
    try {
      await cues.unlock();
    } catch (error) {
      soundNote.textContent = error.message || "無法啟動音效。";
    }
  }
  renderDynamic(false);
}

playBtn.addEventListener("click", togglePlay);
resetBtn.addEventListener("click", () => selectCity(selectedId, true));
soundBtn.addEventListener("click", async () => {
  cues.setEnabled(!cues.enabled);
  soundBtn.textContent = cues.enabled ? "音效開" : "音效關";
  soundBtn.setAttribute("aria-pressed", String(cues.enabled));
  if (cues.enabled) {
    try {
      await cues.unlock();
    } catch (error) {
      soundNote.textContent = error.message || "無法啟動音效。";
    }
  }
});
volume.addEventListener("input", () => cues.setVolume(Number(volume.value)));
for (const button of document.querySelectorAll(".speeds button")) {
  button.addEventListener("click", () => {
    speed = Number(button.dataset.speed);
    for (const peer of document.querySelectorAll(".speeds button")) {
      peer.setAttribute("aria-pressed", String(peer === button));
    }
  });
}
scrub.addEventListener("input", () => {
  const next = Number(scrub.value);
  cross(t, next, byId[selectedId]);
  t = next;
  playing = false;
  renderDynamic(false);
});

window.addEventListener("keydown", (event) => {
  if (event.target.closest("input, select, textarea, a, button")) return;
  if (event.code === "Space") {
    event.preventDefault();
    togglePlay();
  } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    event.preventDefault();
    const index = cities.findIndex((city) => city.id === selectedId);
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = cities[(index + step + cities.length) % cities.length];
    selectCity(next.id, false);
  }
});

buildStories();
buildCities();
renderStatic();
map.resize();
if (window.ResizeObserver) {
  const observer = new ResizeObserver(() => map.resize());
  observer.observe(canvas.parentElement);
}
window.addEventListener("resize", () => map.resize());

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (playing) {
    const prev = t;
    t = Math.min(MAX_T, t + dt * speed);
    cross(prev, t, byId[selectedId]);
    if (t >= MAX_T) playing = false;
  }
  renderDynamic(false);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
