"use client";
import { ReactNode, useEffect, useRef } from "react";
import { motion } from "motion/react";

export default function MarbledGradientButton({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children?: ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    // Set up canvas size and pixel dimensions
    const w = (canvas.width = width);
    const h = (canvas.height = height);

    // Animation time variable
    let t = 0;

    let animationID: number;

    // --- Main animation loop ---
    function draw() {
      //Animation speed
      t += 0.004; // increase time gradually each frame

      // Clear the canvas each frame
      ctx.clearRect(0, 0, w, h);

      // Create an empty pixel buffer
      const img = ctx.createImageData(w, h);
      const data = img.data; // Uint8ClampedArray of RGBA values

      // Iterate over every pixel in the canvas
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          // Normalize pixel position to roughly -0.5..0.5
          const nx = x / w - 0.5;
          const ny = y / h - 0.5;

          // Compute a smooth, wavy value using multiple sine and cosine layers.
          // These oscillate at different frequencies and speeds.
          const v =
            Math.sin(nx * 3 + t) +
            Math.cos(ny * 3 - t * 1.3) +
            Math.sin((nx + ny) * 4 + t * 0.7);

          // Convert that wave value into a color hue (0–360°)
          const hue = (v * 60 + t * 40) % 360;
          const brightness = Math.sin(hue * 0.1);
          // Convert HSL -> RGB for canvas
          const [r, g, b] = hslToRgb(0, 0, brightness);

          // Compute index in the pixel buffer
          const i = (y * w + x) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = 255; // alpha channel (opaque)
        }
      }

      // Push the generated pixels to the canvas
      ctx.putImageData(img, 0, 0);

      // Request the next animation frame
      animationID = requestAnimationFrame(draw);
    }

    draw(); // start the loop
    return () => {
      cancelAnimationFrame(animationID);
      // Remove any event listeners
      // Clear any timers
    };

    // --- Utility: Convert HSL to RGB (compact algorithm) ---
    function hslToRgb(
      h: number,
      s: number,
      l: number,
    ): [number, number, number] {
      // Small, efficient algorithm to convert HSL color to RGB (0–255)
      const a = s * Math.min(l, 1 - l);
      const f = (n: number) => {
        const k = (n + h * 12) % 12;
        const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * c);
      };
      return [f(0), f(8), f(4)];
    }
  }, [width, height]);

  return (
    <motion.div
      className="relative rounded-3xl shadow-lg outline-1 outline-white"
      style={{ width, height }}
      initial={{
        boxShadow: "0px 0px 30px 1px rgba(255, 255, 255, 0.5)",
      }}
      whileHover={{
        boxShadow: "0px 0px 30px 2px rgba(255, 255, 255, 1)",
      }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <canvas ref={canvasRef} className="h-full w-full rounded-3xl" />
      {children}
    </motion.div>
  );
}
