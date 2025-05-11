import { useEffect, useState } from "react";
import { LazyLoadImage } from "react-lazy-load-image-component";
import { media_server_address } from "../../serverInfo.jsx";

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
      const response = await fetch(
        media_server_address + `/artist/${artist.artist_id}`,
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
      <div className="flex justify-center overflow-x-scroll">
        <div className="grid w-max grid-cols-2 sm:grid-cols-3">
          {songList.map((song, index) => (
            <div className="m-4 flex w-40 flex-col items-center justify-center xl:w-50">
              <button
                className=""
                key={index}
                onClick={() => handleSongClick(song)}
              >
                <LazyLoadImage
                  src={media_server_address + `/artwork/${song.song_id}`}
                />
                {song.song_title}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
};

export default ArtistDisplay;
