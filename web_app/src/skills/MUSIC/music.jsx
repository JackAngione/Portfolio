import React, {useEffect, useRef, useState} from "react";

import MusicPagePlayer from "./musicPagePlayer.jsx";
import PixelAnimation from "./pixelAnimation.jsx";
function Music() {

    return (
        <>
            <PixelAnimation/>
            <div className="musicPage">
                <h1>Music</h1>
                <p>Advanced knowledge of audio engineering across all areas of digital music production</p>

                <h2>Highlight Tracks:</h2>
                <MusicPagePlayer/>
            </div>


        </>

    )



}
export default Music