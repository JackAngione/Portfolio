import grainVideo from "../public/grain.mp4";
import React, { useCallback, useEffect } from "react";
import "./grain.css";
import { useNavigate } from "react-router";
function GrainOverlay({ children }) {
  //COMMAND K TO SEARCH RESOURCES KEYBIND
  let navigate = useNavigate();
  const handleKeyPress = useCallback((event) => {
    if (event.metaKey && event.key === "k") {
      navigate("/resources");
    }
  }, []);

  useEffect(() => {
    // attach the event listener
    document.addEventListener("keydown", handleKeyPress);

    // remove the event listener
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  return (
    <>
      {children}
      <video loop autoPlay muted>
        <source src={grainVideo} type="video/mp4"></source>
      </video>
      {/*<img src={noiseSVG} alt=""></img>*/}
    </>
  );
}
export default GrainOverlay;
