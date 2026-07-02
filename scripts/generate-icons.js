#!/usr/bin/env node
/**
 * Procedurally renders the app icon set into assets/ — a ringed asteroid with
 * gold mineral veins on the game's dark-navy space palette (src/theme.ts).
 *
 * No image dependencies: pixels are shaded per-sample and encoded as PNG with
 * Node's built-in zlib. Deterministic, so re-running yields identical bytes.
 *
 *   node scripts/generate-icons.js
 *
 * Outputs: icon.png (1024, opaque), splash-icon.png (1024, transparent),
 * android-icon-foreground.png (512, transparent, art inside the 66% safe
 * zone), android-icon-background.png (512, opaque), android-icon-monochrome
 * .png (432, white + alpha), favicon.png (48).
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ── Palette (mirrors src/theme.ts) ──────────────────────────────────────────
const BG_TOP = [13, 17, 32]; // #0D1120
const BG_BOTTOM = [7, 9, 18]; // #070912
const TEAL = [94, 234, 212]; // #5EEAD4
const GOLD = [250, 204, 21]; // #FACC15
const ROCK_LIGHT = [154, 137, 118]; // sunlit regolith
const ROCK_DARK = [58, 50, 46]; // shadowed rock

// ── Tiny math helpers ───────────────────────────────────────────────────────
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
/** 0→1 edge with a half-pixel-ish soft edge for antialiasing. */
const coverage = (signedDist, soft) => clamp01(0.5 - signedDist / soft);

/** Deterministic 2D hash → [0,1). */
function hash2(ix, iy) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise on a lattice of `freq` cells across [0,1]. */
function noise(u, v, freq, seed) {
  const x = u * freq;
  const y = v * freq;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash2(x0 + seed * 1013, y0);
  const n10 = hash2(x0 + 1 + seed * 1013, y0);
  const n01 = hash2(x0 + seed * 1013, y0 + 1);
  const n11 = hash2(x0 + 1 + seed * 1013, y0 + 1);
  return lerp(lerp(n00, n10, sx), lerp(n01, n11, sx), sy);
}

// ── Scene: a shaded asteroid with craters, gold veins and a teal ring ───────
// Craters and glints are in asteroid-local coords (unit disc), so every
// variant (icon, adaptive foreground, monochrome) shares the same face.
const CRATERS = [
  { x: 0.38, y: -0.28, r: 0.3 },
  { x: -0.42, y: 0.08, r: 0.24 },
  { x: 0.02, y: 0.48, r: 0.2 },
  { x: -0.18, y: -0.52, r: 0.16 },
  { x: 0.52, y: 0.28, r: 0.13 },
];
const GLINTS = [
  { x: 0.14, y: 0.12, r: 0.07 },
  { x: -0.3, y: -0.3, r: 0.055 },
  { x: -0.52, y: 0.42, r: 0.05 },
  { x: 0.34, y: 0.62, r: 0.045 },
];
// Light from the upper-left.
const LIGHT = { x: -0.55, y: -0.65 };

/**
 * Shade one sample. `u,v` in [0,1]; `soft` is the AA width in uv units.
 * Layer flags let each asset pick what it shows. Returns [r,g,b,a].
 */
function shade(u, v, opts) {
  const { rockR, showBg, showRock, showRing, mono, soft } = opts;
  const cx = 0.5;
  const cy = 0.5;
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;

  if (showBg) {
    [r, g, b] = mix(BG_TOP, BG_BOTTOM, v);
    // A faint teal nebula glow behind the asteroid keeps pure-dark corners alive.
    const gd = Math.hypot(u - 0.5, v - 0.46);
    const glow = Math.max(0, 1 - gd / 0.62) ** 2 * 0.10;
    [r, g, b] = mix([r, g, b], TEAL, glow);
    // Star field: sparse deterministic points, skipped under the asteroid.
    const cell = 24;
    const iu = Math.floor(u * cell);
    const iv = Math.floor(v * cell);
    if (hash2(iu, iv) > 0.82) {
      const su = (iu + 0.2 + hash2(iu, iv + 99) * 0.6) / cell;
      const sv = (iv + 0.2 + hash2(iu + 99, iv) * 0.6) / cell;
      const dStar = Math.hypot(u - su, v - sv);
      const size = 0.0025 + hash2(iu + 7, iv + 7) * 0.003;
      const tw = coverage(dStar - size, soft * 2) * (0.35 + 0.65 * hash2(iu + 3, iv + 5));
      [r, g, b] = mix([r, g, b], [232, 236, 248], tw);
    }
    a = 1;
  }

  // Ring geometry (an ellipse around the asteroid). The top arc passes behind
  // the rock, the bottom arc in front — drawn in two passes around the rock.
  const ringA = rockR * 1.62;
  const ringB = rockR * 0.52;
  const rdx = (u - cx) / ringA;
  const rdy = (v - cy) / ringB;
  const q = Math.hypot(rdx, rdy);
  const ringHalfWidth = 0.055; // in q units
  const ringCov = coverage(Math.abs(q - 1) - ringHalfWidth, soft / ringB * 0.9);
  const dRock = Math.hypot(u - cx, v - cy) - rockR;
  // Occlusion test with a safety margin so the hidden "behind" arc never
  // peeks through the rock's antialiased silhouette as a notch.
  const overRock = dRock < soft * 2;
  const ringBehind = v < cy;
  // Depth fade blends smoothly across the midline (a hard 0.55/0.9 step drew
  // a visible seam where the two arcs meet at the ring's widest points).
  const ringStrength = lerp(0.55, 0.9, clamp01((v - cy) / (rockR * 0.35) + 0.5));

  if (showRing && ringCov > 0 && !(overRock && ringBehind)) {
    const cRing = mono ? [255, 255, 255] : TEAL;
    [r, g, b] = mix([r, g, b], cRing, ringCov * ringStrength);
    a = Math.max(a, ringCov * ringStrength);
  }

  if (showRock) {
    const rockCov = coverage(dRock, soft);
    if (rockCov > 0) {
      let rock;
      if (mono) {
        rock = [255, 255, 255];
      } else {
        // Sphere-ish lambert shading + regolith noise.
        const nx = (u - cx) / rockR;
        const ny = (v - cy) / rockR;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        let lit = clamp01(nx * LIGHT.x + ny * LIGHT.y + nz * 0.72);
        lit = lit * (0.82 + 0.18 * noise(u, v, 26, 5)) * (0.9 + 0.2 * noise(u, v, 9, 11));
        rock = mix(ROCK_DARK, ROCK_LIGHT, clamp01(lit));

        for (const c of CRATERS) {
          const dc = Math.hypot(nx - c.x, ny - c.y);
          const inside = coverage(dc - c.r, 0.05);
          if (inside > 0) {
            // Bowl shadow, deeper toward the light-facing wall.
            const bowl = inside * (0.34 + 0.2 * clamp01((c.x - nx) * LIGHT.x + (c.y - ny) * LIGHT.y));
            rock = mix(rock, ROCK_DARK, clamp01(bowl));
          }
          // Sunlit rim on the far side of the bowl, fading out smoothly toward
          // the light side (a hard cutoff left tick-mark artifacts).
          const rim = coverage(Math.abs(dc - c.r) - 0.028, 0.03);
          const facing = clamp01(((nx - c.x) * -LIGHT.x + (ny - c.y) * -LIGHT.y) * 4);
          if (rim > 0) rock = mix(rock, ROCK_LIGHT, rim * facing * 0.35);
        }

        for (const gl of GLINTS) {
          const dg = Math.hypot(nx - gl.x, ny - gl.y);
          const vein = coverage(dg - gl.r, 0.04);
          if (vein > 0) rock = mix(rock, GOLD, vein * 0.95);
          const halo = Math.max(0, 1 - dg / (gl.r * 3));
          rock = mix(rock, GOLD, halo * halo * 0.12);
        }

        // Thin cool rim light on the shadow side ties the rock to the scene.
        const rimLight = coverage(Math.abs(dRock) - 0.004, soft * 2);
        if (rimLight > 0 && nx * LIGHT.x + ny * LIGHT.y < 0) {
          rock = mix(rock, TEAL, rimLight * 0.18);
        }
      }
      [r, g, b] = mix([r, g, b], rock, rockCov);
      a = Math.max(a, rockCov);
    }

    // Front arc of the ring passes over the rock.
    if (showRing && ringCov > 0 && overRock && !ringBehind) {
      const cRing = mono ? [255, 255, 255] : TEAL;
      [r, g, b] = mix([r, g, b], cRing, ringCov * ringStrength);
      a = Math.max(a, ringCov * ringStrength);
    }
  }

  return [r, g, b, a];
}

// ── Rendering + PNG encoding ────────────────────────────────────────────────
function render(size, ss, opts) {
  const px = new Float64Array(size * size * 4);
  const soft = (1 / size / (opts.zoom ?? 1)) * 1.2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const u = (x + (sx + 0.5) / ss) / size;
          const v = (y + (sy + 0.5) / ss) / size;
          const [sr, sg, sb, sa] = shade(u, v, { ...opts, soft });
          // Accumulate premultiplied so transparent samples don't tint edges.
          r += sr * sa;
          g += sg * sa;
          b += sb * sa;
          a += sa;
        }
      }
      const n = ss * ss;
      const i = (y * size + x) * 4;
      const alpha = a / n;
      px[i] = alpha > 0 ? r / a : 0;
      px[i + 1] = alpha > 0 ? g / a : 0;
      px[i + 2] = alpha > 0 ? b / a : 0;
      px[i + 3] = alpha;
    }
  }
  return px;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(size, px, opaque) {
  const bpp = opaque ? 3 : 4;
  const raw = Buffer.alloc(size * (1 + size * bpp));
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * bpp);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const o = row + 1 + x * bpp;
      raw[o] = Math.round(clamp01(px[i] / 255) * 255);
      raw[o + 1] = Math.round(clamp01(px[i + 1] / 255) * 255);
      raw[o + 2] = Math.round(clamp01(px[i + 2] / 255) * 255);
      if (!opaque) raw[o + 3] = Math.round(clamp01(px[i + 3]) * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = opaque ? 2 : 6; // RGB / RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function write(name, size, ss, opts, opaque) {
  const px = render(size, ss, opts);
  const file = path.join(__dirname, '..', 'assets', name);
  fs.writeFileSync(file, encodePng(size, px, opaque));
  console.log(`  ${name}  ${size}×${size}${opaque ? '' : ' (alpha)'}`);
}

console.log('Rendering icon set into assets/:');
// Full scene, opaque — the iOS/store icon must have no alpha channel.
write('icon.png', 1024, 3, { rockR: 0.3, showBg: true, showRock: true, showRing: true }, true);
// Splash glyph on transparent — the splash screen supplies the dark background.
write('splash-icon.png', 1024, 3, { rockR: 0.26, showBg: false, showRock: true, showRing: true }, false);
// Android adaptive foreground: art must fit the central 66% safe zone.
write('android-icon-foreground.png', 512, 3, { rockR: 0.19, showBg: false, showRock: true, showRing: true }, false);
// Android adaptive background: space + stars only.
write('android-icon-background.png', 512, 3, { rockR: 0.3, showBg: true, showRock: false, showRing: false }, true);
// Android 13+ themed icon: white silhouette with alpha.
write('android-icon-monochrome.png', 432, 3, { rockR: 0.19, showBg: false, showRock: true, showRing: true, mono: true }, false);
// Web favicon.
write('favicon.png', 48, 8, { rockR: 0.32, showBg: true, showRock: true, showRing: true }, true);
console.log('Done.');
