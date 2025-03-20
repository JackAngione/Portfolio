import "./photography.css"
import DavinciLogo from "./softwareLogos/DaVinci_Resolve_logo.svg";
import CaptureOneLogo from "./softwareLogos/CAPTURE_ONE_LOGO.svg"
import PhotoshopLogo from "./softwareLogos/adobe-photoshop-2.svg"
import AfterEffectsLogo from "./softwareLogos/after-effects-1.svg"
import LightroomLogo from "./softwareLogos/Lightroom_logo.svg"
import PremiereProLogo from "./softwareLogos/premiere-pro-cc.svg"
import {useEffect, useState} from "react";
//import {flickrKey} from "../API_Keys"
function Photography() {
    const [photos, setPhotos] = useState([]);

    useEffect(() => {
        fetch(`https://api.flickr.com/services/rest/?method=flickr.people.getPublicPhotos&api_key=${flickrKey}&user_id=136018663@N05&format=json&nojsoncallback=1`)
            .then(response => response.json())
            .then(data => {
                let photoArray = data.photos.photo.map((pic) => {
                    const srcPath = 'https://farm' + pic.farm + '.staticflickr.com/' + pic.server + '/' + pic.id + '_' + pic.secret + '_b.jpg';
                    const img = new Image();

                    return(
                        <div className="imageDiv">
                            <a  href={`https://www.flickr.com/photos/jackangione/${pic.id}`} target="_blank"  rel="noopener noreferrer">
                                <img alt="Flickr" src={srcPath} />
                            </a>

                        </div>

                    )
                })
                setPhotos(photoArray);
            });
    }, []);










    return (
        <div className="entirePage">
            <h1>Photography</h1>
            <p>
                8 years of experience in photography/videography, with expertise in:
            </p>
            <div id="softwareList">
                <ul >
                    <a href="https://www.captureone.com/en" target="_blank"  rel="noopener noreferrer">
                        <li>
                            <img src={CaptureOneLogo} className="logo"/>
                            Capture One
                        </li>
                    </a>
                    <a href="https://www.adobe.com/products/photoshop.html" target="_blank"  rel="noopener noreferrer">
                        <li>
                            <img src={PhotoshopLogo} className="logo"/>
                            Photoshop
                        </li>
                    </a>

                    <a href="https://www.adobe.com/products/photoshop-lightroom.html" target="_blank"  rel="noopener noreferrer">
                        <li>
                            <img src={LightroomLogo} className="logo"/>
                            Lightroom
                        </li>
                    </a>
                </ul>
                <ul>
                    <a href="https://www.blackmagicdesign.com/products/davinciresolve" target="_blank"  rel="noopener noreferrer">
                        <li>
                            <img src={DavinciLogo} className="logo"/>
                            DaVinci Resolve
                        </li>
                    </a>
                    <a href="https://www.adobe.com/products/premiere.html" target="_blank"  rel="noopener noreferrer">
                        <li>
                            <img src={PremiereProLogo} className="logo"/>
                            Premiere Pro
                        </li>
                    </a>


                    <a href="https://www.adobe.com/products/aftereffects.html" target="_blank"  rel="noopener noreferrer">
                        <li>
                            <img src={AfterEffectsLogo} className="logo" alt={"after effects logo"}/>
                            After Effects
                        </li>
                    </a>

                </ul>
            </div>
            <div className="centerPhotos">
                <div className="flickrPhotos">
                    {photos}
                </div>
            </div>


        </div>
    )



}
export default Photography