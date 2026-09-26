import React, { useEffect, useRef } from "react";
import { FRAG, VERT } from "./sunsetShader.js";
import { skyUniforms } from "./atmosphere.js";

/*
  Full-viewport raymarched sunset over the open ocean (see
  sunsetShader.js) that the page drives:
  - the cursor drags a wake of ripples through the water; clicking drops
    a bigger splash
  - scrolling sets the sun and tilts the camera down from the sky into the
    deep water around the boat; scrolling fast whips up the wind so clouds
    and waves hurry
  - the theme toggle moves the sun between golden hour (light) and dusk
    (dark)
  The scene renders at a fraction of the screen resolution that adapts to
  how fast the GPU keeps up, and is upscaled by the browser.
*/

const FOCAL = 2.0;
const DECK_HEIGHT = 3.0; // eye height above the sea, on a boat's deck

// sun elevation (radians) at the top and the bottom of the page
const SUN_ELEVATION = {
  light: [0.085, 0.03],
  dark: [0.02, -0.055],
};
const PITCH_TOP = 0.115; // horizon ~73% down the screen
const PITCH_BOTTOM = -0.3; // looking down into the water, horizon just out of frame

const MAX_RIPPLES = 16;
const MIN_SCALE = 0.3;
// the sky is composed the same way on every visit
const NOISE_SEED = 42;

const INTERACTIVE = "a, button, input, textarea, select, label, [role=button]";

const UNIFORMS = [
  "u_res",
  "u_waterT",
  "u_cloudT",
  "u_camPos",
  "u_camAng",
  "u_sunDir",
  "u_sunCol",
  "u_sunColMid",
  "u_sunColHigh",
  "u_ambient",
  "u_horizon",
  "u_exposure",
  "u_night",
  "u_ripples",
  "u_noise",
];

// Compiles and links without reading back any status, so with
// KHR_parallel_shader_compile the driver can build this (large) shader off
// the main thread while the hero animates in.
function startProgram(gl) {
  const prog = gl.createProgram();
  for (const [type, src] of [
    [gl.VERTEX_SHADER, VERT],
    [gl.FRAGMENT_SHADER, FRAG],
  ]) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    gl.attachShader(prog, sh);
  }
  gl.linkProgram(prog);
  return prog;
}

function programError(gl, prog) {
  if (gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  const logs = gl
    .getAttachedShaders(prog)
    .map((sh) => gl.getShaderInfoLog(sh))
    .filter(Boolean);
  return [gl.getProgramInfoLog(prog), ...logs].join("\n");
}

// small seeded PRNG (mulberry32)
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 256² random texels; green is red shifted by (37, 17) for noise3()
function createNoiseTexture(gl) {
  const size = 256;
  const random = seededRandom(NOISE_SEED);
  const red = new Uint8Array(size * size);
  for (let i = 0; i < red.length; i++) red[i] = random() * 256;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      data[i * 4] = red[i];
      data[i * 4 + 1] = red[((y - 17) & 255) * size + ((x - 37) & 255)];
      data[i * 4 + 2] = random() * 256;
      data[i * 4 + 3] = 255;
    }
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    size,
    size,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    data,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  return tex;
}

// same camera basis as the shader's main()
function viewRay(uvx, uvy, yaw, pitch) {
  const fw = [
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  ];
  const rt = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const up = [
    fw[1] * rt[2] - fw[2] * rt[1],
    fw[2] * rt[0] - fw[0] * rt[2],
    fw[0] * rt[1] - fw[1] * rt[0],
  ];
  const d = [0, 1, 2].map((k) => uvx * rt[k] + uvy * up[k] + FOCAL * fw[k]);
  const len = Math.hypot(d[0], d[1], d[2]);
  return d.map((v) => v / len);
}

const lerp = (a, b, t) => a + (b - a) * t;

function SunsetScene() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // keep the default alpha:true — an opaque WebGL canvas gets promoted to
    // a compositing layer that paints over the page content in Chromium
    const gl = canvas.getContext("webgl", {
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });
    // no WebGL: the wrapper's CSS gradient stands in
    if (!gl) return;

    const parallel = gl.getExtension("KHR_parallel_shader_compile");
    const prog = startProgram(gl);
    let ready = false;
    const u = {};

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const noiseTex = createNoiseTexture(gl);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, noiseTex);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    // ---- resolution ------------------------------------------------------
    // at most one render pixel per CSS pixel: the scene is soft enough that
    // the browser's upscale on hi-dpi screens disappears under the grain
    let scale = 0.7;
    let ceiling = 1; // lowered whenever a scale proves too slow

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // and cap the pixel count on very large screens
      const s = Math.min(scale, Math.sqrt(1.8e6 / (w * h)));
      canvas.width = Math.max(2, Math.round(w * s));
      canvas.height = Math.max(2, Math.round(h * s));
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (ready) gl.uniform2f(u.u_res, canvas.width, canvas.height);
    };

    // ---- theme, scroll and pointer state -----------------------------------
    const themeNow = () =>
      document.documentElement.dataset.theme === "light" ? "light" : "dark";
    let theme = themeNow();
    const themeObserver = new MutationObserver(() => {
      theme = themeNow();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const scrollProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
    };
    let scroll = scrollProgress();
    let lastScrollY = window.scrollY;
    let gust = 0;
    let lightMix = theme === "light" ? 1 : 0; // eases 0 (dusk) .. 1 (golden hour)

    let pointerTX = 0;
    let pointerTY = 0;
    let pointerX = 0;
    let pointerY = 0;

    let waterT = 0;
    let cloudT = 0;

    // camera, kept here too for mapping the cursor into the scene
    let yaw = 0;
    let pitch = PITCH_TOP;
    const camPos = [0, DECK_HEIGHT, 0];

    const ripples = new Float32Array(MAX_RIPPLES * 4);
    let rippleIndex = 0;

    // drop a ripple where the cursor's view ray meets the water (the
    // surface sits near y = 0); pointing at the sky does nothing
    const dropRipple = (clientX, clientY, strength) => {
      const h = window.innerHeight;
      const uvx = (clientX - window.innerWidth / 2) / h;
      const uvy = (h / 2 - clientY) / h;
      const d = viewRay(uvx, uvy, yaw, pitch);
      if (d[1] >= -0.002) return;
      const t = camPos[1] / -d[1];
      if (t > 220) return;
      ripples.set(
        [camPos[0] + d[0] * t, camPos[2] + d[2] * t, waterT, strength],
        rippleIndex * 4,
      );
      rippleIndex = (rippleIndex + 1) % MAX_RIPPLES;
    };

    let lastEmit = 0;
    let lastEmitX = 0;
    let lastEmitY = 0;
    const onPointerMove = (e) => {
      if (reducedMotion.matches) return;
      pointerTX = e.clientX / window.innerWidth - 0.5;
      pointerTY = e.clientY / window.innerHeight - 0.5;
      const now = performance.now();
      const dx = e.clientX - lastEmitX;
      const dy = e.clientY - lastEmitY;
      if (now - lastEmit < 80 || dx * dx + dy * dy < 400) return;
      lastEmit = now;
      lastEmitX = e.clientX;
      lastEmitY = e.clientY;
      dropRipple(e.clientX, e.clientY, 1);
    };
    const onPointerDown = (e) => {
      if (reducedMotion.matches) return;
      if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return;
      dropRipple(e.clientX, e.clientY, 2.2);
    };

    // ---- lighting (recomputed only when the sun actually moves) -----------
    let lastSun = null;
    const updateSky = (elevation, azimuth) => {
      if (
        lastSun &&
        Math.abs(lastSun[0] - elevation) < 2e-4 &&
        Math.abs(lastSun[1] - azimuth) < 2e-4
      ) {
        return;
      }
      lastSun = [elevation, azimuth];
      const s = skyUniforms(elevation, azimuth, camPos[1] * 0.001);
      gl.uniform3fv(u.u_sunDir, s.sunDir);
      gl.uniform3fv(u.u_sunCol, s.sunCol);
      gl.uniform3fv(u.u_sunColMid, s.sunColMid);
      gl.uniform3fv(u.u_sunColHigh, s.sunColHigh);
      gl.uniform3fv(u.u_ambient, s.ambient);
      gl.uniform3fv(u.u_horizon, s.horizon);
      // dusk is exposed a touch darker so the page stays moody
      gl.uniform1f(u.u_exposure, s.exposure * lerp(0.82, 1.0, lightMix));
      gl.uniform1f(u.u_night, s.night);
    };

    // once the driver has finished the program: look up everything, or give
    // up and leave the CSS gradient
    const finishProgram = () => {
      const error = programError(gl, prog);
      if (error) {
        console.error(error);
        return false;
      }
      gl.useProgram(prog);
      const aPos = gl.getAttribLocation(prog, "a_pos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      for (const name of UNIFORMS) u[name] = gl.getUniformLocation(prog, name);
      gl.uniform1i(u.u_noise, 0);
      ready = true;
      resize();
      return true;
    };

    // ---- frame loop --------------------------------------------------------
    let animationID;
    let frames = 0;
    let last = 0;
    let frameAvg = 16.7;
    let sampleFrames = 0;

    const draw = (now) => {
      animationID = requestAnimationFrame(draw);
      if (!ready) {
        if (
          parallel &&
          !gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR)
        ) {
          return;
        }
        if (!finishProgram()) {
          cancelAnimationFrame(animationID);
          return;
        }
      }
      // a background has no business running at 120 Hz
      if (now - last < 12) return;
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
      last = now;
      const still = reducedMotion.matches;

      // ease every input so nothing in the scene ever jumps
      const ease = (rate) => 1 - Math.exp(-dt * rate);
      pointerX = lerp(pointerX, still ? 0 : pointerTX, ease(2.5));
      pointerY = lerp(pointerY, still ? 0 : pointerTY, ease(2.5));
      scroll = lerp(scroll, scrollProgress(), ease(4));
      lightMix = lerp(lightMix, theme === "light" ? 1 : 0, ease(1.2));

      const scrollY = window.scrollY;
      const speed = Math.abs(scrollY - lastScrollY) / Math.max(dt, 1e-3);
      lastScrollY = scrollY;
      const gustTarget = Math.min(speed / 900, 3);
      gust = lerp(gust, gustTarget, ease(gustTarget > gust ? 6 : 0.8));

      if (!still) {
        waterT += dt * (1 + gust * 0.5);
        cloudT += dt * (1 + gust * 5);
      }

      // gentle head movement: the view both turns and translates, so the
      // near waves slide against the horizon; and the deck rises and falls
      // a little on the swell
      const heave =
        0.16 * Math.sin(waterT * 0.9) + 0.08 * Math.sin(waterT * 0.53 + 1.3);
      yaw = pointerX * 0.035;
      pitch = lerp(PITCH_TOP, PITCH_BOTTOM, scroll) - pointerY * 0.02;
      camPos[0] = pointerX * 1.2;
      camPos[1] = DECK_HEIGHT + heave - pointerY * 0.25;

      // keep the sun inside the frame on narrow screens
      const aspect = window.innerWidth / window.innerHeight;
      const azimuth = Math.min(Math.max(0.1 * aspect, 0.035), 0.19);
      const elevation = lerp(
        lerp(SUN_ELEVATION.dark[0], SUN_ELEVATION.dark[1], scroll),
        lerp(SUN_ELEVATION.light[0], SUN_ELEVATION.light[1], scroll),
        lightMix,
      );
      updateSky(elevation, azimuth);

      gl.uniform1f(u.u_waterT, waterT);
      gl.uniform1f(u.u_cloudT, cloudT);
      gl.uniform3fv(u.u_camPos, camPos);
      gl.uniform2f(u.u_camAng, yaw, pitch);
      gl.uniform4fv(u.u_ripples, ripples);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // A viewport-sized WebGL canvas can get promoted to a hardware
      // overlay that composites above the page content; a geometry change
      // after the first composite demotes it. The extra 2px hang
      // offscreen, so this is invisible.
      if (++frames === 3) canvas.style.width = "calc(100% + 2px)";

      // adapt the render scale to what the GPU sustains
      if (frames > 30) {
        frameAvg = lerp(frameAvg, dt * 1000, 0.08);
        if (++sampleFrames >= 45) {
          sampleFrames = 0;
          if (frameAvg > 24 && scale > MIN_SCALE) {
            ceiling = scale;
            scale = Math.max(MIN_SCALE, scale * 0.82);
            resize();
          } else if (frameAvg < 20 && scale < ceiling * 0.95) {
            scale = Math.min(ceiling * 0.95, scale * 1.1);
            resize();
          }
        }
      }
    };

    const onContextLost = (e) => {
      e.preventDefault();
      cancelAnimationFrame(animationID);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    canvas.addEventListener("webglcontextlost", onContextLost);
    animationID = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationID);
      themeObserver.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      gl.deleteTexture(noiseTex);
      gl.deleteBuffer(buf);
      for (const sh of gl.getAttachedShaders(prog) ?? []) gl.deleteShader(sh);
      gl.deleteProgram(prog);
      // release the GPU context once the page is really gone (a StrictMode
      // remount reuses this same, still-attached canvas)
      setTimeout(() => {
        if (!canvas.isConnected) {
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        }
      });
    };
  }, []);

  return (
    // -inset-px keeps the canvas from exactly matching the viewport; an
    // exactly-fullscreen WebGL canvas can get promoted to a hardware
    // overlay that composites above the rest of the page. The gradient
    // shows until the first frame, and stays if WebGL is unavailable.
    <div
      className="pointer-events-none fixed -inset-px z-0 bg-[linear-gradient(to_bottom,#3a4263,#b77689_45%,#e0a06a_73%,#5a5a68_74%,#34363f)]"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}

export default SunsetScene;
