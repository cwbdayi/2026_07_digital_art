// Deterministic demo waveform.
// Background is periodic in `duration` so the loop does not click.
// Events are markers plus the wiggle already baked into `samples`.
// This is synthesized. It is not a station recording.

export const PRESETS = [
  {
    id: "hualien",
    name: "花蓮近海",
    blurb: "微地動較飽，呼吸較深。",
    gain: 1.12,
    smooth: 0.18,
    envGain: 1.15,
    breathPeriod: 8.2,
    bodyHz: 50,
    airHz: 210,
  },
  {
    id: "taipei",
    name: "臺北盆地",
    blurb: "週期拉長，餘響稍厚。",
    gain: 0.95,
    smooth: 0.42,
    envGain: 1,
    breathPeriod: 11.5,
    bodyHz: 58,
    airHz: 260,
  },
  {
    id: "yushan",
    name: "玉山",
    blurb: "背景較靜，線條較瘦。",
    gain: 0.55,
    smooth: 0.55,
    envGain: 0.75,
    breathPeriod: 13.5,
    bodyHz: 72,
    airHz: 420,
  },
  {
    id: "yilan",
    name: "宜蘭近海",
    blurb: "像長浪一樣的慢週期。",
    gain: 1.02,
    smooth: 0.28,
    envGain: 1.05,
    breathPeriod: 7.4,
    bodyHz: 46,
    airHz: 180,
  },
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function wavelet(tau, amplitude) {
  if (tau <= 0 || tau > 16) return 0;
  const decay = Math.exp(-tau / 3.2);
  return (
    amplitude *
    decay *
    (Math.exp(-tau / 0.45) * Math.sin(2 * Math.PI * 2.4 * tau) * 1.4 +
      0.35 * Math.sin(2 * Math.PI * 0.7 * tau))
  );
}

export function renderDemoWave() {
  const dt = 0.025;
  const duration = 72;
  const n = Math.round(duration / dt);
  const rand = mulberry32(20260403);
  const samples = new Array(n);
  let brown = 0;
  const fadeN = Math.round(1.6 / dt);

  for (let i = 0; i < n; i += 1) {
    const t = i * dt;
    // Integer cycle counts over `duration` keep the microseism seamless.
    const micro =
      0.34 * Math.sin((2 * Math.PI * 10 * t) / duration + 0.4) +
      0.22 * Math.sin((2 * Math.PI * 15 * t) / duration + 1.7) +
      0.1 * Math.sin((2 * Math.PI * 6 * t) / duration);
    brown = brown * 0.985 + (rand() - 0.5);
    let noise = brown * 0.035 + (rand() - 0.5) * 0.02;
    const edge = Math.min(i, n - 1 - i);
    if (edge < fadeN) noise *= edge / fadeN;
    samples[i] = micro + noise;
  }

  const events = [
    { t: 18.5, amplitude: 1 },
    { t: 47, amplitude: 0.62 },
  ];
  for (let i = 0; i < n; i += 1) {
    const t = i * dt;
    let v = samples[i];
    for (const event of events) v += wavelet(t - event.t, event.amplitude);
    samples[i] = v;
  }

  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const scale = peak > 0 ? 1 / peak : 1;
  for (let i = 0; i < n; i += 1) {
    samples[i] = Math.round(samples[i] * scale * 10000) / 10000;
  }

  return {
    kind: "demo-loop",
    dt,
    duration,
    units: "normalized-velocity",
    description:
      "合成示範波形：以可循環的微地動式背景，加上兩記事件脈衝。不是任何測站的實測。",
    samples,
    events,
  };
}
