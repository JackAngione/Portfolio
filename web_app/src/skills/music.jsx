import React, {useEffect, useRef, useState} from "react";
import justDance from "./musicFiles/JUST DANCE22.wav"
import alex from "./musicFiles/alexia.wav"
import ReactPlayer from 'react-player'
import { Tooltip } from 'react-tooltip'
function Music() {
    const [songs, setSongs] = useState([
        {url: "/src/skills/musicFiles/JUST DANCE22.wav", playing: false, volume: .0625, position: 0, currentTime: "0:00", duration: "0:00"},
        {url: "/src/skills/musicFiles/alexia.wav", playing: false, volume: .0625, position: 0, currentTime: "0:00", duration: "0:00"},
        {url: "/src/skills/musicFiles/Amana-Musing.mp3", playing: false, volume: .0625, position: 0, currentTime: "0:00", duration: "0:00"}
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

    //converts seconds to formated minutes and seconds
    function secondsToMinutes(duration)
    {
        const decimalMinutes = duration / 60;
        const minutes = Math.trunc(decimalMinutes)
        let seconds = Math.trunc((decimalMinutes - minutes) * 60);
        if(seconds < 10)
        {
            seconds = `0${seconds}`
        }

        return `${minutes}:${seconds}`
    }
    function minutesToSeconds(timeString) {
        const parts = timeString.split(":");
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    const playPause = (index) => {
        //makes only one song able to play at a time
        for(let i =0; i<songs.length; i++)
        {
            if(songs[i].playing === true && i !== index)
            {
                setSongs(songs => songs.map((song, i) => {
                    if (i !== index) {
                        return {...song, playing: false};
                    } else {
                        return song;
                    }
                }));
            }
        }
        //flips the playing status of the designated song
        setSongs(songs => songs.map((song, i) => {
            if (i === index) {
                return {...song, playing: !song.playing};
            } else {
                return song;
            }
        }));
    }
    const changeVolume = (e, index) => {
        //makes new volume exponential
        const volume = Math.pow(e.target.value,2)

        //sets the slider to a new value, uses a linear scale
        setVolumeSliders(prevVolumeSliders => prevVolumeSliders.map((volume, sliderIndex) => {
            if(sliderIndex === index) {
                return e.target.value
            }
            else
            {
                return volume
            }
        }))
        //sets the actual playing volume of the song, uses an exponential scale
        setSongs(songs => songs.map((song, i) => {
            if (i === index) {
                return {...song, volume: volume};
            } else {
                return song;
            }
        }));
    }
    const handleDuration = (duration, index) => {
        // Convert duration from seconds to minutes

        setSongs(songs => songs.map((song, i) => {
            if (i === index) {
                return {...song, duration: secondsToMinutes(duration)};
            } else {
                return song;
            }
        }));
    }
    const handleSeekMouseDown = (e, index) => {
        setSeeking(true);
        setSongs(songs => songs.map((song, i) => {
            if (i === index) {
                return {...song, currentTime: secondsToMinutes(minutesToSeconds(song.duration)*(e.target.value)) };
            } else {
                return song;
            }
        }));
    }

    const handleSeekMouseUp = (e, index) => {
        setSeeking(false);
        players.current[index].current.seekTo(parseFloat(e.target.value));
        setSongs(songs => songs.map((song, i) => {
            if (i === index) {
                return {...song, currentTime: secondsToMinutes(minutesToSeconds(song.duration)*(e.target.value)) };
            } else {
                return song;
            }
        }));
    }

    const handleProgress = (progress, index) => {
        // Only update time slider if not currently seeking
        if (!seeking) {
            setSongs(songs => songs.map((song, i) => {
                if (i === index) {
                    return {...song, position: progress.played, currentTime: secondsToMinutes(progress.playedSeconds) };
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

    return (
        <>
            <h1>Music</h1>
            <div >
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
                            {song.currentTime}
                            <input type='range'
                                   min={0}
                                   max={1}
                                   step='.01'
                                   value={songs[index].position}
                                   onMouseDown={(e) => handleSeekMouseDown(e, index)}
                                   onChange={(e) => handleSeekChange(e, index)}
                                   onMouseUp={(e) => handleSeekMouseUp(e, index)}
                            />
                            {song.duration}
                            <ReactPlayer
                                url={song.url}
                                height="0%"
                                ref={players.current[index]}
                                playing={song.playing}
                                volume={song.volume}
                                onDuration={(duration) => handleDuration(duration, index)}
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