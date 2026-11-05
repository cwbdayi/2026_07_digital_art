import { renderDemoWave } from "./wave.js";
import { PRESETS, SeismicSource } from "./source.js";
import { createBreathAudio } from "./audio.js";
import { createVisual } from "./visual.js";

const audioBtn = document.getElementById("audioBtn");
const volume = document.getElementById("volume");
const preset = document.getElementById("preset");
const intensity = document.getElementById("intensity");
const pulseBtn = document.getElementById("pulseBtn");
const statusEl = document.getElementById("status");
const readout = document.getElementById("readout");
const wsUrl = document.getElementById("wsUrl");
const wsLabel = document.getElementById("wsLabel");
const canvas = document.getElementById("stage");

for (const item of PRESETS) {
  const option = document.createElement("option");
  option.value = item.id;
  option.textContent = item.name;
  preset.append(option);
}

const params = new URLSearchParams(location.search);
if (params.get("ws")) {
  wsUrl.value = params.get("ws");
  document.querySelector('input[name="mode"][value="ws"]').checked = true;
  wsLabel.hidden = false;
}

let demo = renderDemoWave();
let usedFetch = false;
let audioError = "";
try {
  const response = await fetch("sample-wave.json");
  if (!response.ok) throw new Error(String(response.status));
  const data = await response.json();
  if (data && Array.isArray(data.samples) && data.samples.length > 10) {
    demo = data;
    usedFetch = true;
  }
} catch {
  usedFetch = false;
}

const source = new SeismicSource(demo);
const audio = createBreathAudio();
const visual = createVisual(canvas);
visual.resize();

function measure() {
  const mast = document.querySelector(".mast").getBoundingClientRect();
  const bar = document.querySelector(".toolbar").getBoundingClientRect();
  visual.setInsets({
    top: mast.bottom,
    bottom: window.innerHeight - bar.top,
    left: 16,
    right: 16,
  });
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function renderReadout(snap) {
  const seconds = Math.floor(snap.loopT);
  const label = snap.eventEnergy > 0.35 ? "事件" : "呼吸";
  const sourceLabel = snap.mode === "ws" ? "橋接" : "示範";
  readout.innerHTML = `<span>${sourceLabel}</span><strong>${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}</strong><span>${label}</span><span>包絡 ${snap.breath.toFixed(2)}</span>`;
}

function currentMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

function applyMode() {
  const mode = currentMode();
  wsLabel.hidden = mode !== "ws";
  source.setMode(mode, wsUrl.value.trim());
}

applyMode();
source.setIntensity(Number(intensity.value));
audio.setVolume(Number(volume.value));
measure();

audioBtn.addEventListener("click", async () => {
  try {
    if (audio.audible) {
      audio.stop();
      audioBtn.textContent = "開始聲音";
      audioBtn.setAttribute("aria-pressed", "false");
      return;
    }
    audioBtn.textContent = "停止聲音";
    audioBtn.setAttribute("aria-pressed", "true");
    await audio.start();
    audioError = "";
  } catch (error) {
    audio.stop();
    audioBtn.textContent = "開始聲音";
    audioBtn.setAttribute("aria-pressed", "false");
    audioError = error.message || "無法啟動聲音。";
  }
});

volume.addEventListener("input", () => audio.setVolume(Number(volume.value)));
intensity.addEventListener("input", () => source.setIntensity(Number(intensity.value)));
preset.addEventListener("change", () => source.setPreset(preset.value));
pulseBtn.addEventListener("click", () => source.trigger(1));
for (const input of document.querySelectorAll('input[name="mode"]')) {
  input.addEventListener("change", applyMode);
}
wsUrl.addEventListener("change", applyMode);

window.addEventListener("keydown", (event) => {
  if (event.target.closest("button, input, select, textarea, a")) return;
  if (event.code === "Space") {
    event.preventDefault();
    audioBtn.click();
  } else if (event.key === "e" || event.key === "E") {
    source.trigger(1);
  }
});

window.addEventListener("resize", () => {
  visual.resize();
  measure();
});
if (window.ResizeObserver) {
  const observer = new ResizeObserver(() => {
    measure();
  });
  observer.observe(document.querySelector(".mast"));
  observer.observe(document.querySelector(".toolbar"));
}

window.addEventListener("error", (event) => {
  statusEl.textContent = event.message ? `發生錯誤：${event.message}` : "發生錯誤。";
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  source.advance(dt);
  const snap = source.snapshot();
  visual.draw(snap);
  audio.sync(snap);
  renderReadout(snap);
  const demoName = usedFetch ? "示範波形" : "瀏覽器內合成";
  statusEl.textContent = audioError || (snap.mode === "demo" ? `${demoName}　${snap.preset.blurb}` : snap.status);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
