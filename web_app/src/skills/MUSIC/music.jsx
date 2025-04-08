import React, { useEffect, useRef, useState } from "react";
import MusicPlayer from "./musicPlayer.jsx";
import PixelAnimation from "./pixelAnimation.jsx";
import { LazyLoadImage } from "react-lazy-load-image-component";
import ArtistDisplay from "./accordion.jsx";
function Music() {
  const coverArts = import.meta.glob(
    "../../../public/musicCovers/*.{png,jpg,jpeg}",
    { eager: true },
  );

  const handleImageClick = (imagePath) => {
    alert("Image clicked!");
  };
  const handleArtistClick = (artist_name) => {
    console.log(artist_name);
  };

  // State to store the music data from API
  const [artistList, setArtistList] = useState([]);
  const [playingSongURL, setPlayingSongURL] = useState("");
  const [serverError, setServerError] = useState(false);
  // State to handle loading
  const [isLoading, setIsLoading] = useState(true);

  // State to handle errors
  const [error, setError] = useState(null);
  // useEffect to fetch data when component mounts
  useEffect(() => {
    const fetchItems = async () => {
      try {
        // Replace with your API endpoint
        const response = await fetch("http://192.168.1.204:808/artists");

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await response.json();
        setArtistList(data);
        setIsLoading(false);
        console.log(artistList);
      } catch (err) {
        console.log("SERVER NOTRESPONDING");
        setServerError(true);
        setIsLoading(false);
      }
    };

    fetchItems().then((r) => {});
  }, []);

  function handleSongClick(artist_id, song_id) {
    console.log(artist_id);
    setPlayingSongURL(
      "http://192.168.1.204:808/stream/" + artist_id + "/" + song_id,
    );
  }
  return (
    <div className="flex justify-center h-[80vh]">
      <div className="backdrop-blur-xl bg-background/20 outline-background/40 outline-2 rounded-[10px] mt-14 relative px-4 z-1 w-[86vw]">
        <h1 className="font-bold mb-4">MUSIC</h1>
        <p>
          Advanced knowledge of audio engineering across all areas of digital
          music production
        </p>

        <div className="flex justify-center border-2 border-blue">
          {/*Display Artists*/}
          {serverError ? (
            "Sorry, the music server seems to be down at the moment"
          ) : (
            <></>
          )}
          <ul className="flex flex-col justify-center">
            {/*{artistList.map((artistName, index) => (
                                // Assuming each item has an id and some properties
                                <button key={index} onClick={() => handleArtistClick(artistName)}>
                                    {artistName.artist_name}
                                </button>
                             ))}*/}
            <ArtistDisplay
              sendSelectedSong={handleSongClick}
              artist_list={artistList}
            />
          </ul>
        </div>
      </div>
      <PixelAnimation />
      <MusicPlayer songURL={playingSongURL} />
    </div>
  );
}

export default Music;
