import { useEffect, useRef, useState } from "react";
import { backend_address } from "../../serverInfo.jsx";

function tileCounts() {
  return {
    width: Math.round(window.innerWidth / 100 + 1),
    height: Math.round(window.innerHeight / 100 + 1),
  };
}

function AlbumArtPixelAnimation() {
  const [albumCovers, setAlbumCovers] = useState([]);
  const [tileCount, setTileCount] = useState(tileCounts);
  const tileCountRef = useRef(tileCount);

  useEffect(() => {
    const handleResize = () => {
      const next = tileCounts();
      const previous = tileCountRef.current;
      if (next.width === previous.width && next.height === previous.height)
        return;
      tileCountRef.current = next;
      setTileCount(next);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    async function getAlbumArt() {
      try {
        const response = await fetch(backend_address + "/album-covers");
        setAlbumCovers(await response.json());
      } catch (e) {
        //no covers: the grid just renders solid tiles
      }
    }
    getAlbumArt();

    // Clean up
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

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
                  backend_address +
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
