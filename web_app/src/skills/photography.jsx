import "./photography.css"
import DavinciLogo from "./softwareLogos/DaVinci_Resolve_logo.svg";
import CaptureOneLogo from "./softwareLogos/CAPTURE_ONE_LOGO.svg"
import PhotoshopLogo from "./softwareLogos/adobe-photoshop-2.svg"
import AfterEffectsLogo from "./softwareLogos/after-effects-1.svg"
import LightroomLogo from "./softwareLogos/Lightroom_logo.svg"
import PremiereProLogo from "./softwareLogos/premiere-pro-cc.svg"
import {useEffect, useState} from "react";
import {flickrKey} from "../API_Keys.jsx";
function Photography() {

    const [photos, setPhotos] = useState([]);

    useEffect(() => {
        fetch(`https://api.flickr.com/services/rest/?method=flickr.people.getPublicPhotos&api_key=${flickrKey}&user_id=136018663@N05&format=json&nojsoncallback=1`)
            .then(response => response.json())
            .then(data => {
                let photoArray = data.photos.photo.map((pic) => {
                    var srcPath = 'https://farm' + pic.farm + '.staticflickr.com/' + pic.server + '/' + pic.id + '_' + pic.secret + '.jpg';
                    return(
                        <img alt="Flickr" src={srcPath} />
                    )
                })
                setPhotos(photoArray);
            });
    }, []);










    return (
        <>
            <h1>Photography</h1>
            <p>
                8 years of experience in photography/videography .
                Expertise in the following software:

            </p>
            <div id="softwareList">
                <ul >
                    <li>
                        <img src={CaptureOneLogo} className="logo"/>
                        Capture One
                    </li>
                    <li>
                        <img src={PhotoshopLogo} className="logo"/>
                        Photoshop
                    </li>
                    <li>
                        <img src={LightroomLogo} className="logo"/>
                        Lightroom
                    </li>

                </ul>
                <ul>
                    <li>
                        <img src={DavinciLogo} className="logo"/>
                        DaVinci Resolve
                    </li>
                    <li>
                        <img src={PremiereProLogo} className="logo"/>
                        Premiere Pro
                    </li>
                    <li>
                        <img src={AfterEffectsLogo} className="logo"/>
                        After Effects
                    </li>
                </ul>
            </div>
            {photos}
        </>
    )



}
export default Photography