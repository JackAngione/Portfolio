import React, {useEffect, useRef, useState} from "react";
import justDance from "./musicFiles/JUST DANCE22.wav"
import alex from "./musicFiles/alexia.wav"
import ReactPlayer from 'react-player'
import { Tooltip } from 'react-tooltip'
function Music() {


    const [songs, setSongs] = useState([
        {url: "/src/skills/musicFiles/JUST DANCE22.wav", playing: false, volume: .0625, position: 0},
        {url: "/src/skills/musicFiles/alexia.wav", playing: false, volume: .0625, position:0},
        {url: "/src/skills/musicFiles/Amana-Musing.mp3", playing: false, volume: .0625, position:0}
    ])
    const [volumeSliders, setVolumeSliders] = useState([])
    const players = useRef(songs.map(() => React.createRef()));
    const [seeking, setSeeking] = useState(false);
    //const [volume, setVolume] = useState(0.25);

    useEffect(() => {
        for(let i =0; i<songs.length; i++)
        {
            setVolumeSliders(prevArray => [...prevArray, 0.25])
        }
        //playerRef.current.volume = .0625;
    }, []);  // Run this effect only once, when the component mounts


    const playPause = (index) => {
        setSongs(songs => songs.map((song, i) => {
            if (i === index) {
                return {...song, playing: !song.playing};
            } else {
                return song;
            }
        }));
    }
    const changeVolume = (e, index) => {
        const volume = Math.pow(e.target.value,2)
       // setVolume(Math.pow(e.target.value,2));
        //setSliderVolume(e.target.value)
        setVolumeSliders(prevVolumeSliders => prevVolumeSliders.map((volume, sliderIndex) => {
            if(sliderIndex === index) {
                return e.target.value
            }
            else
            {
                return volume
            }
        }))
        setSongs(songs => songs.map((song, i) => {
            if (i === index) {
                return {...song, volume: volume};
            } else {
                return song;
            }
        }));
    }

    const handleSeekMouseDown = (e) => {
        setSeeking(true);
    }

    const handleSeekMouseUp = (e, index) => {
        setSeeking(false);
        players.current[index].current.seekTo(parseFloat(e.target.value));
    }

    const handleProgress = (progress, index) => {
        // Only update time slider if we are not currently seeking
        if (!seeking) {
            setSongs(songs => songs.map((song, i) => {
                if (i === index) {
                    return {...song, position: progress.played};
                } else {
                    return song;
                }
            }));
        }
    }

    const handleSeekChange = (e, index) => {
        setSongs(songs => songs.map((song, i) => {
            if (i === index) {
                return {...song, position: parseFloat(e.target.value)};
            } else {
                return song;
            }
        }));
    };

    function formatSeconds(seconds) {
        const date = new Date(0);
        date.setSeconds(seconds);
        return date.toISOString().substr(11, 8);
    }
    return (
        <>
            <h1>Music</h1>
            <div>
                {
                    songs.map((song, index) =>
                        <li key={index}>
                            <h2>{`${song.url}`}</h2>
                            <button onClick={() => playPause(index)}>{song.playing ? 'Pause' : 'Play'}</button>
                            <input type='range'
                                   min={0}
                                   max={1}
                                   step='any'
                                   value={volumeSliders[index]}
                                   onChange={(e) =>changeVolume(e, index)} />
                            <input type='range'
                                   min={0}
                                   max={1}
                                   step='.01'
                                   value={songs[index].position}
                                   onMouseDown={handleSeekMouseDown}
                                   onChange={(e) => handleSeekChange(e, index)}
                                   onMouseUp={(e) => handleSeekMouseUp(e, index)}
                            />
                            <ReactPlayer
                                url={song.url}
                                height="100%"
                                ref={players.current[index]}
                                playing={song.playing}
                                volume={song.volume}
                                onProgress={(progress) => handleProgress(progress, index)}
                            />
                        </li>
                    )
                }
            </div>

          {/*  <div>
                <a data-tooltip-id="my-tooltip" data-tooltip-content={formatSeconds(played)}>
                    ◕‿‿◕
                </a>
                <Tooltip id="my-tooltip" />
            </div>*/}
        </>
    )



}
export default Music