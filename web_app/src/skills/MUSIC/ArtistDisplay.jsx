import { useEffect, useState } from "react";
import { LazyLoadImage } from "react-lazy-load-image-component";

const ArtistDisplay = ({ artist, sendSelectedSong }) => {
  // State to track which accordion item is open (null means all closed)
  const [openIndex, setOpenIndex] = useState(null);
  const [songList, setSongList] = useState([]);
  // Toggle function to open/close items
  const toggleItem = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };
  useEffect(() => {
    if (artist !== null) {
      fetchSongs(artist).then((r) => {});
    }
  }, [artist]);
  const fetchSongs = async (artist) => {
    try {
      // Replace with your API endpoint
      const response = await fetch(
        `http://192.168.1.242:2121/artist/${artist.artist_id}`,
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const json = await response.json();
      setSongList(json);
    } catch (err) {}
  };

  function handleSongClick(song) {
    sendSelectedSong(song, artist.artist_name);
  }

  if (artist === "") return <></>;
  else
    return (
      <div className="grid w-max min-w-full grid-cols-3 items-center justify-center">
        {songList.map((song, index) => (
          <div className="m-4 flex w-40 flex-col items-center justify-center">
            <button
              className=""
              key={index}
              onClick={() => handleSongClick(song)}
            >
              <LazyLoadImage
                src={`http://192.168.1.242:2121/artwork/${song.song_id}`}
                className="w-40"
              />
              {song.song_title}
            </button>
          </div>
        ))}
      </div>
    );
};

export default ArtistDisplay;
