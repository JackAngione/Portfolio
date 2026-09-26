import React, { useEffect, useState } from "react";

const SAMPLE_MS = 500;

/* Fixed-position frames-per-second readout, averaged over each sample window */
function FpsCounter() {
  const [fps, setFps] = useState(null);

  useEffect(() => {
    let frameId;
    let frames = 0;
    let windowStart = performance.now();

    function tick(now) {
      frames++;
      const elapsed = now - windowStart;
      if (elapsed >= SAMPLE_MS) {
        setFps(Math.round((frames * 1000) / elapsed));
        frames = 0;
        windowStart = now;
      }
      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div
      className="bg-background/40 text-primary/80 pointer-events-none fixed bottom-4 left-4 z-50 rounded-md px-2 py-1 font-mono text-xs tabular-nums backdrop-blur-md"
      aria-hidden="true"
    >
      {fps ?? "--"} FPS
    </div>
  );
}

export default FpsCounter;
