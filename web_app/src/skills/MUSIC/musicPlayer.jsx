import React, { useEffect, useRef, useState } from "react";
import { useWavesurfer } from "@wavesurfer/react";

function MusicPlayer({ songURL }) {
  //initialize WaveSurfer
  const containerRef = useRef(null);
  const { wavesurfer, isReady, isPlaying, currentTime } = useWavesurfer({
    container: containerRef,
    url: songURL,
    waveColor: "#000000",
    progressColor: "#BF1363",
    height: 40,
    // Set a bar width
    barWidth: 1,

    // And the bar radius
    barRadius: 8,
  });
  const onPlayPause = () => {
    wavesurfer && wavesurfer.playPause();
  };
  //THIS CODE RUNS WHEN WAVESURFER IS LOADED
  useEffect(() => {
    wavesurfer && setSongDuration(wavesurfer.getDuration());
    wavesurfer && wavesurfer.setVolume(0.0625);
  }, [isReady]);

  const [volume, setVolume] = useState(0.25);
  const [songProgress, setSongProgress] = useState(0);
  const [songDuration, setSongDuration] = useState(0);

  //converts seconds to formated minutes and seconds
  function secondsToMinutes(duration) {
    const decimalMinutes = duration / 60;
    const minutes = Math.trunc(decimalMinutes);
    let seconds = Math.trunc((decimalMinutes - minutes) * 60);
    if (seconds < 10) {
      seconds = `0${seconds}`;
    }
    return `${minutes}:${seconds}`;
  }

  const changeVolume = (e) => {
    //makes new volume exponential
    const volumeExp = Math.pow(e.target.value, 2);
    wavesurfer.setVolume(volumeExp);
    setVolume(e.target.value);
  };

  const handleSeekChange = (e) => {
    wavesurfer.seekTo(e.target.value);
    wavesurfer.setTime(songProgress);
    setSongProgress(e.target.value);
  };

  return (
    <div className="bg-white fixed bottom-0 left-1/2 -translate-x-1/2 w-full">
      <div className="flex flex-col justify-center">
        <h2>{`${songURL}`}</h2>

        <div className="songControls">
          <button onClick={onPlayPause}>{isPlaying ? "Pause" : "Play"}</button>
          <input
            className="w-20"
            type="range"
            min={0}
            max={1}
            step="any"
            value={volume}
            onChange={(e) => changeVolume(e)}
          />

          {/*{secondsToMinutes(currentTime)}*/}
          {secondsToMinutes(currentTime)}

          <input
            className="musicSlider"
            type="range"
            min={0}
            max={songDuration}
            step=".01"
            value={currentTime}
            onChange={(e) => handleSeekChange(e)}
          />
          {secondsToMinutes(songDuration)}
          <div className="p-4" ref={containerRef} />
        </div>
      </div>
    </div>
  );
}

export default MusicPlayer;
