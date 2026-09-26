/*
  CPU mirror of the atmosphere in sunsetShader.js (same constants, km).
  Values that are the same for every pixel — how much sunlight survives to
  the sea and to each cloud deck, the sky's ambient light, the horizon haze
  table and the exposure — are integrated here once per sun change instead
  of per pixel.
*/

const RE = 6360;
const RA = 6420;
const BR = [5.802e-3, 13.558e-3, 33.1e-3];
// light haze: enough Mie for a glow around the sun without steeping the
// whole sky in orange
const BMS = 3.0e-3;
const BME = 3.3e-3;
// ozone boosted past physical, and harder in red than the real layer, so
// the high sky stays blue through dusk instead of going violet (too much
// red and the band above the horizon glow turns green)
const BO = [3.0e-3, 5.1e-3, 0.213e-3];
const SUN_I = 22;
const SUN_R = 0.0105;

export const MID_ALT = 1.9;
export const HIGH_ALT = 8.5;

function densityAt(h) {
  return [
    Math.exp(-h / 8),
    Math.exp(-h / 1.2),
    Math.max(0, 1 - Math.abs(h - 25) / 15),
  ];
}

function atmoExit(pos, dir) {
  const b = pos[0] * dir[0] + pos[1] * dir[1] + pos[2] * dir[2];
  const c = pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2 - RA * RA;
  return -b + Math.sqrt(Math.max(b * b - c, 0));
}

function opticalDepth(pos, dir, length, steps) {
  const od = [0, 0, 0];
  let prev = 0;
  for (let i = 1; i <= steps; i++) {
    const s = i / steps;
    const t = length * s * s;
    const ds = t - prev;
    const tm = prev + ds * 0.5;
    prev = t;
    const h =
      Math.hypot(
        pos[0] + dir[0] * tm,
        pos[1] + dir[1] * tm,
        pos[2] + dir[2] * tm,
      ) - RE;
    const d = densityAt(h);
    od[0] += d[0] * ds;
    od[1] += d[1] * ds;
    od[2] += d[2] * ds;
  }
  return od;
}

function transmittance(od) {
  return [0, 1, 2].map((c) =>
    Math.exp(-(BR[c] * od[0] + BME * od[1] + BO[c] * od[2])),
  );
}

function smoothstep(a, b, x) {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

// sunlight reaching an observer at altitude h (km), fading out as the
// disc sinks behind that altitude's (dipped) horizon
function sunlightAt(h, sunDir) {
  const r = RE + h;
  const dip = Math.acos(RE / r);
  const elev = Math.asin(sunDir[1]);
  const visible = smoothstep(-SUN_R, SUN_R, elev + dip);
  if (visible <= 0) return [0, 0, 0];
  // integrate along the sun direction, lifted to graze the horizon at most
  const e = Math.max(elev, -dip + 0.002);
  const dir = [Math.cos(e), Math.sin(e), 0];
  const pos = [0, r, 0];
  const T = transmittance(opticalDepth(pos, dir, atmoExit(pos, dir), 48));
  return T.map((v) => v * SUN_I * visible);
}

function skyRadiance(rd, sunDir, camKm) {
  const ro = [0, RE + camKm, 0];
  const tMax = atmoExit(ro, rd);
  const steps = 24;
  const odView = [0, 0, 0];
  const sumR = [0, 0, 0];
  const sumM = [0, 0, 0];
  let prev = 0;
  for (let i = 1; i <= steps; i++) {
    const s = i / steps;
    const t = tMax * s * s;
    const ds = t - prev;
    const tm = prev + ds * 0.5;
    prev = t;
    const pos = [ro[0] + rd[0] * tm, ro[1] + rd[1] * tm, ro[2] + rd[2] * tm];
    const r = Math.hypot(pos[0], pos[1], pos[2]);
    const d = densityAt(r - RE);
    odView[0] += d[0] * ds;
    odView[1] += d[1] * ds;
    odView[2] += d[2] * ds;

    const horizonCos = -Math.sqrt(Math.max(1 - (RE * RE) / (r * r), 0));
    const cosS =
      (pos[0] * sunDir[0] + pos[1] * sunDir[1] + pos[2] * sunDir[2]) / r;
    const lit = smoothstep(horizonCos - 0.004, horizonCos + 0.004, cosS);
    if (lit <= 0) continue;
    const odL = opticalDepth(pos, sunDir, atmoExit(pos, sunDir), 8);
    const T = transmittance([
      odView[0] + odL[0],
      odView[1] + odL[1],
      odView[2] + odL[2],
    ]);
    for (let c = 0; c < 3; c++) {
      sumR[c] += T[c] * lit * d[0] * ds;
      sumM[c] += T[c] * lit * d[1] * ds;
    }
  }
  const mu = rd[0] * sunDir[0] + rd[1] * sunDir[1] + rd[2] * sunDir[2];
  const pR = (3 / (16 * Math.PI)) * (1 + mu * mu);
  const g = 0.78;
  const pM =
    (1 - g * g) / (4 * Math.PI * Math.pow(1 + g * g - 2 * g * mu, 1.5));
  return [0, 1, 2].map(
    (c) => SUN_I * (sumR[c] * BR[c] * pR + sumM[c] * BMS * pM),
  );
}

const luminance = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

function dirFrom(azimuth, elevation) {
  return [
    Math.sin(azimuth) * Math.cos(elevation),
    Math.sin(elevation),
    Math.cos(azimuth) * Math.cos(elevation),
  ];
}

/**
 * Lighting uniforms for a sun at (elevation, azimuth) radians, seen from
 * camKm above the sea.
 */
export function skyUniforms(elevation, azimuth, camKm) {
  const sunDir = dirFrom(azimuth, elevation);

  // horizon haze table: 16 steps from toward the sun to directly away
  const horizon = new Float32Array(48);
  for (let i = 0; i < 16; i++) {
    const c = skyRadiance(
      dirFrom(azimuth + (i / 15) * Math.PI, 0.012),
      sunDir,
      camKm,
    );
    horizon.set(c, i * 3);
  }

  // cosine-weighted sky light on an upward surface: zenith plus a ring
  const ambient = [0, 0, 0];
  const samples = [[0, Math.PI / 2, 0.4]];
  for (let i = 0; i < 6; i++) {
    samples.push([azimuth + (i / 6) * 2 * Math.PI, 0.5, 0.1]);
  }
  for (const [az, el, w] of samples) {
    const c = skyRadiance(dirFrom(az, el), sunDir, camKm);
    for (let k = 0; k < 3; k++) ambient[k] += c[k] * w;
  }

  // exposure keyed to the low sky toward the sun (most of what is on
  // screen), only partly compensated so dusk still reads darker than
  // golden hour
  const key = Math.max(
    luminance(skyRadiance(dirFrom(azimuth, 0.17), sunDir, camKm)),
    1e-4,
  );
  const exposure = Math.min(0.4 / Math.pow(key, 0.8), 60);

  return {
    sunDir,
    sunCol: sunlightAt(camKm, sunDir),
    sunColMid: sunlightAt(MID_ALT, sunDir),
    sunColHigh: sunlightAt(HIGH_ALT, sunDir),
    ambient,
    horizon,
    exposure,
    // stars start to show once the sun is a couple of degrees down
    night: smoothstep(-0.03, -0.1, elevation),
  };
}
