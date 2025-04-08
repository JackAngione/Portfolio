import { useState } from "react";
import { LazyLoadImage } from "react-lazy-load-image-component";

const ArtistDisplay = ({ artist_list, sendSelectedSong }) => {
  // State to track which accordion item is open (null means all closed)
  const [openIndex, setOpenIndex] = useState(null);
  const [songList, setSongList] = useState([]);
  // Toggle function to open/close items
  const toggleItem = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };
  const fetchSongs = async (artist_id) => {
    try {
      console.log(artist_id);
      // Replace with your API endpoint
      const response = await fetch(
        `http://192.168.1.204:808/artist/${artist_id}`,
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return await response.json();
    } catch (err) {}
  };

  function handleSongClick(artist_id, song_id) {
    sendSelectedSong(artist_id, song_id);
  }

  return (
    <div className="max-w-full mx-auto my-8">
      {artist_list.map((item, index) => (
        <div key={index} className="mb-2 rounded-lg overflow-hidden">
          {/* Accordion Header */}

          <button
            onClick={() => {
              toggleItem(index);
              fetchSongs(item.artist_id).then((r) => {
                setSongList(r);
              });
            }}
            className="w-full px-4 py-3 text-left focus:outline-none duration-200 flex justify-between items-center"
          >
            <span
              className={`transform transition-transform duration-200 ${openIndex === index ? "rotate-180" : ""}`}
            >
              ▼
            </span>
            <span className="font-medium text-black">{item.artist_name}</span>
            <span
              className={`transform transition-transform duration-200 ${openIndex === index ? "rotate-180" : ""}`}
            >
              ▼
            </span>
          </button>

          {/* Accordion Content */}
          <div
            className={`transition-all duration-300 ease-in-out ${
              openIndex === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            } overflow-y-scroll`}
          >
            <div className="px-4 py-3 text-black">
              {songList.map((song, index) => (
                // Assuming each item has an id and some properties
                <button
                  className="outline-black "
                  key={index}
                  onClick={() => handleSongClick(song.artist_id, song.song_id)}
                >
                  <LazyLoadImage
                    src={`http://192.168.1.204:808/artwork/${song.song_id}`}
                    className="w-40"
                  />
                  {song.song_title}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ArtistDisplay;
