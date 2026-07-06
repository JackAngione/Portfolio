import React, { useEffect, useRef } from "react";

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Film grain modeled on real silver-halide structure:
// - grains have physical size (u_grainSize, in device pixels)
// - soft-edged clumps via interpolated value noise, not per-pixel static
// - two noise samples summed to approximate a gaussian distribution
// - a coarse octave adds the low-frequency "clumping" of real film stock
//
// The same grain field is rendered in two modes (u_mode):
//   0 = mid-grey centered, composited with mix-blend-mode: overlay
//       (modulates midtones/highlights, but goes to zero on black)
//   1 = positive grain only on black, composited with mix-blend-mode: screen
//       (lifts shadows; screen's effect fades out as the base brightens)
const FRAGMENT_SHADER = `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_seed;
uniform float u_intensity;
uniform float u_shadowIntensity;
uniform float u_grainSize;
uniform float u_mode;

float hash(vec2 p, float seed) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031 + seed);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Smoothly interpolated value noise -> soft-edged grains
float valueNoise(vec2 p, float seed) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i, seed);
  float b = hash(i + vec2(1.0, 0.0), seed);
  float c = hash(i + vec2(0.0, 1.0), seed);
  float d = hash(i + vec2(1.0, 1.0), seed);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  vec2 p = gl_FragCoord.xy / u_grainSize;

  // Sum of two independent samples approximates a gaussian, centered on 0
  float g1 = valueNoise(p, u_seed);
  float g2 = valueNoise(p + 61.7, u_seed + 42.0);
  float grain = (g1 + g2) - 1.0;

  // Coarse octave: low-frequency clumping of grain density
  float clump = valueNoise(p * 0.35, u_seed + 7.0) - 0.5;
  grain = grain * (0.85 + 0.5 * clump);

  if (u_mode < 0.5) {
    // Overlay layer: mid-grey is a no-op, grain brightens/darkens the page
    gl_FragColor = vec4(vec3(0.5 + grain * u_intensity), 1.0);
  } else {
    // Shadow layer: bright particles only, screened onto dark areas
    gl_FragColor = vec4(vec3(max(grain, 0.0) * u_shadowIntensity), 1.0);
  }
}
`;

function createProgram(gl) {
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${info}`);
    }
    return shader;
  };

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Program link error: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

/**
 * GPU film grain overlay.
 * @param intensity    grain strength in midtones (0-1)
 * @param shadowBoost  shadow grain strength relative to intensity
 * @param grainSize    grain diameter in CSS pixels; ~1.5-3 mimics 35mm scans
 * @param fps          temporal cadence; 24 matches film
 */
function FilmGrain({
  children,
  intensity = 0.15,
  shadowBoost = 1.0,
  grainSize = 0.7,
  fps = 24,
}) {
  const canvasRef = useRef(null);
  const shadowCanvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const shadowCanvas = shadowCanvasRef.current;
    if (!canvas || !shadowCanvas) return;

    const gl =
      canvas.getContext("webgl", { alpha: false, antialias: false }) ||
      canvas.getContext("experimental-webgl");
    if (!gl) return; // no WebGL: silently render no grain
    const shadowCtx = shadowCanvas.getContext("2d");

    let program;
    try {
      program = createProgram(gl);
    } catch (e) {
      console.error(e);
      return;
    }
    gl.useProgram(program);

    // Fullscreen triangle
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aPosition = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uSeed = gl.getUniformLocation(program, "u_seed");
    const uIntensity = gl.getUniformLocation(program, "u_intensity");
    const uShadowIntensity = gl.getUniformLocation(
      program,
      "u_shadowIntensity",
    );
    const uGrainSize = gl.getUniformLocation(program, "u_grainSize");
    const uMode = gl.getUniformLocation(program, "u_mode");

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = Math.round(window.innerWidth * dpr);
      const h = Math.round(window.innerHeight * dpr);
      canvas.width = w;
      canvas.height = h;
      shadowCanvas.width = w;
      shadowCanvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uResolution, w, h);
      gl.uniform1f(uGrainSize, grainSize * dpr);
    };

    gl.uniform1f(uIntensity, intensity);
    gl.uniform1f(uShadowIntensity, intensity * shadowBoost);

    let animationFrameId;
    let lastTime = 0;
    const interval = 1000 / fps;

    const render = (timestamp) => {
      if (timestamp - lastTime >= interval) {
        lastTime = timestamp;
        // New seed each frame = each frame is an independent grain pattern,
        // like successive frames of film. Both passes share the seed so the
        // shadow and midtone layers describe the same grain particles.
        gl.uniform1f(uSeed, Math.random() * 100.0);

        // Pass 1: shadow grain, copied out to the screen-blended canvas.
        // drawImage is synchronous, so this works without preserveDrawingBuffer.
        gl.uniform1f(uMode, 1.0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        shadowCtx.drawImage(canvas, 0, 0);

        // Pass 2: midtone grain, left in the overlay-blended WebGL canvas
        gl.uniform1f(uMode, 0.0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener("resize", resize);
    resize();
    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [intensity, shadowBoost, grainSize, fps]);

  return (
    <>
      {/* Midtone/highlight grain: overlay modulates the page around mid-grey */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed top-0 left-0 z-2 h-full w-full"
        style={{ mixBlendMode: "overlay" }}
      />
      {/* Shadow grain: screen lifts blacks, fades out on bright backgrounds */}
      <canvas
        ref={shadowCanvasRef}
        className="pointer-events-none fixed top-0 left-0 z-2 h-full w-full"
        style={{ mixBlendMode: "screen" }}
      />
      {children}
    </>
  );
}

export default FilmGrain;
