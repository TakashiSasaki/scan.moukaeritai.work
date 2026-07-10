import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const ICONS = [
  { size: 48, path: 'public/favicon-48.png', maskable: false },
  { size: 180, path: 'public/apple-touch-icon.png', maskable: false },
  { size: 192, path: 'public/pwa-icon-192.png', maskable: false },
  { size: 512, path: 'public/pwa-icon-512.png', maskable: false },
  { size: 512, path: 'public/maskable-icon-512.png', maskable: true },
];

const BG = [15, 23, 42, 255];
const BG_DARK = [2, 6, 23, 255];
const CYAN = [34, 211, 238, 255];
const CYAN_DARK = [8, 145, 178, 255];
const BLUE = [37, 99, 235, 255];
const WHITE = [248, 250, 252, 255];
const FRAME = [224, 242, 254, 235];
const EDGE = [207, 250, 254, 210];

function mix(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

function blend(dst, src) {
  const alpha = src[3] / 255;
  return [
    Math.round(src[0] * alpha + dst[0] * (1 - alpha)),
    Math.round(src[1] * alpha + dst[1] * (1 - alpha)),
    Math.round(src[2] * alpha + dst[2] * (1 - alpha)),
    255,
  ];
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const numerator = (px - ax) * vx + (py - ay) * vy;
  const denominator = vx * vx + vy * vy + 1e-9;
  const t = Math.max(0, Math.min(1, numerator / denominator));
  const qx = ax + t * vx;
  const qy = ay + t * vy;
  return Math.hypot(px - qx, py - qy);
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writePng(path, size, pixels) {
  const rawRows = [];
  for (let y = 0; y < size; y += 1) {
    const row = [0];
    for (let x = 0; x < size; x += 1) row.push(...pixels[y][x]);
    rawRows.push(Buffer.from(row));
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(Buffer.concat(rawRows), { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
}

function generateIcon({ size, path, maskable }) {
  const radius = maskable ? 0 : (224 * size) / 1024;
  const pixels = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      const base = mix(BG, BG_DARK, (x / (size - 1) + y / (size - 1)) / 2);
      if (!radius) return base;
      const cx = Math.min(Math.max(x + 0.5, radius), size - radius);
      const cy = Math.min(Math.max(y + 0.5, radius), size - radius);
      return Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= radius ? base : [0, 0, 0, 0];
    }),
  );

  const scalePoint = ([x, y]) => [(x * size) / 1024, (y * size) / 1024];

  function drawPolygon(points, color) {
    const scaled = points.map(scalePoint);
    const minX = Math.max(0, Math.floor(Math.min(...scaled.map(([x]) => x))));
    const maxX = Math.min(size - 1, Math.ceil(Math.max(...scaled.map(([x]) => x))));
    const minY = Math.max(0, Math.floor(Math.min(...scaled.map(([, y]) => y))));
    const maxY = Math.min(size - 1, Math.ceil(Math.max(...scaled.map(([, y]) => y))));
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (pointInPolygon(x + 0.5, y + 0.5, scaled)) pixels[y][x] = blend(pixels[y][x], color);
      }
    }
  }

  function drawLine(a, b, color, width) {
    const [ax, ay] = scalePoint(a);
    const [bx, by] = scalePoint(b);
    const radiusPx = ((width * size) / 1024) / 2;
    const minX = Math.max(0, Math.floor(Math.min(ax, bx) - radiusPx - 1));
    const maxX = Math.min(size - 1, Math.ceil(Math.max(ax, bx) + radiusPx + 1));
    const minY = Math.max(0, Math.floor(Math.min(ay, by) - radiusPx - 1));
    const maxY = Math.min(size - 1, Math.ceil(Math.max(ay, by) + radiusPx + 1));
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (distanceToSegment(x + 0.5, y + 0.5, ax, ay, bx, by) <= radiusPx) {
          pixels[y][x] = blend(pixels[y][x], color);
        }
      }
    }
  }

  function drawRoundedRect(x0, y0, x1, y1, radiusRect, color) {
    const sx0 = (x0 * size) / 1024;
    const sy0 = (y0 * size) / 1024;
    const sx1 = (x1 * size) / 1024;
    const sy1 = (y1 * size) / 1024;
    const sr = (radiusRect * size) / 1024;
    for (let y = Math.max(0, Math.floor(sy0)); y < Math.min(size, Math.ceil(sy1)); y += 1) {
      for (let x = Math.max(0, Math.floor(sx0)); x < Math.min(size, Math.ceil(sx1)); x += 1) {
        const cx = Math.min(Math.max(x + 0.5, sx0 + sr), sx1 - sr);
        const cy = Math.min(Math.max(y + 0.5, sy0 + sr), sy1 - sr);
        if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= sr) pixels[y][x] = blend(pixels[y][x], color);
      }
    }
  }

  for (const [a, b] of [
    [[210, 352], [210, 236]], [[210, 236], [352, 210]], [[672, 210], [788, 210]], [[814, 236], [814, 352]],
    [[814, 672], [814, 788]], [[788, 814], [672, 814]], [[352, 814], [236, 814]], [[210, 788], [210, 672]],
  ]) drawLine(a, b, FRAME, 42);

  drawPolygon([[512, 222], [746, 354], [512, 486], [278, 354]], CYAN);
  drawPolygon([[278, 354], [512, 486], [512, 780], [278, 648]], CYAN_DARK);
  drawPolygon([[746, 354], [512, 486], [512, 780], [746, 648]], BLUE);

  for (const [a, b] of [
    [[512, 222], [746, 354]], [[746, 354], [512, 486]], [[512, 486], [278, 354]], [[278, 354], [512, 222]],
    [[278, 354], [278, 648]], [[278, 648], [512, 780]], [[512, 780], [746, 648]], [[746, 648], [746, 354]], [[512, 486], [512, 780]],
  ]) drawLine(a, b, EDGE, 22);

  for (const [x, y] of [[346, 552], [432, 552], [346, 638], [614, 552], [614, 638]]) {
    drawRoundedRect(x, y, x + 56, y + 56, 14, WHITE);
  }

  writePng(path, size, pixels);
  console.log(`Generated ${path}`);
}

for (const icon of ICONS) generateIcon(icon);
