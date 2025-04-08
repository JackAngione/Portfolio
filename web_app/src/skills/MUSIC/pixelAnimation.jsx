import React, { useState, useEffect } from "react";

function PixelAnimation() {
  const [colors, setColors] = useState([]);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [tileCount, setTileCount] = useState({
    width: Math.round(window.innerWidth / 100 + 1),
    height: Math.round(window.innerHeight / 100 + 1),
  });
  const [totalTileCount, setTotalTileCount] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);

    // Clean up
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const newColors = colors.map(() => getRandomColor());
      setColors(newColors);
    }, 700); //ms

    return () => clearInterval(intervalId); // Clear interval on unmount
  }, [colors]);

  useEffect(() => {
    let totalWidth = windowSize.width / 100 + 2;
    let totalHeight = windowSize.height / 100 + 2;
    let totalTiles = Math.round(totalWidth * totalHeight);
    //setTotalTileCount(totalTiles)
    //console.log("total tile count: " + totalTileCount);
    const newTiles = Array(totalTiles).fill("white");
    setColors(newTiles);
    setTileCount({
      width: Math.round(window.innerWidth / 100 + 1),
      height: Math.round(window.innerHeight / 100 + 1),
    });
  }, [windowSize]);

  return (
    <>
      {/*<div className="flex">width:{windowSize.width}px</div>
            <div className="flex">height:{windowSize.height}px</div>
            <div className="flex">
                rows: {tileCount.width}
                _columns: {tileCount.width}
            </div>
            <div className="flex">pixelCount:{totalTileCount}</div>*/}

      <div
        className="outline-8 outline-black
                            flex z-0 absolute inset-0 justify-center h-screen
                            overflow-hidden overscroll-y-none "
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(" + tileCount.width + ", 100px)",
            gridTemplateRows: "repeat(" + tileCount.height + ", 100px)",
            gap: "1px",
            height: "100vh",
            backgroundColor: "black",
          }}
        >
          {colors.map((color, index) => (
            <div
              key={index}
              style={{ backgroundColor: color, width: "100%", height: "100%" }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

export default PixelAnimation;
