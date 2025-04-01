import React, {useEffect, useState} from "react";

import LoginModal from "./modals/loginModal"
import {jwtDecode} from 'jwt-decode';
import Cookies from 'js-cookie';
import axios from "axios";
import {serverAddress} from "./serverInfo.jsx";
import BackgroundAnim from "./backgroundAnimation.jsx";
import programsMarquee from "./logosMarquee.jsx";
import LogosMarquee from "./logosMarquee.jsx";
import {logout} from "../useAuth.jsx";



function Home() {

    const [openModal, setOpenModal] = useState(false)
    const [username, setUsername] = useState(null);
    const [token, setToken] = useState()

    useEffect(() => {
        try {
            setToken(Cookies.get("LoginToken"));
            const thisToken = Cookies.get("LoginToken")
            const decoded = jwtDecode(thisToken);
            setUsername(decoded.username);
        }
        catch (e) {
            //console.error("An error occurred while decoding the token:", e);
        }
    },[])

    return (
        <>
            <BackgroundAnim/>

            {username ? (<>
                {username}
                <button onClick={() => {logout({token}).then(r => {})}}>
                    Logout
                </button>
            </>) : (<>
                <button onClick={() => {
                    setOpenModal(!openModal)
                }}>
                    Login
                </button>
                <LoginModal open={openModal}></LoginModal>
            </>)}

            <div className="bg-[#BF1363]  text-white ">

                <LogosMarquee/>

            </div>



        </>
    )
}

export default Home