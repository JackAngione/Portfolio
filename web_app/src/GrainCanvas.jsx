import React, { useRef, useEffect } from "react";

function GrainCanvas({ children, intensity = 0.08, fps = 12 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let lastTime = 0;
    const interval = 1000 / fps;

    // Set canvas size to match window
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      /*canvas.width = 500;
      canvas.height = 500;*/
    };

    // Generate film grain frame
    const generateGrain = (timestamp) => {
      if (timestamp - lastTime > interval) {
        lastTime = timestamp;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Create grain
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          // Random noise value
          const noise = Math.random() * 255;

          // Apply noise with specified intensity
          data[i] = noise; // R
          data[i + 1] = noise; // G
          data[i + 2] = noise; // B
          data[i + 3] = intensity * 255; // Alpha
        }

        ctx.putImageData(imageData, 0, 0);
      }
      animationFrameId = requestAnimationFrame(generateGrain);
    };

    // Initialize
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    generateGrain(0);

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [intensity, fps]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed top-0 left-0 z-2 h-full w-full"
      />

      {children}
    </>
  );
}

export default GrainCanvas;
