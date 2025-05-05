import React, { useEffect, useState } from "react";
import MusicPlayer from "./musicPlayer.jsx";
import ArtistDisplay from "./ArtistDisplay.jsx";
import AlbumArtPixelAnimation from "./albumArtPixelAnimation.jsx";

function Music() {
  // State to store the music data from API
  const [artistList, setArtistList] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState("");
  const [playingSong, setPlayingSong] = useState(null);
  const [serverError, setServerError] = useState(false);
  // State to handle loading
  const [isLoading, setIsLoading] = useState(true);

  const handleArtistClick = (artist) => {
    setSelectedArtist(artist);
  };
  // State to handle errors
  const [error, setError] = useState(null);
  // useEffect to fetch data when component mounts
  useEffect(() => {
    const fetchItems = async () => {
      try {
        // Replace with your API endpoint
        const response = await fetch("http://192.168.1.242:2121/artists");

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await response.json();
        setArtistList(data);
        setIsLoading(false);
      } catch (err) {
        setServerError(true);
        setIsLoading(false);
      }
    };

    fetchItems().then((r) => {});
  }, []);

  function handleSongClick(song, artist_name) {
    song.artist_name = artist_name;
    setPlayingSong(song);
  }

  return (
    <>
      {playingSong == null ? <></> : <MusicPlayer song={playingSong} />}

      <div className="flex h-[90vh] justify-center">
        <div className="bg-background/20 outline-background/40 relative z-1 mt-14 overflow-y-scroll rounded-[10px] px-4 outline-2 backdrop-blur-xl">
          <h1 className="mb-4 font-bold">MUSIC</h1>
          <p>
            Advanced knowledge of audio engineering across all areas of digital
            music production.
          </p>

          <p className="mt-12">
            Click on an Artist to see some of the tracks I've produced, mixed,
            and mastered
          </p>

          <div className="mt-2 flex justify-center">
            {/*Display Artists*/}
            {serverError ? (
              "Sorry, the music server seems to be down at the moment"
            ) : (
              <></>
            )}
            <ul className="flex justify-center gap-4">
              {artistList.map((artistObj, index) => (
                // Assuming each item has an id and some properties
                <label
                  className={`${selectedArtist === artistObj ? "bg-PrimaryGradient text-black" : "bg-transparent"} text-primary m-2 rounded-md border-2 px-6 py-3`}
                >
                  {artistObj.artist_name}
                  <input
                    className={`hidden appearance-none text-white shadow-md ring-blue-300`}
                    key={index}
                    type="radio"
                    name="Artists"
                    value={artistObj.artist_name}
                    onClick={() => handleArtistClick(artistObj)}
                  ></input>
                </label>
              ))}
            </ul>
          </div>
          <ArtistDisplay
            sendSelectedSong={handleSongClick}
            artist={selectedArtist}
          />
        </div>
      </div>

      <AlbumArtPixelAnimation />
    </>
  );
}

export default Music;
