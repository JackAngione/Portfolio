import React from 'react';
import { LazyLoadImage } from "react-lazy-load-image-component";
import 'react-lazy-load-image-component/src/effects/blur.css';
import CaptureOneLogo from "./softwareLogos/CAPTURE_ONE_LOGO.svg";
import PhotoshopLogo from "./softwareLogos/adobe-photoshop-2.svg";
import LightroomLogo from "./softwareLogos/Lightroom_logo.svg";
import DavinciLogo from "./softwareLogos/DaVinci_Resolve_logo.svg";
import PremiereProLogo from "./softwareLogos/premiere-pro-cc.svg";
import AfterEffectsLogo from "./softwareLogos/after-effects-1.svg";

// Import all images from the 'images' folder
const images = import.meta.glob('../../src/HDRPHOTOS/*.{png,jpg,jpeg,svg,avif}', { eager: true });
const lowres_images = import.meta.glob('../../src/HDRPHOTOS/lowres/*.{png,jpg,jpeg,avif,webp}', { eager: true });
function HDRPhotos() {


    //const portrait = window.matchMedia("(orientation: portrait)").matches;
    const handleImageClick = (imagePath) => {
        alert("Image clicked!");
    };

    return (
        <div className="">
            <h1 className="pt-14 font-bold">HDR PHOTOS</h1>
            <h2 className="pb-12 -mt- text-sm">(View this webpage on an HDR capable display!)</h2>
            <p className="pb-2">
                8+ years of experience in photography/videography, with expertise in:
            </p>
            <div className="flex items-center justify-center pb-12">
                <ul className=" p-4">
                    <a href="https://www.captureone.com/en" target="_blank"  rel="noopener noreferrer">
                        <li className="flex items-center" >
                            <img src={CaptureOneLogo} className="logo"/>
                            Capture One
                        </li>
                    </a>
                    <a href="https://www.adobe.com/products/photoshop.html" target="_blank"  rel="noopener noreferrer">
                        <li className="flex items-center">
                            <img src={PhotoshopLogo} className="logo"/>
                            Photoshop
                        </li>
                    </a>

                    <a href="https://www.adobe.com/products/photoshop-lightroom.html" target="_blank"  rel="noopener noreferrer">
                        <li className="flex items-center">
                            <img src={LightroomLogo} className="logo"/>
                            Lightroom
                        </li>
                    </a>
                </ul>
                <ul className="p-4">
                    <a href="https://www.blackmagicdesign.com/products/davinciresolve" target="_blank"  rel="noopener noreferrer">
                        <li className="flex items-center">
                            <img src={DavinciLogo} className="logo"/>
                            DaVinci Resolve
                        </li>
                    </a>
                    <a href="https://www.adobe.com/products/premiere.html" target="_blank"  rel="noopener noreferrer">
                        <li className="flex items-center">
                            <img src={PremiereProLogo} className="logo"/>
                            Premiere Pro
                        </li>
                    </a>
                    <a href="https://www.adobe.com/products/aftereffects.html" target="_blank"  rel="noopener noreferrer">
                        <li className="flex items-center">
                            <img src={AfterEffectsLogo} className="logo" alt={"after effects logo"}/>
                            After Effects
                        </li>
                    </a>

                </ul>
            </div>
            <div className="flex justify-center">
                <div className="columns-2 [@media(min-aspect-ratio:1/1)]:columns-3 gap-0">
                    {Object.entries(lowres_images).map(([path, module], index) => (
                        console.log("../../src/HDRPHOTOS/" + path.substring(13))
                    ))}
                    {/*LOOP THROUGH IMAGES A DISPLAY THEM*/}
                    {Object.entries(images).map(([path, module], index) => (

                        <LazyLoadImage
                            className="w-full h-auto cursor-pointer -my-0.75"
                            key={index}
                            src={"../../src/HDRPHOTOS/" + path.substring(13)}
                            alt={`img-${index}`}
                            //onLoad={}

                            effect="blur"

                            onClick={() => handleImageClick("../../src/HDRPHOTOS/lowres/" + path.substring(13))}
                        />
                    ))}
                </div>

            </div>
        </div>
    )
}

export default HDRPhotos