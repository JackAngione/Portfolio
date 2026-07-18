import React, { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

/*
  Full-viewport morphing marble background, adapted from
  src/assets/marbledbutton.tsx. The same layered sine/cosine wave field,
  evaluated per pixel in a WebGL fragment shader (identical math to the
  old canvas-2D loop, but runs at full device resolution for free), and
  colored through the cyclic site-theme palette. The cursor gently warps
  the wave phases.
*/

// Cyclic palette: dark -> deep violet -> bunny pink -> sunny gold -> back
// (last stop equals the first so the gradient loops seamlessly)
const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;

uniform vec2 u_res;
uniform float u_t;
uniform vec2 u_pointer;
uniform float u_invert;

vec3 palette(float x) {
  const vec3 S0 = vec3(16.0, 16.0, 20.0) / 255.0;
  const vec3 S1 = vec3(40.0, 32.0, 82.0) / 255.0;
  const vec3 S2 = vec3(148.0, 58.0, 122.0) / 255.0;
  const vec3 S3 = vec3(196.0, 142.0, 60.0) / 255.0;

  float pos = fract(x) * 6.0;
  vec3 c = mix(S0, S1, clamp(pos, 0.0, 1.0));
  c = mix(c, S2, clamp(pos - 1.0, 0.0, 1.0));
  c = mix(c, S3, clamp(pos - 2.0, 0.0, 1.0));
  c = mix(c, S2, clamp(pos - 3.0, 0.0, 1.0));
  c = mix(c, S1, clamp(pos - 4.0, 0.0, 1.0));
  c = mix(c, S0, clamp(pos - 5.0, 0.0, 1.0));
  return c;
}

void main() {
  // Normalized coordinates in -0.5..0.5, y increasing downward to match
  // the original canvas-2D orientation
  float nx = gl_FragCoord.x / u_res.x - 0.5;
  float ny = 0.5 - gl_FragCoord.y / u_res.y;

  float phaseX = u_t + u_pointer.x * 2.0;
  float phaseY = u_t * 1.3 - u_pointer.y * 2.0;
  float phaseD = u_t * 0.7 + (u_pointer.x + u_pointer.y);

  // Identical wave math to marbledbutton.tsx: three sine/cosine layers
  // oscillating at different frequencies (3, 3, 4) and speeds (1, 1.3, 0.7)
  float v =
    sin(nx * 3.0 + phaseX) +
    cos(ny * 3.0 - phaseY) +
    sin((nx + ny) * 4.0 + phaseD);

  // Same mapping as the button's hue = (v * 60 + t * 40) % 360,
  // normalized to a 0..1 palette index (fract in palette() handles wrap)
  float idx = (v * 60.0 + u_t * 40.0) / 360.0;
  // Light mode literally inverts the marble: dark navy grounds become
  // paper whites, golds become blues. u_invert eases 0..1 on theme change.
  vec3 col = palette(idx);
  col = mix(col, vec3(1.0) - col, u_invert);
  gl_FragColor = vec4(col, 1.0);
}
`;

function compileProgram(gl) {
  const make = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(sh));
    }
    return sh;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, make(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, make(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog));
  }
  return prog;
}

function MarbleField() {
  const canvasRef = useRef(null);

  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.45], [1, 0.12]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Note: keep the default alpha:true — an opaque (alpha:false) WebGL
    // canvas gets promoted to a compositing layer that paints over the
    // page content in Chromium. The shader always writes alpha 1.0.
    const gl = canvas.getContext("webgl", {
      antialias: false,
      depth: false,
      stencil: false,
    });
    if (!gl) return;

    const prog = compileProgram(gl);
    gl.useProgram(prog);

    // Fullscreen triangle
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uT = gl.getUniformLocation(prog, "u_t");
    const uPointer = gl.getUniformLocation(prog, "u_pointer");
    const uInvert = gl.getUniformLocation(prog, "u_invert");

    const invertFor = () =>
      document.documentElement.dataset.theme === "light" ? 1 : 0;
    let invertTarget = invertFor();
    let invert = invertTarget;
    const themeObserver = new MutationObserver(() => {
      invertTarget = invertFor();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(2, Math.ceil(window.innerWidth * dpr));
      canvas.height = Math.max(2, Math.ceil(window.innerHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    // Cursor position, normalized to -0.5..0.5 and eased in the rAF loop
    let targetPX = 0;
    let targetPY = 0;
    let px = 0;
    let py = 0;
    const onPointerMove = (e) => {
      targetPX = e.clientX / window.innerWidth - 0.5;
      targetPY = e.clientY / window.innerHeight - 0.5;
    };

    let t = 0;
    let animationID;
    let frames = 0;

    const draw = () => {
      t += 0.004;
      px += (targetPX - px) * 0.03;
      py += (targetPY - py) * 0.03;

      invert += (invertTarget - invert) * 0.05;
      gl.uniform1f(uT, t);
      gl.uniform2f(uPointer, px, py);
      gl.uniform1f(uInvert, invert);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // A viewport-sized WebGL canvas can get promoted to a hardware
      // overlay that composites above the page content; a geometry
      // change after the first composite demotes it. The extra 2px
      // hang offscreen, so this is invisible.
      if (++frames === 3) canvas.style.width = "calc(100% + 2px)";

      animationID = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);
    animationID = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationID);
      themeObserver.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    // -inset-px keeps the canvas from exactly matching the viewport;
    // an exactly-fullscreen WebGL canvas can get promoted to a hardware
    // overlay that composites above the rest of the page.
    <motion.div
      style={{ opacity }}
      className="pointer-events-none fixed -inset-px z-0"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      {/* darken toward the edges so the marble melts into the page */}
      <div className="to-background/80 absolute inset-0 bg-radial from-transparent via-transparent" />
    </motion.div>
  );
}

export default MarbleField;
