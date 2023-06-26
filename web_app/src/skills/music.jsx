import React, {useEffect, useRef, useState} from "react";
import justDance from "./musicFiles/JUST DANCE22.wav"
import alex from "./musicFiles/alexia.wav"
import ReactPlayer from 'react-player'
import { Tooltip } from 'react-tooltip'
import MusicPagePlayer from "./musicPagePlayer.jsx";
function Music() {

    return (
        <>
            <h1>Music</h1>
            <p>Advanced knowledge of audio engineering, in all areas of digital music production</p>
            <MusicPagePlayer/>
        </>

    )



}
export default Music