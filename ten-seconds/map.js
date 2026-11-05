import { CENTRAL_RANGE, TAIWAN_COAST, kmScale, traceLine, viewProject } from "../assets/js/taiwan.js";
import { QUAKE, surfaceRadiusKm, MODEL } from "./scenario.js";

export function createMap(canvas, cities, onSelect) {
  const ctx = canvas.getContext("2d");
  let width = 1;
  let height = 1;
  let hoverId = null;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function layout() {
    const { project, pxPerKm } = viewProject(width, height, 22);
    const placed = cities.map((city) => {
      const [x, y] = project(city.lon, city.lat);
      return { ...city, x, y };
    });
    return { project, pxPerKm, placed };
  }

  function ellipse(project, radiusKm) {
    const { kmPerDegLon, kmPerDegLat } = kmScale(QUAKE.lat);
    const [x, y] = project(QUAKE.lon, QUAKE.lat);
    const [x2] = project(QUAKE.lon + radiusKm / kmPerDegLon, QUAKE.lat);
    const [, y2] = project(QUAKE.lon, QUAKE.lat + radiusKm / kmPerDegLat);
    return { x, y, rx: Math.abs(x2 - x), ry: Math.abs(y2 - y) };
  }

  function draw(state) {
    const { project, pxPerKm, placed } = layout();
    const city = placed.find((item) => item.id === state.selectedId) || placed[0];
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#101410";
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    const since = state.t - city.s;
    if (!reduced && since > 0 && since < 4.5) {
      const decay = Math.exp(-since / 1.15) * city.shake;
      ctx.translate(Math.sin(since * 46) * 7 * decay, Math.cos(since * 37) * 5 * decay);
    }

    ctx.strokeStyle = "rgba(231, 236, 223, 0.08)";
    ctx.lineWidth = 1;
    ctx.font = "11px 'IBM Plex Mono', 'Noto Sans TC', monospace";
    for (const lat of [22, 23, 24, 25]) {
      traceLine(ctx, [[119.9, lat], [122.1, lat]], project);
      ctx.stroke();
      const [x, y] = project(119.9, lat);
      ctx.fillStyle = "rgba(231, 236, 223, 0.38)";
      ctx.fillText(`${lat}°N`, x + 4, y - 4);
    }

    traceLine(ctx, CENTRAL_RANGE, project);
    ctx.strokeStyle = "rgba(183, 196, 163, 0.28)";
    ctx.setLineDash([2, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    traceLine(ctx, TAIWAN_COAST, project);
    ctx.closePath();
    ctx.fillStyle = "#1c241c";
    ctx.fill();
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = "#d5decc";
    ctx.stroke();

    const pRadius = surfaceRadiusKm(MODEL.vp, state.t, QUAKE.depthKm);
    const sRadius = surfaceRadiusKm(MODEL.vs, state.t, QUAKE.depthKm);
    const sEll = ellipse(project, sRadius);
    const pEll = ellipse(project, pRadius);
    if (sRadius > 0) {
      ctx.beginPath();
      ctx.ellipse(sEll.x, sEll.y, Math.max(1, sEll.rx), Math.max(1, sEll.ry), 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(224, 122, 61, 0.1)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(224, 122, 61, 0.92)";
      ctx.stroke();
    }
    if (pRadius > 0) {
      ctx.beginPath();
      ctx.ellipse(pEll.x, pEll.y, Math.max(1, pEll.rx), Math.max(1, pEll.ry), 0, 0, Math.PI * 2);
      ctx.lineWidth = 1.15;
      ctx.strokeStyle = "rgba(198, 214, 190, 0.9)";
      ctx.stroke();
    }

    for (const item of placed) {
      const selected = item.id === city.id;
      const hovered = item.id === hoverId;
      ctx.beginPath();
      ctx.arc(item.x, item.y, selected ? 6 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = item.alert == null ? "#8fb8b4" : "#e2b65a";
      ctx.fill();
      if (selected || hovered) {
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = "#f4f6ef";
        ctx.stroke();
      }
    }

    const [ex, ey] = project(QUAKE.lon, QUAKE.lat);
    ctx.strokeStyle = "#e07a3d";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ex - 7, ey);
    ctx.lineTo(ex + 7, ey);
    ctx.moveTo(ex, ey - 7);
    ctx.lineTo(ex, ey + 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ex, ey, 2.4, 0, Math.PI * 2);
    ctx.stroke();

    const label = city.name;
    ctx.font = "600 14px 'Noto Sans TC', sans-serif";
    const tw = ctx.measureText(label).width;
    let lx = city.x + 10;
    let ly = city.y - 10;
    if (lx + tw > width - 10) lx = city.x - tw - 10;
    if (lx < 8) lx = 8;
    if (ly < 18) ly = city.y + 18;
    ctx.fillStyle = "rgba(14, 16, 14, 0.82)";
    ctx.fillRect(lx - 4, ly - 13, tw + 8, 18);
    ctx.fillStyle = "#f3f6ee";
    ctx.fillText(label, lx, ly);

    ctx.restore();

    ctx.strokeStyle = "#d5decc";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(width - 26, 46);
    ctx.lineTo(width - 26, 22);
    ctx.lineTo(width - 30, 30);
    ctx.moveTo(width - 26, 22);
    ctx.lineTo(width - 22, 30);
    ctx.stroke();
    ctx.fillStyle = "#d5decc";
    ctx.font = "12px 'Noto Sans TC', sans-serif";
    ctx.fillText("北", width - 32, 16);

    const bar = Math.max(28, 100 * pxPerKm);
    const bx = 16;
    const by = height - 18;
    ctx.strokeStyle = "#d5decc";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bar, by);
    ctx.moveTo(bx, by - 4);
    ctx.lineTo(bx, by + 4);
    ctx.moveTo(bx + bar, by - 4);
    ctx.lineTo(bx + bar, by + 4);
    ctx.stroke();
    ctx.fillStyle = "#d5decc";
    ctx.font = "11px 'IBM Plex Mono', 'Noto Sans TC', monospace";
    ctx.fillText("100 km", bx, by - 8);

    ctx.fillStyle = "rgba(224, 122, 61, 0.95)";
    ctx.fillText("震央", ex + 8, ey - 8);
    return placed;
  }

  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const { placed } = layout();
    let best = null;
    let bestD = 18;
    for (const city of placed) {
      const d = Math.hypot(city.x - x, city.y - y);
      if (d < bestD) {
        best = city;
        bestD = d;
      }
    }
    return best;
  }

  canvas.addEventListener("click", (event) => {
    const city = pick(event);
    if (city) onSelect(city.id);
  });
  canvas.addEventListener("mousemove", (event) => {
    const city = pick(event);
    const next = city ? city.id : null;
    canvas.style.cursor = next ? "pointer" : "default";
    if (next !== hoverId) hoverId = next;
  });
  canvas.addEventListener("mouseleave", () => {
    hoverId = null;
  });

  return { resize, draw };
}
