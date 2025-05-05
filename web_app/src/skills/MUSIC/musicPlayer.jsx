import React, { useEffect, useRef, useState } from "react";
import { useWavesurfer } from "@wavesurfer/react";
import { Slider } from "@heroui/react";

function MusicPlayer({ song }) {
  //initialize WaveSurfer
  const containerRef = useRef(null);
  const { wavesurfer, isReady, isPlaying, currentTime } = useWavesurfer({
    container: containerRef,
    url:
      "http://192.168.1.242:2121/stream/" + song.artist_id + "/" + song.song_id,
    waveColor: "#fcf7f8",
    progressColor: "oklch(0.6 0.2774 300.55)",
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

  const changeVolume = (value) => {
    //makes new volume exponential
    const volumeExp = Math.pow(value, 2);
    wavesurfer.setVolume(volumeExp);
    setVolume(value);
  };

  const handleSeekChange = (value) => {
    wavesurfer.seekTo(value);
    wavesurfer.setTime(songProgress);
    setSongProgress(value);
  };

  return (
    <div className="bg-background fixed bottom-0 z-2 w-full">
      <div className="flex flex-col items-center">
        <h3 className="">{`${song.artist_name} - ${song.song_title}`}</h3>

        <div className="w-[70vw]" ref={containerRef} />

        <div className="text-primary flex items-center">
          <button
            className="mx-4 flex scale-70 items-center justify-center p-0 outline-2 outline-amber-700"
            onClick={onPlayPause}
          >
            {isPlaying ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 5.25v13.5m-7.5-13.5v13.5"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                />
              </svg>
            )}
          </button>

          <Slider
            classNames={{
              base: "w-20 gap-3",
              track: "bg-primary",
              filler: "bg-PrimaryGradient",
              thumb: "bg-PrimaryGradient",
            }}
            aria-label={"volume slider"}
            minValue={0}
            maxValue={1}
            step={0.01}
            value={volume}
            onChange={changeVolume}
          />
          <div className="mx-4 flex content-center items-center justify-center gap-2">
            {/*{secondsToMinutes(currentTime)}*/}
            {secondsToMinutes(currentTime)}

            <Slider
              classNames={{
                base: "w-40 gap-3",
                track: "bg-primary",
                filler: "bg-PrimaryGradient",
                thumb: "bg-PrimaryGradient",
              }}
              aria-label={"song position slider"}
              minValue={0}
              maxValue={songDuration}
              step={0.01}
              value={currentTime}
              onChange={handleSeekChange}
            />
            {secondsToMinutes(songDuration)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MusicPlayer;
