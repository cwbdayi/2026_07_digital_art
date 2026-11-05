import { fitProject, traceCoast } from "../assets/js/taiwan.js";

function mix(a, b, t) {
  return a.map((channel, i) => Math.round(channel + (b[i] - channel) * t));
}

export function createVisual(canvas) {
  const ctx = canvas.getContext("2d", { alpha: false });
  let width = 1;
  let height = 1;
  let insets = { top: 80, right: 20, bottom: 140, left: 20 };
  const rings = [];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lichen = [183, 196, 163];
  const ember = [224, 122, 61];

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawTrace(snap, rgb, mixAmount) {
    const left = 24;
    const right = width - 24;
    const safeBottom = height - insets.bottom;
    const band = Math.min(128, Math.max(72, (safeBottom - insets.top) * 0.2));
    const bottom = safeBottom - 12;
    const top = bottom - band;
    ctx.fillStyle = "rgba(231, 236, 223, 0.035)";
    ctx.fillRect(left, top, Math.max(0, right - left), band);
    const mid = (top + bottom) / 2;
    ctx.strokeStyle = "rgba(231, 236, 223, 0.14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, mid);
    ctx.lineTo(right, mid);
    ctx.stroke();

    const hist = snap.history;
    const count = Math.min(hist.length, 760);
    if (count > 2) {
      const start = hist.length - count;
      ctx.beginPath();
      for (let i = 0; i < count; i += 1) {
        const x = left + (i / (count - 1)) * (right - left);
        const y = mid - Math.tanh(hist[start + i] * 2.1) * band * 0.42;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgb(${rgb.join(",")})`;
      ctx.lineWidth = 1.15 + mixAmount * 0.9;
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(183, 196, 163, 0.72)";
    ctx.font = "12px 'IBM Plex Mono', 'Noto Sans TC', monospace";
    ctx.fillText(snap.mode === "ws" ? "Z · 橋接" : "Z · 示範", left, top - 8);
  }

  function draw(snap) {
    for (const event of snap.pending) rings.push({ age: 0, amp: event.amplitude });
    const dt = snap.dt || 0.016;
    ctx.fillStyle = "#0e100e";
    ctx.fillRect(0, 0, width, height);

    const safeTop = insets.top;
    const safeBottom = height - insets.bottom;
    const cx = width / 2;
    const cy = safeTop + (safeBottom - safeTop) * 0.4;
    const amount = Math.max(0, Math.min(1, snap.eventEnergy));
    const rgb = mix(lichen, ember, amount);
    const color = `rgb(${rgb.join(",")})`;
    const breath = snap.breath;

    const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.min(width, height) * 0.48);
    glow.addColorStop(0, `rgba(${rgb.join(",")}, ${0.07 + breath * 0.08})`);
    glow.addColorStop(1, "rgba(14, 16, 14, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    const safeW = width - 48;
    const safeH = Math.max(120, safeBottom - safeTop);
    const islandW = Math.min(safeW * 0.2, safeH * 0.16, 150) * (1 + breath * 0.075 + amount * 0.06);
    const project = fitProject(cx, cy - islandW * 0.05, Math.max(48, islandW));
    traceCoast(ctx, project);
    ctx.fillStyle = `rgba(${rgb.join(",")}, ${0.045 + breath * 0.07})`;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = color;
    ctx.stroke();

    const hist = snap.history;
    const count = Math.min(hist.length, 420);
    if (count > 12) {
      const radius = Math.min(safeW, safeH) * 0.3 * (0.94 + breath * 0.05);
      const excursion = (reduced ? 16 : 42) * (0.65 + 0.35 * snap.intensity);
      ctx.beginPath();
      for (let i = 0; i < count; i += 1) {
        const sample = Math.tanh(hist[hist.length - count + i] * 2.1);
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        const rr = radius + sample * excursion;
        const x = cx + Math.cos(angle) * rr;
        const y = cy + Math.sin(angle) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.15;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.62, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rgb.join(",")}, 0.28)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (const ring of rings) ring.age += dt;
    for (let i = rings.length - 1; i >= 0; i -= 1) {
      const ring = rings[i];
      const life = ring.age / 2.3;
      if (life >= 1) {
        rings.splice(i, 1);
        continue;
      }
      ctx.beginPath();
      ctx.arc(cx, cy, 24 + ring.age * (reduced ? 70 : 210) * (0.75 + ring.amp * 0.35), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(224, 122, 61, ${(1 - life) * 0.8})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    drawTrace(snap, rgb, amount);
  }

  return {
    draw,
    resize,
    setInsets(next) {
      insets = next;
    },
  };
}
