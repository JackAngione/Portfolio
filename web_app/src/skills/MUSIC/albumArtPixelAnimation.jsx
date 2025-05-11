import React, { useEffect, useState } from "react";
import { media_server_address } from "../../serverInfo.jsx";

function AlbumArtPixelAnimation() {
  const [albumCovers, setAlbumCovers] = useState([]);
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

  async function getAlbumArt() {
    console.log("GEtTInG AlBuM ART");
    const response = await fetch(media_server_address + "/getAlbumCovers");
    let list = await response.json();
    setAlbumCovers(list);
  }

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    getAlbumArt().then((r) => {
      //console.log(albumCovers);
    });
    // Clean up
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  useEffect(() => {
    getAlbumArt().then((r) => {});
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
    setTotalTileCount(totalTiles);
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
      {/* {debugging info}*/}
      {/* <div className="absolute z-10">
        <div className="flex">width:{windowSize.width}px</div>
        <div className="flex">height:{windowSize.height}px</div>
        <div className="flex">
          rows: {tileCount.width}
          _columns: {tileCount.width}
        </div>
        <div className="flex">pixelCount:{totalTileCount}</div>
      </div>*/}

      <div className="absolute inset-0 z-0 flex h-screen justify-center overflow-hidden overscroll-y-none outline-8 outline-black">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(" + tileCount.width + ", 100px)",
            gridTemplateRows: "repeat(" + tileCount.height + ", 100px)",
            gap: "1px",
            height: "100vh",
          }}
        >
          {Array.from({ length: totalTileCount }, (tile, index) => (
            <>
              {/*
              coords:
              row = Math.Floor(index /tileCount.width)
              column= index - tileCount.width * Math.Floor(index/tileCount.width) */}

              {/*add together row and column coordinates.
              if even number, display album cover, if odd: display solid square*/}
              {(Math.floor(index / tileCount.width) +
                (index -
                  tileCount.width * Math.floor(index / tileCount.width))) %
                2 ===
              0 ? (
                <div>
                  <img
                    src={
                      media_server_address +
                      "/album_covers/" +
                      albumCovers[Math.floor(index / 2) % albumCovers.length]
                    }
                    key={index}
                    alt=""
                  />
                </div>
              ) : (
                <div className="bg-background h-full w-full"></div>
              )}
            </>
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

export default AlbumArtPixelAnimation;
