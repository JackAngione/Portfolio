import React, { useEffect, useState } from "react";

function SVGGRAIN({ children }) {
  const [randomNumber, setRandomNumber] = useState(0); // Initialize with 0 or null
  useEffect(() => {
    const generateRandomNumber = () => {
      const newNumber = Math.floor(Math.random() * 200) + 1;
      setRandomNumber(newNumber);
    };

    // 1000 milliseconds / 24
    const intervalDuration = 1000 / 24;

    const intervalId = setInterval(generateRandomNumber, intervalDuration);

    // 4. Cleanup function: This runs when the component unmounts
    // It's crucial to clear the interval to prevent memory leaks
    return () => {
      clearInterval(intervalId);
      console.log("Random number interval cleared."); // Optional: for debugging
    };
  }, []);
  return (
    <div>
      {/*<div className="">{randomNumber}</div>*/}

      <svg
        viewBox="0 0 2000 2000"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none fixed top-0 left-0 z-2 h-full w-full opacity-30"
      >
        <filter id="noiseFilter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".8"
            numOctaves="5"
            stitchTiles="stitch"
            result="turbulence"
            color-interpolation-filters="linearRGB"
          >
            <animate
              id="noiseAnimate"
              attributeName="seed"
              from="0"
              to="24"
              dur="1s"
              attributeType="XML"
              repeatCount="indefinite"
            />
          </feTurbulence>
        </filter>

        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>
      {children}
    </div>
  );
}

export default SVGGRAIN;
