import React, { useEffect, useMemo, useRef, useState } from "react";
import { useWavesurfer } from "@wavesurfer/react";
import { Slider } from "@heroui/react";
import { media_server_address } from "../../serverInfo.jsx";

function MusicPlayer({ song }) {
  //pre-computed peaks from the server, so the waveform renders without
  //downloading the whole audio file (playback then streams via the media element)
  const [waveform, setWaveform] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setWaveform(null);
    fetch(
      media_server_address + "/waveform/" + song.artist_id + "/" + song.song_id,
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        //fall back to client-side decoding if the endpoint fails
        if (!cancelled) {
          setWaveform(data ?? { peaks: null, duration: null });
          if (data?.duration) setSongDuration(data.duration);
        }
      })
      .catch(() => {
        if (!cancelled) setWaveform({ peaks: null, duration: null });
      });
    return () => {
      cancelled = true;
    };
  }, [song.artist_id, song.song_id]);

  //useWavesurfer recreates the player when any option changes identity, so
  //the peaks array must be memoized to avoid an infinite recreate loop
  const peaks = useMemo(
    () => (waveform?.peaks ? [waveform.peaks] : undefined),
    [waveform],
  );

  //initialize WaveSurfer (only once the peaks fetch has settled, otherwise
  //wavesurfer would start downloading the full file to decode it itself)
  const containerRef = useRef(null);
  const { wavesurfer, isReady, isPlaying, currentTime } = useWavesurfer({
    container: containerRef,
    url: waveform
      ? media_server_address + "/stream/" + song.artist_id + "/" + song.song_id
      : undefined,
    peaks,
    duration: waveform?.duration ?? undefined,
    waveColor: "#fcf7f8",
    progressColor: "oklch(0.72 0.2466 360)",
    height: 40,
    // Set a bar width
    barWidth: 1,

    // And the bar radius
    barRadius: 8,
  });
  const onPlayPause = () => {
    wavesurfer && wavesurfer.playPause();
  };

  //spacebar toggles play/pause (unless the user is typing in a field)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code !== "Space" || e.repeat) return;
      const target = e.target;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;
      //stop the page from scrolling and focused buttons/sliders from
      //re-triggering their own space behavior
      e.preventDefault();
      wavesurfer && wavesurfer.playPause();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [wavesurfer]);
  //THIS CODE RUNS WHEN WAVESURFER IS LOADED
  useEffect(() => {
    //the media element may not have loaded metadata yet, so fall back to the
    //duration reported by the waveform endpoint
    wavesurfer &&
      setSongDuration(wavesurfer.getDuration() || waveform?.duration || 0);
    //re-apply the slider's current level so volume carries over between songs
    wavesurfer && wavesurfer.setVolume(Math.pow(volume, 2));
  }, [isReady, wavesurfer]);

  const [volume, setVolume] = useState(0.25);
  const [songProgress, setSongProgress] = useState(0);
  const [songDuration, setSongDuration] = useState(0);

  //below this width the volume slider switches to vertical to save
  //horizontal space instead of disappearing
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 640,
  );
  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const onChange = (e) => setIsNarrow(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

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
    //value is in seconds (slider range is 0..songDuration)
    wavesurfer.setTime(value);
    setSongProgress(value);
  };

  return (
    <div className="border-primary/10 bg-background/80 fixed bottom-0 z-2 w-full border-t shadow-[0_-8px_30px_rgba(0,0,0,0.5)] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-3 sm:gap-6">
        {/* play/pause */}
        <button
          className="bg-PrimaryGradient text-background! flex size-12 shrink-0 items-center justify-center rounded-full! p-0! shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label={isPlaying ? "pause" : "play"}
          onClick={onPlayPause}
        >
          {isPlaying ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="20"
              height="20"
              className="size-5"
            >
              <path d="M6.75 5.25h3v13.5h-3zM14.25 5.25h3v13.5h-3z" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="20"
              height="20"
              className="ml-0.5 size-5"
            >
              <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
          )}
        </button>

        {/* track info + waveform */}
        <div className="flex min-w-0 grow flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-primary truncate text-left text-sm font-bold sm:text-base">
              {song.song_title}
              <span className="text-primary/60 ml-2 font-normal">
                {song.artist_name}
              </span>
            </p>
            <p className="text-primary/60 shrink-0 font-mono text-xs tabular-nums">
              {secondsToMinutes(currentTime)}
              <span className="text-primary/30"> / </span>
              {secondsToMinutes(songDuration)}
            </p>
          </div>

          <div className="w-full cursor-pointer" ref={containerRef} />

          <Slider
            classNames={{
              base: "w-full",
              track: "bg-primary/20 h-1 border-x-0!",
              filler: "bg-PrimaryGradient",
              thumb: "bg-PrimaryGradient size-3 after:hidden shadow-md",
            }}
            size="sm"
            aria-label={"song position slider"}
            minValue={0}
            maxValue={songDuration}
            step={0.01}
            value={currentTime}
            onChange={handleSeekChange}
          />
        </div>

        {/* volume */}
        <div
          className={`flex shrink-0 items-center gap-2 ${isNarrow ? "flex-col-reverse" : ""}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth={1.5}
            stroke="currentColor"
            className="text-primary/60 size-4 shrink-0 sm:size-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
            />
          </svg>
          <Slider
            orientation={isNarrow ? "vertical" : "horizontal"}
            classNames={{
              base: isNarrow ? "h-16 w-4" : "w-16 sm:w-24",
              track: isNarrow
                ? "bg-primary/20 w-1 border-y-0!"
                : "bg-primary/20 h-1 border-x-0!",
              filler: "bg-PrimaryGradient",
              thumb: "bg-PrimaryGradient size-3 after:hidden shadow-md",
            }}
            size="sm"
            aria-label={"volume slider"}
            minValue={0}
            maxValue={1}
            step={0.01}
            value={volume}
            onChange={changeVolume}
          />
        </div>
      </div>
    </div>
  );
}

export default MusicPlayer;
