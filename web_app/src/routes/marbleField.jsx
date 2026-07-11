import React, { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

/*
  Full-viewport morphing marble background, adapted from
  src/assets/marbledbutton.tsx. The same layered sine/cosine wave field,
  but rendered at ~1/10 resolution and CSS-upscaled (the waves are smooth,
  so upscaling is invisible and keeps the per-pixel CPU loop cheap), and
  colored through a cyclic palette LUT built from the site theme instead
  of grayscale. The cursor gently warps the wave phases.
*/

// Cyclic palette: dark -> deep violet -> bunny pink -> sunny gold -> back
const PALETTE_STOPS = [
  [16, 16, 20],
  [40, 32, 82],
  [148, 58, 122],
  [196, 142, 60],
  [148, 58, 122],
  [40, 32, 82],
  [16, 16, 20], // same as first stop so the gradient loops seamlessly
];

function buildPaletteLUT(size = 512) {
  const lut = new Uint8Array(size * 3);
  const segments = PALETTE_STOPS.length - 1;
  for (let i = 0; i < size; i++) {
    const pos = (i / size) * segments;
    const seg = Math.min(Math.floor(pos), segments - 1);
    const f = pos - seg;
    const from = PALETTE_STOPS[seg];
    const to = PALETTE_STOPS[seg + 1];
    lut[i * 3] = from[0] + (to[0] - from[0]) * f;
    lut[i * 3 + 1] = from[1] + (to[1] - from[1]) * f;
    lut[i * 3 + 2] = from[2] + (to[2] - from[2]) * f;
  }
  return lut;
}

// Render resolution: one wave sample per SCALE screen pixels
const SCALE = 10;

function MarbleField() {
  const canvasRef = useRef(null);

  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.45], [1, 0.12]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const lut = buildPaletteLUT();
    const lutSize = lut.length / 3;

    let w = 0;
    let h = 0;
    let img = null;

    const resize = () => {
      w = Math.max(2, Math.ceil(window.innerWidth / SCALE));
      h = Math.max(2, Math.ceil(window.innerHeight / SCALE));
      canvas.width = w;
      canvas.height = h;
      img = ctx.createImageData(w, h);
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

    const draw = () => {
      t += 0.004;
      px += (targetPX - px) * 0.03;
      py += (targetPY - py) * 0.03;

      const data = img.data;
      const phaseX = t + px * 2.0;
      const phaseY = t * 1.3 - py * 2.0;
      const phaseD = t * 0.7 + (px + py);

      for (let y = 0; y < h; y++) {
        const ny = y / h - 0.5;
        const rowCos = Math.cos(ny * 6 - phaseY);
        for (let x = 0; x < w; x++) {
          const nx = x / w - 0.5;
          const v =
            Math.sin(nx * 6 + phaseX) +
            rowCos +
            Math.sin((nx + ny) * 8 + phaseD);

          // v is in [-3, 3]; normalize and drift through the cyclic LUT
          let idx = ((v + 3) / 6 + t * 0.05) % 1;
          if (idx < 0) idx += 1;
          const li = (idx * lutSize) | 0;

          const i = (y * w + x) * 4;
          data[i] = lut[li * 3];
          data[i + 1] = lut[li * 3 + 1];
          data[i + 2] = lut[li * 3 + 2];
          data[i + 3] = 255;
        }
      }

      ctx.putImageData(img, 0, 0);
      animationID = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);
    animationID = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationID);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <motion.div
      style={{ opacity }}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      {/* darken toward the edges so the marble melts into the page */}
      <div className="to-background/80 absolute inset-0 bg-radial from-transparent via-transparent" />
    </motion.div>
  );
}

export default MarbleField;
