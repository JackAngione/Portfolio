import React, { useEffect, useState } from "react";
import { media_server_address } from "../../serverInfo.jsx";

function AlbumArtPixelAnimation() {
  const [albumCovers, setAlbumCovers] = useState([]);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);

    async function getAlbumArt() {
      try {
        const response = await fetch(media_server_address + "/album-covers");
        setAlbumCovers(await response.json());
      } catch (e) {
        //no covers: the grid just renders solid tiles
      }
    }
    getAlbumArt();

    // Clean up
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  //derived from the window size instead of stored in state
  const tileCount = {
    width: Math.round(windowSize.width / 100 + 1),
    height: Math.round(windowSize.height / 100 + 1),
  };
  const totalTileCount = tileCount.width * tileCount.height;

  return (
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
        {Array.from({ length: totalTileCount }, (tile, index) => {
          /*
          coords:
          row = Math.floor(index / tileCount.width)
          column = index - tileCount.width * row

          add together row and column coordinates.
          if even number, display album cover, if odd: display solid square
          */
          const row = Math.floor(index / tileCount.width);
          const column = index - tileCount.width * row;
          const showCover = (row + column) % 2 === 0 && albumCovers.length > 0;
          return showCover ? (
            <div key={index}>
              <img
                src={
                  media_server_address +
                  "/album_covers/" +
                  albumCovers[Math.floor(index / 2) % albumCovers.length]
                }
                alt=""
              />
            </div>
          ) : (
            <div key={index} className="bg-background h-full w-full"></div>
          );
        })}
      </div>
    </div>
  );
}

export default AlbumArtPixelAnimation;
