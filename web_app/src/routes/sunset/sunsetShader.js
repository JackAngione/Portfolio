/*
  Open-ocean sunset scene, raymarched per pixel in one fullscreen fragment
  pass.

  Units: the sea is in meters (camera ~3 m above it, as from a boat's deck,
  looking out along +z); the atmosphere and cloud decks are in kilometers.

  - sky: single-scattering Rayleigh + Mie + ozone atmosphere, so the colors
    come from the actual sun elevation (scrolling sets the sun)
  - clouds: a raymarched layer of cumulus (flat bases, domed tops broken
    into cauliflower lobes) under a faint high deck on a curved shell, each
    lit by sunlight that was reddened on its way to that altitude (so the
    high deck stays pink after the cumulus goes grey)
  - sea: a deep-water wind sea summed from sharp-crested waves spanning a
    40 m swell down to centimeter ripples, with real dispersion; the waves
    too fine for a pixel roughen its sheen instead, and the steepest crests
    break into whitecaps whose foam lingers after the crest moves on
  - interaction: u_ripples are expanding rings dropped into the water by
    the cursor

  The atmosphere constants are mirrored in atmosphere.js, which derives the
  per-frame lighting uniforms (sun color at each altitude, ambient, the
  horizon haze table and exposure) on the CPU.
*/

export const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

export const FRAG = `
precision highp float;

uniform vec2 u_res;
uniform float u_waterT;
uniform float u_cloudT;
uniform vec3 u_camPos;
uniform vec2 u_camAng;
uniform vec3 u_sunDir;
uniform vec3 u_sunCol;
uniform vec3 u_sunColMid;
uniform vec3 u_sunColHigh;
uniform vec3 u_ambient;
uniform vec3 u_horizon[16];
uniform float u_exposure;
uniform float u_night;
uniform vec4 u_ripples[16];
uniform sampler2D u_noise;

#define PI 3.14159265
#define FOCAL 2.0

// atmosphere, km
#define RE 6360.0
#define RA 6420.0
const vec3 BR = vec3(5.802e-3, 13.558e-3, 33.1e-3);
// light haze: enough Mie for a glow around the sun without steeping the
// whole sky in orange
#define BMS 3.0e-3
#define BME 3.3e-3
// ozone boosted past physical, and harder in red than the real layer, so
// the high sky stays blue through dusk instead of going violet (too much
// red and the band above the horizon glow turns green)
const vec3 BO = vec3(3.0e-3, 5.1e-3, 0.213e-3);
#define SUN_I 22.0
#define SUN_R 0.0105

// clouds, km; u_sunColMid is the sunlight halfway up the cumulus layer
// (MID_ALT in atmosphere.js)
#define CLOUD_BASE 1.3
#define CLOUD_TOP 2.5
#define CLOUD_FAR 160.0
#define CLOUD_EXT 16.0
#define HIGH_ALT 8.5

// sea, m: a spectrum of WAVE_COUNT waves, each about WAVE_KSTEP times
// shorter than the last, from the longest at wavenumber WAVE_K0 (a 39 m
// swell) down to centimeter ripples, all of them around WAVE_STEEP steep
// (a·k), as in a real wind sea (wave() shapes the spectrum)
#define WAVE_COUNT 40
#define WAVE_K0 0.16
#define WAVE_KSTEP 1.2
#define WAVE_STEEP 0.055
// crest sharpness, and how hard each wave drags the shorter ones riding
// on it toward its crests
#define WAVE_SHARP 1.6
#define WAVE_DRAG 2.0
// the sharp-crested profile's mean, and the scale that makes its crest to
// trough height twice the amplitude
#define WAVE_MEAN 0.353
#define WAVE_SCALE 2.085
// the longest waves shape the traced surface and build the whitecaps;
// shorter ones only shade it
#define GEOM_WAVES 12
#define CREST_WAVES 6
// the traced surface stays between these heights, and beyond SEA_NEAR,
// where the waves stand only a few pixels tall and their shading carries
// them, the sea is traced as a plane
#define SEA_TOP 1.7
#define SEA_BOTTOM -1.2
#define SEA_NEAR 320.0
// the direction the waves run (toward the camera, from the right) and its
// perpendicular, which the shorter waves fan out along
const vec2 WAVE_DIR = vec2(-0.3, -0.954);
const vec2 WAVE_SIDE = vec2(0.954, -0.3);

// ------------------------------------------------------------ noise ----

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// value noise from the random texture; the hardware lerp does the
// interpolation after a smoothstep remap of the fractional coordinate
float noise(vec2 x) {
  vec2 p = floor(x);
  vec2 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return texture2D(u_noise, (p + f + 0.5) / 256.0).x;
}

// 3D value noise in one fetch: the texture's green channel is its red
// channel shifted by (37, 17) texels, so each z slice is a shifted copy
float noise3(vec3 x) {
  vec3 p = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  vec2 uv = p.xy + vec2(37.0, 17.0) * p.z + f.xy;
  vec2 rg = texture2D(u_noise, (uv + 0.5) / 256.0).yx;
  return mix(rg.x, rg.y, f.z);
}

const mat2 OCT = mat2(1.6, 1.2, -1.2, 1.6);

// octaves past oct are replaced by their mean so far-away detail fades
// out instead of aliasing
float fbm(vec2 p, int oct) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= oct) { v += a; break; }
    v += a * noise(p);
    p = OCT * p;
    a *= 0.5;
  }
  return v;
}

float fbm3(vec3 p, int oct) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= oct) { v += a; break; }
    v += a * noise3(p);
    p = vec3(OCT * p.xy, p.z * 1.7);
    a *= 0.5;
  }
  return v;
}

// ------------------------------------------------------- atmosphere ----

vec3 densityAt(float h) {
  return vec3(
    exp(-h / 8.0),
    exp(-h / 1.2),
    max(0.0, 1.0 - abs(h - 25.0) / 15.0)
  );
}

float atmoExit(vec3 pos, vec3 dir) {
  float b = dot(pos, dir);
  float c = dot(pos, pos) - RA * RA;
  return -b + sqrt(max(b * b - c, 0.0));
}

vec3 extinction(vec3 od) {
  return BR * od.x + BME * od.y + BO * od.z;
}

float hg(float mu, float g) {
  float g2 = g * g;
  return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * mu, 1.5));
}

vec3 atmosphere(vec3 rd) {
  vec3 ro = vec3(0.0, RE + u_camPos.y * 0.001, 0.0);
  float tMax = atmoExit(ro, rd);
  vec3 odView = vec3(0.0);
  vec3 sumR = vec3(0.0);
  vec3 sumM = vec3(0.0);
  float prev = 0.0;
  for (int i = 0; i < 12; i++) {
    // quadratic spacing: dense samples low, where the air is
    float s = (float(i) + 1.0) / 12.0;
    float tt = tMax * s * s;
    float ds = tt - prev;
    vec3 pos = ro + rd * (prev + ds * 0.5);
    prev = tt;
    float r = length(pos);
    vec3 dens = densityAt(r - RE) * ds;
    odView += dens;

    // earth shadow: is the sun above this sample's own horizon?
    float horizonCos = -sqrt(max(1.0 - (RE * RE) / (r * r), 0.0));
    float lit = smoothstep(horizonCos - 0.004, horizonCos + 0.004,
                           dot(pos / r, u_sunDir));
    if (lit <= 0.0) continue;

    float tl = atmoExit(pos, u_sunDir);
    vec3 odL = vec3(0.0);
    float pl = 0.0;
    for (int j = 0; j < 4; j++) {
      float sj = (float(j) + 1.0) / 4.0;
      float tj = tl * sj * sj;
      float dsj = tj - pl;
      odL += densityAt(length(pos + u_sunDir * (pl + dsj * 0.5)) - RE) * dsj;
      pl = tj;
    }
    vec3 att = exp(-extinction(odView + odL)) * lit;
    sumR += att * dens.x;
    sumM += att * dens.y;
  }
  float mu = dot(rd, u_sunDir);
  float pR = 3.0 / (16.0 * PI) * (1.0 + mu * mu);
  float pM = hg(mu, 0.78);
  return SUN_I * (sumR * BR * pR + sumM * BMS * pM);
}

// sky radiance just above the horizon, by angle away from the sun's
// azimuth, tabulated on the CPU (used as distance haze)
vec3 horizonColor(vec3 dir) {
  vec2 a = normalize(dir.xz + vec2(1e-6, 0.0));
  vec2 s = normalize(u_sunDir.xz + vec2(1e-6, 0.0));
  float x = acos(clamp(dot(a, s), -1.0, 1.0)) / PI * 15.0;
  vec3 c = vec3(0.0);
  for (int i = 0; i < 16; i++) {
    c += u_horizon[i] * max(0.0, 1.0 - abs(x - float(i)));
  }
  return c;
}

// ----------------------------------------------------------- clouds ----

// distance along the view ray to a cloud shell at altitude h, on a curved
// earth so the decks converge realistically at the horizon
float shellT(float mu, float h0, float h) {
  float r0 = RE + h0;
  float b = r0 * mu;
  float c = (h0 - h) * (2.0 * RE + h0 + h);
  return -b + sqrt(max(b * b - c, 0.0));
}

const vec2 WIND = vec2(0.03, -0.012);

// sunset light on cloud reads rose rather than peach: a little of the
// red goes to blue and some green drops out (k = 0 leaves it alone)
vec3 rose(vec3 c, float k) {
  return vec3(c.r, c.g * (1.0 - 0.2 * k), c.b + c.r * 0.2 * k);
}

// height through the cumulus layer (0..1) that the dome over q reaches:
// rounded cells, bunched into banks with clear sky between them
float cloudTop(vec2 q, float cover, int oct) {
  float x = fbm(q * 0.45, oct) + cover * 0.3 - 0.73;
  return sqrt(max(x, 0.0)) * 1.5;
}

// flat bases, domed tops, and billowy 3D noise that breaks the surfaces
// into cauliflower lobes (which rise slowly, like real convection)
float cloudDensity(vec2 q, float hn, float top, float lobes, float ramp) {
  float d = top - hn;
  if (d <= 0.0) return 0.0;
  if (lobes > 0.0) {
    float b = fbm3(vec3(q * 3.2, hn * 4.0 - u_cloudT * 0.004), 2);
    d -= (1.0 - abs(b * 2.0 - 1.0)) * 0.3 * lobes;
  }
  return clamp(d * ramp, 0.0, 1.0) * smoothstep(0.0, 0.05, hn);
}

vec3 renderClouds(vec3 rd, vec3 col, int steps, bool primary) {
  float camKm = u_camPos.y * 0.001;
  float t0 = shellT(rd.y, camKm, CLOUD_BASE);
  if (t0 > CLOUD_FAR) return col;
  float t1 = min(shellT(rd.y, camKm, CLOUD_TOP), CLOUD_FAR);
  float dt = (t1 - t0) / float(steps);
  // dither the start so the step pattern turns into fine grain
  float t = t0 + dt * hash12(gl_FragCoord.xy);
  // detail finer than the step would only sparkle, so it fades out on
  // long (grazing) rays
  int oct = dt < 0.8 ? 3 : 2;
  float lobes = primary ? smoothstep(0.5, 0.2, dt) : 0.0;
  // and edges soften to about a step's width
  float ramp = 5.0 / (1.0 + dt * 3.0);
  // a step can't go fully opaque in one go, so a cloud only a couple of
  // steps deep still builds up smoothly
  float ext = min(CLOUD_EXT * dt, 2.5);

  vec2 sun = normalize(u_sunDir.xz + vec2(1e-5, 0.0));
  float sunRise = u_sunDir.y / (CLOUD_TOP - CLOUD_BASE);
  float mu = dot(rd, u_sunDir);
  // bright silver linings toward the sun, plus a softer lobe for light
  // that has scattered around inside the cloud
  float phase = 4.0 * PI * mix(hg(mu, 0.6), hg(mu, -0.2), 0.25);
  float phaseMS = 4.0 * PI * hg(mu, 0.3);
  // cotton-candy pink, except right around the sun where the silver
  // linings stay gold
  vec3 sunMid = rose(u_sunColMid, 1.0 - smoothstep(0.93, 0.995, mu));
  // the flat bases face away from a sun above the layer, but light up
  // once it has sunk below them at dusk
  float under = smoothstep(0.02, -0.03, u_sunDir.y);
  // bases also pick up a little of the glow all around the horizon
  vec3 glow = vec3(0.0);
  for (int i = 0; i < 16; i++) glow += u_horizon[i];
  glow *= 0.15 / 16.0;
  vec2 drift = u_camPos.xz * 0.001 - WIND * u_cloudT;

  float T = 1.0;
  vec3 sum = vec3(0.0);
  for (int i = 0; i < 48; i++) {
    if (i >= steps || T < 0.03) break;
    float h = camKm + t * rd.y + t * t / (2.0 * RE);
    float hn = (h - CLOUD_BASE) / (CLOUD_TOP - CLOUD_BASE);
    vec2 q = rd.xz * t + drift;
    float cover = noise(q * 0.05 + 11.0);
    float top = cloudTop(q, cover, oct);
    float d = cloudDensity(q, hn, top, lobes, ramp);
    if (d > 0.0) {
      // optical depth toward the (nearly horizontal) sun, taken above the
      // soft base so the underside doesn't read as lit; the near sample
      // sees the lobes so each one shades itself
      float hl = max(hn, 0.06);
      vec2 q1 = q + sun * 0.12;
      vec2 q2 = q + sun * 0.45;
      float od = cloudDensity(q1, hl + sunRise * 0.12, cloudTop(q1, cover, 3), lobes, 5.0) * 0.12
               + cloudDensity(q2, hl + sunRise * 0.45, cloudTop(q2, cover, 2), 0.0, 5.0) * 0.33;
      // skylight and diffused sunlight are shut out under a thick dome,
      // unevenly, so a wide bank's underside doesn't read as a flat sheet
      float sky = min(exp(-(top - hn) * 1.2) * (0.2 + 1.6 * noise(q * 1.3 + 5.0)), 1.0);
      float base = mix(smoothstep(0.0, 0.35, hn), 1.0, under);
      vec3 S = sunMid * (phase * 0.6 * base * exp(-od * CLOUD_EXT)
                         + phaseMS * 0.3 * (0.15 + 0.85 * sky) * exp(-od * CLOUD_EXT * 0.2))
             + u_ambient * (0.4 + 0.8 * sky)
             + glow * (1.0 - clamp(hn, 0.0, 1.0));
      // distant clouds melt into the sky behind them
      float fade = exp(-t / 60.0) * smoothstep(CLOUD_FAR, CLOUD_FAR * 0.7, t);
      float a = 1.0 - exp(-d * ext);
      sum += T * a * mix(col, S, fade);
      T *= 1.0 - a;
    }
    t += dt;
  }
  return col * T + sum;
}

float highDensity(vec2 p) {
  vec2 q = mat2(0.8, -0.6, 0.6, 0.8) * p;
  q = q * vec2(0.06, 0.16) + vec2(u_cloudT * 0.0025, 0.0);
  float w = fbm(q * 1.4 + 5.0, 3);
  float n = fbm(q + vec2(w * 1.4, w * 0.5), 5);
  return smoothstep(0.52, 0.82, n);
}

vec3 renderHigh(vec3 rd, vec3 col) {
  float camKm = u_camPos.y * 0.001;
  float t = shellT(rd.y, camKm, HIGH_ALT);
  vec2 p = rd.xz * t + u_camPos.xz * 0.001;
  float d = highDensity(p);
  if (d < 0.003) return col;
  float mu = dot(rd, u_sunDir);
  float phase = 4.0 * PI * mix(hg(mu, 0.7), hg(mu, -0.1), 0.5);
  vec3 c = rose(u_sunColHigh, 1.0) * phase * 0.07 + u_ambient * 0.8;
  float alpha = (1.0 - exp(-d * 1.4)) * 0.15;
  c = mix(c, col, 1.0 - exp(-t / 140.0));
  return mix(col, c, alpha);
}

// ---------------------------------------------------------------- sky ----

vec3 skyScene(vec3 rd, float primary) {
  vec3 dir = normalize(vec3(rd.x, max(rd.y, 0.0005), rd.z));
  vec3 col = atmosphere(dir);
  float mu = dot(dir, u_sunDir);

  // lens bloom around the sun
  col += u_sunCol * (0.02 * pow(max(mu, 0.0), 900.0) + 0.0025 * pow(max(mu, 0.0), 60.0));

  if (primary > 0.5) {
    float ang = acos(clamp(mu, -1.0, 1.0));
    float disc = smoothstep(SUN_R, SUN_R * 0.8, ang);
    float limb = sqrt(max(1.0 - (ang * ang) / (SUN_R * SUN_R), 0.0));
    col += u_sunCol * disc * (0.55 + 0.45 * limb) * 16.0;

    if (u_night > 0.0) {
      vec2 uv = dir.xz / (dir.y + 1.0) * 220.0;
      vec2 id = floor(uv);
      float h = hash12(id);
      if (h > 0.965) {
        vec2 f = fract(uv) - 0.5 - (vec2(hash12(id + 7.1), hash12(id + 3.3)) - 0.5) * 0.6;
        float twinkle = 0.7 + 0.3 * sin(u_cloudT * 2.0 + h * 90.0);
        col += vec3(0.8, 0.85, 1.0) * exp(-dot(f, f) * 60.0) * (h - 0.965) * 30.0
             * u_night * twinkle * smoothstep(0.03, 0.2, dir.y);
      }
    }
  }

  col = renderHigh(dir, col);
  return renderClouds(dir, col, primary > 0.5 ? 48 : 7, primary > 0.5);
}

// -------------------------------------------------------------- sea ----

// wave i: heading (xy), wavenumber (z) and amplitude (w). Headings fan
// out wider around WAVE_DIR the shorter the wave, up to ~65° off it, so
// the crests are short and broken rather than long ridges, and both they
// and the wavelengths are scattered at random (the wavelengths by up to
// half a step) so the waves never lock into a regular weave. The steepest
// are the 3-15 m waves that give the sea its shape; the swell under them
// is gentler, and so are the ripples, so their texture doesn't swamp it.
vec4 wave(float i) {
  float j = hash12(vec2(i, 1.7)) * 2.0 - 1.0;
  vec2 d = normalize(WAVE_DIR + WAVE_SIDE * j * (0.45 + i * 0.045));
  float k = WAVE_K0 * exp2(log2(WAVE_KSTEP) * (i + hash12(vec2(i, 8.3)) - 0.5));
  float steep = WAVE_STEEP * mix(0.7, 1.25, smoothstep(0.0, 7.0, i))
              * mix(1.0, 0.35, smoothstep(10.0, 34.0, i));
  return vec4(d, k, steep / k);
}

// phase of wave i at p: deep-water dispersion, omega = sqrt(g k), plus a
// random offset
float wavePhase(vec4 w, float i, vec2 p) {
  return dot(w.xy, p) * w.z - u_waterT * sqrt(9.81 * w.z) + hash12(vec2(i, 4.1)) * 6.2832;
}

// Height of the sea at p from its n longest waves. Each is a sharp crest
// over a broad trough (the exp of a sine) and drags the sample point along
// its slope, so the shorter waves after it bunch up and steepen on its
// crests the way real ones ride a swell.
float seaHeight(vec2 p, int n) {
  float h = 0.0;
  for (int i = 0; i < GEOM_WAVES; i++) {
    if (i >= n) break;
    vec4 w = wave(float(i));
    float x = wavePhase(w, float(i), p);
    float e = exp(WAVE_SHARP * (sin(x) - 1.0));
    h += w.w * (e - WAVE_MEAN);
    p -= w.xy * (w.w * WAVE_DRAG * e * cos(x));
  }
  return h * WAVE_SCALE;
}

// The sea's surface for shading at p, seen through a pixel fp meters
// wide. Returns the slope (xy) of the waves the pixel resolves and z = the
// slope variance of the ones too fine for it, which only roughen its
// sheen; each wave hands its slope over from one to the other as it
// shrinks toward the pixel's size, so nothing sparkles or aliases. h is
// the surface's height, and crest how high the longest waves stack up
// here now (x) and 1.4 s (y) and 3 s (z) ago, 0..1: where whitecaps are
// breaking, and where the foam they left behind still lies.
vec3 seaSurface(vec2 p, float fp, out float h, out vec3 crest) {
  vec2 g = vec2(0.0);
  float var = 0.0;
  h = 0.0;
  crest = vec3(0.0);
  float crestSum = 0.0;
  for (int i = 0; i < WAVE_COUNT; i++) {
    float fi = float(i);
    vec4 w = wave(fi);
    float res = smoothstep(2.0, 5.0, 6.2832 / (w.z * fp));
    float slopeVar = 0.67 * w.z * w.z * w.w * w.w;
    // too fine for the pixel: all the rest only roughen it, each about
    // as much as this one would have
    if (res <= 0.0) {
      var += float(WAVE_COUNT - i) * slopeVar;
      break;
    }
    float x = wavePhase(w, fi, p);
    float s = sin(x);
    float c = cos(x);
    float e = exp(WAVE_SHARP * (s - 1.0));
    h += w.w * (e - WAVE_MEAN) * res;
    g += w.xy * (w.w * w.z * WAVE_SHARP * e * c * res);
    var += slopeVar * (1.0 - res * res);
    if (i < CREST_WAVES) {
      float om = sqrt(9.81 * w.z);
      crest += w.w * exp(WAVE_SHARP * (vec3(s, sin(x + om * 1.4), sin(x + om * 3.0)) - 1.0));
      crestSum += w.w;
    }
    p -= w.xy * (w.w * WAVE_DRAG * e * c);
  }
  crest /= max(crestSum, 1e-4);
  h *= WAVE_SCALE;
  return vec3(g * WAVE_SCALE, var);
}

float ripples(vec2 p) {
  float h = 0.0;
  for (int i = 0; i < 16; i++) {
    vec4 r = u_ripples[i];
    if (r.w <= 0.0) continue;
    float age = u_waterT - r.z;
    if (age < 0.0 || age > 9.0) continue;
    float x = length(p - r.xy) - age * 2.2;
    float env = exp(-x * x / (1.2 + age * 1.4)) * exp(-age * 0.38);
    h += r.w * env * sin(x * 3.2) * 0.13;
  }
  return h;
}

float trace(vec3 ro, vec3 rd) {
  float tPlane = ro.y / -rd.y;
  // far out, the flat plane will do
  if (tPlane > SEA_NEAR) return tPlane;
  float tFar = (ro.y - SEA_BOTTOM) / -rd.y;
  float t = max(0.0, (ro.y - SEA_TOP) / -rd.y);
  float tPrev = t;
  float dPrev = 1.0;
  for (int i = 0; i < 96; i++) {
    vec3 p = ro + rd * t;
    // shorter waves only stand out close up
    float d = p.y - seaHeight(p.xz, t < 40.0 ? GEOM_WAVES : (t < 120.0 ? 9 : 6));
    // stepped through the surface: interpolate back to it
    if (d < 0.0) return mix(tPrev, t, dPrev / (dPrev - d));
    if (d < 0.001 * t) break;
    tPrev = t;
    dPrev = d;
    t += max(d * 0.6, 0.002 * t);
    if (t > tFar) return tFar;
  }
  return t;
}

// foam's bubbly lace, drifting downwind: a coarse net of bubbles with
// finer ones inside it, averaged out as its cells shrink below the pixel
float foamLace(vec2 p, float fp) {
  vec2 q = p * 1.6 - WAVE_DIR * u_waterT * 0.5;
  float coarse = smoothstep(0.3, 0.7, noise(q) * 0.65 + noise(q * 2.3 + 17.0) * 0.35);
  float fine = noise(q * 6.1 + 31.0);
  coarse = mix(coarse, 0.45, smoothstep(0.1, 0.4, fp));
  fine = mix(fine, 0.5, smoothstep(0.02, 0.08, fp));
  return coarse * (0.6 + 0.8 * fine);
}

float fresnel(float c) {
  return 0.02 + 0.98 * pow(1.0 - clamp(c, 0.0, 1.0), 5.0);
}

vec3 shadeSea(vec3 ro, vec3 rd, float t) {
  vec3 p = ro + rd * t;
  vec3 L = u_sunDir;

  // the pixel's size on the water: between its width across the view and
  // its foreshortened depth
  float fp = t / (FOCAL * u_res.y) * inversesqrt(max(-rd.y, 0.01));
  float h;
  vec3 crest;
  vec3 s = seaSurface(p.xz, fp, h, crest);
  vec2 g = s.xy;
  if (t < 220.0) {
    float e = 0.02 + t * 0.001;
    float r0 = ripples(p.xz);
    g += vec2(ripples(p.xz + vec2(e, 0.0)) - r0, ripples(p.xz + vec2(0.0, e)) - r0) / e;
  }
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  // slope variance of all the waves too fine to draw, down to capillary
  // ripples, plus the sun's own width
  float rough = s.z + 0.002;

  // the sky in the waves: a facet tilted away past the line of sight would
  // mirror the next wave over, and that is mostly its sky-lit back too;
  // the rough, unresolved waves blur each reflection up over the sky above
  float ndv = max(dot(n, -rd), 0.0);
  vec3 r = reflect(rd, n);
  r.y = max(abs(r.y), sqrt(rough) * 0.15);
  r = normalize(r);
  vec3 refl = skyScene(r, 0.0);
  float F = fresnel(ndv);
  // not physical: the sky seen in the sea is mostly drained of its color
  // and steeped in slate blue, so the water reads as open ocean rather
  // than a mirror of the warm sky; the sun's path and the far sea keep the
  // plain, golden reflection, both fading in slowly so the blue melts into
  // the glow instead of meeting it at an edge
  float warm = max(pow(max(dot(r, L), 0.0), 120.0), smoothstep(80.0, 1400.0, t));
  vec3 seaRefl = mix(refl, vec3(dot(refl, vec3(0.2126, 0.7152, 0.0722))), 0.75)
               * vec3(0.3, 0.52, 0.78);
  refl = mix(seaRefl, refl, warm);

  // light from inside the water: sky light scattered back up out of the
  // deep, and low sunlight shining through the thin tops of the waves
  vec3 body = u_ambient * vec3(0.008, 0.034, 0.06)
            + u_sunCol * vec3(0.004, 0.022, 0.02)
              * pow(max(dot(rd, L), 0.0), 4.0) * smoothstep(-0.1, 0.9, h);
  vec3 col = mix(body, refl, F);

  // the sun's glitter: a microfacet highlight over the unresolved slopes
  vec3 H = normalize(L - rd);
  float nh = max(dot(n, H), 1e-3);
  float tan2 = (1.0 - nh * nh) / (nh * nh);
  float D = exp(-tan2 / rough) / (PI * rough * nh * nh * nh * nh);
  col += u_sunCol * D * fresnel(dot(H, -rd)) * 0.025 / max(ndv, 0.1)
       * smoothstep(-0.02, 0.02, dot(n, L));

  // whitecaps: where the longest waves stack up steep enough to break (a
  // percent or two of the sea, more where the wind gusts, and along only a
  // few meters of each crest), and the foam each leaves lying where its
  // crest was a moment ago, thinning into lace as the crest runs on
  float lace = foamLace(p.xz, fp);
  float gust = noise(p.xz * 0.012 + WAVE_DIR * u_waterT * 0.02) * 0.6
             + noise(p.xz * vec2(0.11, 0.05) + 3.0) * 0.4;
  vec3 c = crest + (lace - 0.5) * 0.06 - (0.75 - 0.1 * gust);
  float foam = smoothstep(0.0, 0.05, c.x) * (0.75 + 0.25 * lace)
             + max(smoothstep(0.0, 0.05, c.y) * 0.6, smoothstep(0.0, 0.05, c.z) * 0.3) * lace;
  // foam is a bright diffuse surface: sky dome, the glow on the horizon and
  // whatever direct sun its tilt catches; mostly white, however colored
  // the light
  vec3 foamCol = u_ambient * 4.0 + horizonColor(L) * 0.2
               + u_sunCol * (0.3 + 0.7 * max(dot(n, L), 0.0)) * 0.5;
  foamCol = mix(foamCol, vec3(dot(foamCol, vec3(0.2126, 0.7152, 0.0722))), 0.6);
  col = mix(col, foamCol, clamp(foam, 0.0, 1.0));

  // atmospheric haze toward the horizon
  return mix(col, horizonColor(rd), 1.0 - exp(-t * 0.00022));
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

// Filmic curve on the brightest channel keeps a sunset's hue (per-channel
// ACES flattens bright orange into yellow); only the very brightest
// values, like the sun's core, bleach toward white.
vec3 tonemap(vec3 c) {
  float m = max(max(c.r, c.g), c.b);
  vec3 hue = c * (aces(vec3(m)).x / max(m, 1e-5));
  return mix(hue, aces(c), smoothstep(1.5, 12.0, m) * 0.8 + 0.15);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float yaw = u_camAng.x;
  float pitch = u_camAng.y;
  vec3 fw = vec3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch));
  vec3 rt = normalize(vec3(cos(yaw), 0.0, -sin(yaw)));
  vec3 up = cross(fw, rt);
  vec3 rd = normalize(uv.x * rt + uv.y * up + FOCAL * fw);
  vec3 ro = u_camPos;

  vec3 col;
  if (rd.y >= 0.0) {
    col = skyScene(rd, 1.0);
  } else {
    col = shadeSea(ro, rd, trace(ro, rd));
  }

  // white balance a little cooler than the sunlight, as a camera would
  // be, so the scene isn't steeped in orange
  col *= vec3(0.9, 0.98, 1.06);
  col = tonemap(col * u_exposure);
  col = pow(col, vec3(1.0 / 2.2));
  col *= 1.0 - 0.18 * dot(uv * vec2(0.6, 1.0), uv * vec2(0.6, 1.0));
  col += (hash12(gl_FragCoord.xy + fract(u_waterT) * 97.0) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`;
