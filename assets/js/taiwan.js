// Shared schematic geography for the two pieces.
// Coastline is a simplified trace, accurate enough to read as Taiwan,
// not a survey boundary.

export const TAIWAN_COAST = [
  [121.548, 25.298],
  [121.51, 25.25],
  [121.44, 25.178],
  [121.36, 25.145],
  [121.22, 25.12],
  [121.05, 25.04],
  [120.95, 24.88],
  [120.88, 24.76],
  [120.76, 24.6],
  [120.62, 24.46],
  [120.53, 24.3],
  [120.44, 24.16],
  [120.32, 24.02],
  [120.2, 23.84],
  [120.14, 23.66],
  [120.09, 23.46],
  [120.08, 23.26],
  [120.1, 23.06],
  [120.15, 22.88],
  [120.22, 22.72],
  [120.28, 22.58],
  [120.4, 22.46],
  [120.54, 22.28],
  [120.66, 22.08],
  [120.75, 21.97],
  [120.84, 21.9],
  [120.9, 21.97],
  [121.0, 22.16],
  [121.08, 22.4],
  [121.15, 22.66],
  [121.24, 22.88],
  [121.34, 23.1],
  [121.43, 23.32],
  [121.51, 23.54],
  [121.57, 23.74],
  [121.62, 23.92],
  [121.66, 24.1],
  [121.74, 24.3],
  [121.8, 24.5],
  [121.86, 24.66],
  [121.92, 24.84],
  [121.97, 24.98],
  [122.0, 25.01],
  [121.95, 25.09],
  [121.86, 25.135],
  [121.74, 25.15],
  [121.64, 25.17],
  [121.57, 25.23],
  [121.548, 25.298],
];

export const CENTRAL_RANGE = [
  [121.12, 24.78],
  [121.22, 24.42],
  [121.16, 24.02],
  [121.02, 23.62],
  [120.9, 23.22],
  [120.8, 22.82],
  [120.76, 22.48],
];

export const VIEW = {
  minLon: 119.82,
  maxLon: 122.22,
  minLat: 21.68,
  maxLat: 25.52,
};

export function kmScale(latDeg) {
  return {
    kmPerDegLat: 110.574,
    kmPerDegLon: 111.32 * Math.cos((latDeg * Math.PI) / 180),
  };
}

export function traceLine(ctx, points, project) {
  ctx.beginPath();
  points.forEach(([lon, lat], i) => {
    const [x, y] = project(lon, lat);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
}

export function traceCoast(ctx, project) {
  traceLine(ctx, TAIWAN_COAST, project);
  ctx.closePath();
}

// Fit the island's real kilometre aspect into a given width, centered on (cx, cy).
export function fitProject(cx, cy, widthPx) {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lon, lat] of TAIWAN_COAST) {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  const midLat = (minLat + maxLat) / 2;
  const { kmPerDegLat, kmPerDegLon } = kmScale(midLat);
  const widthKm = (maxLon - minLon) * kmPerDegLon;
  const pxPerKm = widthPx / widthKm;
  const midLon = (minLon + maxLon) / 2;
  return (lon, lat) => [
    cx + (lon - midLon) * kmPerDegLon * pxPerKm,
    cy - (lat - midLat) * kmPerDegLat * pxPerKm,
  ];
}

// Map view: equal-kilometre aspect, letterboxed inside the canvas.
export function viewProject(width, height, pad = 26) {
  const { minLon, maxLon, minLat, maxLat } = VIEW;
  const midLat = (minLat + maxLat) / 2;
  const { kmPerDegLat, kmPerDegLon } = kmScale(midLat);
  const spanX = (maxLon - minLon) * kmPerDegLon;
  const spanY = (maxLat - minLat) * kmPerDegLat;
  const innerW = Math.max(1, width - pad * 2);
  const innerH = Math.max(1, height - pad * 2);
  const pxPerKm = Math.min(innerW / spanX, innerH / spanY);
  const usedW = spanX * pxPerKm;
  const usedH = spanY * pxPerKm;
  const ox = (width - usedW) / 2;
  const oy = (height - usedH) / 2;
  const project = (lon, lat) => [
    ox + (lon - minLon) * kmPerDegLon * pxPerKm,
    oy + (maxLat - lat) * kmPerDegLat * pxPerKm,
  ];
  return { project, pxPerKm, kmPerDegLat, kmPerDegLon };
}
