import React, {useState} from "react";

import LoginModal from "./modals/loginModal"
import jwt_decode from 'jwt-decode';
import Cookies from 'js-cookie';
import axios from "axios";
import {serverAddress} from "./serverInfo.jsx";
import BackgroundAnim from "./backgroundAnimation.jsx";
import programsMarquee from "./logosMarquee.jsx";
import LogosMarquee from "./logosMarquee.jsx";



function Home() {

    const [openModal, setOpenModal] = useState(false)
    const [username, setUsername] = useState(null);
    const [token, setToken] = useState()

    async function process_logout(token) {
        try {
            await axios.post(serverAddress + "/logout", token, {
                headers: {
                    authorization: `Bearer ${token}`,  // Pass JWT in Authorization header
                }
            })
                .then(function (response) {
                    if (response.status === 200) {
                        Cookies.remove('LoginToken'); // Expires after 1 day
                        console.log("LoginToken Delete Successfully")
                        window.location.reload()
                    } else {
                    }
                })
        }
        catch (e) {
            if(e.response.status === 401)
            {
                console.log("logout anyways")
                Cookies.remove('LoginToken'); // Expires after 1 day
                console.log("LoginToken Delete Successfully")
                window.location.reload()
            }
            else
            {
                console.log("server side error logging out")
            }
        }
    }

   function LoginPrompt()
   {
        try {
            setToken(Cookies.get("LoginToken"));
            const thisToken = Cookies.get("LoginToken")
            const decoded = jwt_decode(thisToken);
            setUsername(decoded.username);
        }
        catch (e) {
            //console.error("An error occurred while decoding the token:", e);
        }
    }
    return (
        <>
            <BackgroundAnim/>
            <LoginPrompt/>
            {username ? (<>
                {username}
                <button onClick={() => {
                    process_logout({token}).then(r => {
                    })
                }}>
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