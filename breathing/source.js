// Seismic source for《臺灣在呼吸》.
//
// Default: a fetched or in-browser demo loop (模擬／示範資料).
// Later: point a WebSocket at a SeedLink/ObsPy bridge. No key is built in.
//
// Text frames:
//   {"type":"hello","station":"HUAL"}
//   {"type":"samples","dt":0.025,"samples":[0.1,-0.2]}
//   {"type":"event","id":"optional","amplitude":1}
// Samples should be roughly -1..1. `event` is what flips the sound and the picture;
// without it, a jump past ±0.92 is treated as an event, with an 8 s refractory.

import { PRESETS, wavelet } from "./wave.js";

export { PRESETS };

export function validWebSocketUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "ws:" || url.protocol === "wss:";
  } catch {
    return false;
  }
}

export class SeismicSource {
  constructor(demo) {
    this.demo = demo;
    this.mode = "demo";
    this.t = 0;
    this.lastDt = 0.016;
    this.history = [];
    this.lp = 0;
    this.env = 0;
    this.eventEnergy = 0;
    this.preset = PRESETS[0];
    this.intensity = 1;
    this.injected = [];
    this.pending = [];
    this.status = "示範迴圈";
    this.ws = null;
    this.wsQueue = [];
    this.wsDt = 0.025;
    this.wsAcc = 0;
    this.wsLast = 0;
    this.wsPeak = 1;
    this.inferHold = 0;
    this.prevAbs = 0;
  }

  setPreset(id) {
    const next = PRESETS.find((item) => item.id === id);
    if (next) this.preset = next;
  }

  setIntensity(value) {
    this.intensity = value;
  }

  trigger(amplitude = 1) {
    const id = `local-${this.t.toFixed(3)}`;
    this.injected.push({ t: this.t, amplitude, id });
    this.kick({ id, amplitude });
  }

  setMode(mode, url) {
    this.closeSocket();
    this.mode = mode === "ws" ? "ws" : "demo";
    this.wsQueue = [];
    this.wsLast = 0;
    this.inferHold = 0;
    this.history = [];
    this.eventEnergy = 0;
    if (this.mode === "demo") {
      this.status = "示範迴圈";
      return;
    }
    if (!validWebSocketUrl(url || "")) {
      this.status = "請填 ws:// 或 wss:// 網址。目前仍無即時樣本。";
      return;
    }
    this.connect(url);
  }

  connect(url) {
    this.status = "正在連上橋接…";
    let socket;
    try {
      socket = new WebSocket(url);
    } catch (error) {
      this.status = "無法開啟 WebSocket。";
      return;
    }
    this.ws = socket;
    socket.onopen = () => {
      if (this.ws !== socket) return;
      this.status = "橋接已連線，等待樣本。";
    };
    socket.onerror = () => {
      if (this.ws !== socket) return;
      this.status = "橋接連線失敗。";
    };
    socket.onclose = () => {
      if (this.ws !== socket) return;
      this.status = "橋接已中斷。";
      this.ws = null;
    };
    socket.onmessage = (event) => {
      if (this.ws !== socket) return;
      this.ingest(event.data);
    };
  }

  closeSocket() {
    const socket = this.ws;
    this.ws = null;
    if (socket) {
      socket.onopen = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      try {
        socket.close();
      } catch {
        // Ignore a socket that never opened.
      }
    }
  }

  ingest(data) {
    if (typeof data !== "string") {
      this.status = "橋接需傳送 JSON 文字框。";
      return;
    }
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      this.status = "橋接送來的不是 JSON。";
      return;
    }
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "hello") {
      const station = typeof msg.station === "string" ? msg.station.slice(0, 32) : "";
      this.status = station ? `已連線 ${station}` : "橋接已連線";
      return;
    }
    if (msg.type === "event") {
      const amplitude = Number(msg.amplitude);
      this.kick({
        id: typeof msg.id === "string" ? msg.id.slice(0, 64) : `ws-${this.t.toFixed(3)}`,
        amplitude: Number.isFinite(amplitude) ? amplitude : 1,
      });
      return;
    }
    if (msg.type === "samples" && Array.isArray(msg.samples)) {
      const dt = Number(msg.dt);
      if (Number.isFinite(dt) && dt > 0.001 && dt < 1) this.wsDt = dt;
      const room = 8000 - this.wsQueue.length;
      if (room <= 0) return;
      const slice = msg.samples.slice(0, room);
      for (const sample of slice) {
        const value = Number(sample);
        if (Number.isFinite(value)) this.wsQueue.push(value);
      }
      const cap = Math.round(5 / this.wsDt);
      if (this.wsQueue.length > cap) this.wsQueue.splice(0, this.wsQueue.length - cap);
      this.status = "即時橋接 · 收樣中";
    }
  }

  advance(dt) {
    const step = Math.max(0, Math.min(0.05, dt));
    const t0 = this.t;
    this.t += step;
    this.lastDt = step;
    this.eventEnergy *= Math.exp(-step / 1.45);
    this.inferHold = Math.max(0, this.inferHold - step);
    this.injected = this.injected.filter((item) => this.t - item.t < 18);

    let value = this.mode === "ws" ? this.pullSocket(step) : this.sampleDemo(this.t);
    if (this.mode === "demo") {
      for (const hit of this.eventsBetween(t0, this.t)) this.kick(hit);
    }
    for (const item of this.injected) {
      value += wavelet(this.t - item.t, item.amplitude * this.intensity);
    }

    const alpha = 1 - Math.exp(-step / this.preset.smooth);
    this.lp += (value - this.lp) * alpha;
    const target = Math.min(1, Math.abs(this.lp) * this.preset.envGain);
    const envAlpha = 1 - Math.exp(-step / 0.35);
    this.env += (target - this.env) * envAlpha;

    if (this.mode === "ws") {
      const abs = Math.abs(value);
      if (this.inferHold <= 0 && abs > 0.92 && this.prevAbs <= 0.92) {
        this.kick({ id: `infer-${this.t.toFixed(3)}`, amplitude: Math.min(1.4, abs) });
        this.inferHold = 8;
      }
      this.prevAbs = abs;
    }

    const breathWave = 0.5 - 0.5 * Math.cos((2 * Math.PI * this.t) / this.preset.breathPeriod);
    const breath = breathWave * (0.62 + 0.38 * Math.min(1, this.env * 1.25));

    this.history.push(value);
    if (this.history.length > 1400) this.history.splice(0, this.history.length - 1400);

    this.cache = {
      t: this.t,
      value,
      breath,
      eventEnergy: this.eventEnergy,
      history: this.history,
      preset: this.preset,
      intensity: this.intensity,
      mode: this.mode,
      status: this.status,
      loopT: this.mode === "demo" ? ((this.t % this.demo.duration) + this.demo.duration) % this.demo.duration : this.t,
    };
  }

  sampleDemo(t) {
    const { samples, dt, duration } = this.demo;
    const local = ((t % duration) + duration) % duration;
    const x = local / dt;
    const i = Math.floor(x) % samples.length;
    const f = x - Math.floor(x);
    const a = samples[i];
    const b = samples[(i + 1) % samples.length];
    return (a * (1 - f) + b * f) * this.preset.gain;
  }

  eventsBetween(t0, t1) {
    const hits = [];
    const dur = this.demo.duration;
    const k0 = Math.floor(t0 / dur) - 1;
    const k1 = Math.floor(t1 / dur) + 1;
    for (const event of this.demo.events) {
      for (let k = k0; k <= k1; k += 1) {
        const when = event.t + k * dur;
        if (when > t0 && when <= t1) {
          hits.push({
            id: `demo-${k}-${event.t}`,
            amplitude: event.amplitude,
          });
        }
      }
    }
    return hits;
  }

  pullSocket(dt) {
    if (!this.ws || this.ws.readyState !== 1 || !this.wsQueue.length) return 0;
    this.wsAcc += dt;
    let value = this.wsLast;
    let guard = 0;
    while (this.wsAcc >= this.wsDt && this.wsQueue.length && guard < 8) {
      this.wsAcc -= this.wsDt;
      value = this.wsQueue.shift();
      guard += 1;
    }
    if (guard === 8) this.wsAcc = 0;
    this.wsPeak = Math.max(this.wsPeak * 0.999, Math.abs(value), 0.2);
    this.wsLast = value / this.wsPeak;
    return this.wsLast;
  }

  kick(event) {
    const amplitude = Math.max(0, Math.min(1.6, (Number(event.amplitude) || 0) * this.intensity));
    this.eventEnergy = Math.max(this.eventEnergy, Math.min(1, amplitude));
    this.pending.push({ id: event.id, amplitude });
  }

  snapshot() {
    const pending = this.pending;
    this.pending = [];
    return {
      ...(this.cache || {
        t: 0,
        value: 0,
        breath: 0,
        eventEnergy: 0,
        history: this.history,
        preset: this.preset,
        intensity: this.intensity,
        mode: this.mode,
        status: this.status,
        loopT: 0,
      }),
      pending,
      dt: this.lastDt,
    };
  }
}
