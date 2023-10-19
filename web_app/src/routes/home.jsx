import {useEffect, useState} from "react";
import "./home.css"
import LoginModal from "./modals/loginModal"
import jwt_decode from 'jwt-decode';
import Cookies from 'js-cookie';
import axios from "axios";
import {serverAddress} from "./serverInfo.jsx";
function Home() {
    const [imageSpeed, setImageSpeed] = useState(100)
    const [rangeValue, setRangeValue] = useState(2)
    const [openModal, setOpenModal] = useState(false)
    const [username, setUsername] = useState(null);
    const [token, setToken] = useState()
    // assuming you have 100 images named as 'image1.jpg', 'image2.jpg' etc. in the 'public/images' directory
    const images = Array.from({length: 13}, (_, i) => `/jackAILOGO/img${i + 1}.png`);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prevIndex) =>
                prevIndex === images.length - 1 ? 0 : prevIndex + 1
            );
        }, imageSpeed); // Change image every 100ms. Adjust as needed.

        return () => {
            clearInterval(interval);
        };
    }, [imageSpeed]);
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
            <h1></h1>
            <div className="homepage">

                {/*<img className="AIimage" src={images[currentImageIndex]} alt="slideshow" />*/}

            </div>

            <p>
                (imagery made with stable diffusion and control net extension)
            </p>
            <LoginPrompt/>
            {username  ? (<>
                {username}
                <button onClick={() =>{ process_logout({token}).then(r => {})}}>
                    Logout
                </button>
            </>) : (<>
                <button onClick={() =>{ setOpenModal(!openModal)}}>
                    Login
                </button>
                <LoginModal open = {openModal}></LoginModal>
            </>)}
        </>
    )
}
export default Home