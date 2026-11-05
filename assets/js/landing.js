import { fitProject, traceCoast } from "./taiwan.js";

const canvas = document.getElementById("field");
if (!canvas) throw new Error("missing canvas");
const ctx = canvas.getContext("2d", { alpha: false });
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let width = 1;
let height = 1;

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function draw(now) {
  const t = reduced ? 0 : now / 1000;
  ctx.fillStyle = "#0e100e";
  ctx.fillRect(0, 0, width, height);
  const breath = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 9);
  const cx = width * 0.84;
  const cy = height * 0.62;
  const project = fitProject(cx, cy, Math.min(width, height) * (0.18 + breath * 0.01));
  traceCoast(ctx, project);
  ctx.strokeStyle = `rgba(183, 196, 163, ${0.16 + breath * 0.16})`;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  const left = 28;
  const right = width - 28;
  const mid = height - 36;
  ctx.beginPath();
  const n = Math.min(240, Math.floor((right - left) / 4));
  for (let i = 0; i < n; i += 1) {
    const u = i / n;
    const x = left + u * (right - left);
    const tt = t * 0.35 + u * 6;
    const y =
      mid +
      Math.sin(tt * 2.1) * (10 + breath * 8) +
      Math.sin(tt * 5.3 + 1.2) * 4;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "rgba(197, 210, 176, 0.28)";
  ctx.stroke();
  if (!reduced) requestAnimationFrame(draw);
}

resize();
window.addEventListener("resize", () => {
  resize();
  if (reduced) draw(0);
});
requestAnimationFrame(draw);
