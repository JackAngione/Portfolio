import React, { useEffect, useState } from "react";
import "react-lazy-load-image-component/src/effects/blur.css";
import CaptureOneLogo from "./softwareLogos/CAPTURE_ONE_LOGO.svg";
import PhotoshopLogo from "./softwareLogos/adobe-photoshop-2.svg";
import LightroomLogo from "./softwareLogos/Lightroom_logo.svg";
import DavinciLogo from "./softwareLogos/DaVinci_Resolve_logo.svg";
import PremiereProLogo from "./softwareLogos/premiere-pro-cc.svg";
import AfterEffectsLogo from "./softwareLogos/after-effects-1.svg";
import "./hdrPhotos.css";
import PhotoCategory from "./PhotoCategory.jsx";

function HDRPhotos() {
  const [photoCategories, setPhotoCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  useEffect(() => {
    //TODO Delete getImagePaths function!

    async function getCategories() {
      const response = await fetch(
        "http://192.168.1.242:2121/getPhotoCategories",
      );
      let list = await response.json();
      setPhotoCategories(list.sort());
    }

    getCategories().then((r) => {});
    //getImagePaths().then((r) => console.log("JACK" + imagePaths));
  }, []);

  const handleCategorySelect = (category) => {
    console.log(category);
    setSelectedCategory(category);
  };
  return (
    <div className="">
      <h1 className="mt-14 font-bold">PHOTOGRAPHY</h1>
      <p className="">
        All images are in HDR. View this webpage on an HDR capable
        display/browser!
      </p>
      <h3 className="my-4 mt-12">
        Over 9 years of experience in photography/videography
      </h3>
      <div className="mb-12 flex items-center justify-center gap-24">
        <ul className="flex flex-col gap-2">
          <a
            href="https://www.captureone.com/en"
            target="_blank"
            rel="noopener noreferrer"
          >
            <li className="flex items-center">
              <img
                src={CaptureOneLogo}
                className="logo"
                alt="capture one logo"
              />
              Capture One
            </li>
          </a>
          <a
            href="https://www.adobe.com/products/photoshop.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            <li className="flex items-center">
              <img src={PhotoshopLogo} className="logo" />
              Photoshop
            </li>
          </a>

          <a
            href="https://www.adobe.com/products/photoshop-lightroom.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            <li className="flex items-center">
              <img src={LightroomLogo} className="logo" />
              Lightroom
            </li>
          </a>
        </ul>

        <ul className="flex flex-col gap-2">
          <a
            href="https://www.blackmagicdesign.com/products/davinciresolve"
            target="_blank"
            rel="noopener noreferrer"
          >
            <li className="flex items-center">
              <img src={DavinciLogo} className="logo" />
              DaVinci Resolve
            </li>
          </a>
          <a
            href="https://www.adobe.com/products/premiere.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            <li className="flex items-center">
              <img
                src={PremiereProLogo}
                className="logo"
                alt="premiere pro logo"
              />
              Premiere Pro
            </li>
          </a>
          <a
            href="https://www.adobe.com/products/aftereffects.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            <li className="flex items-center">
              <img
                src={AfterEffectsLogo}
                className="logo"
                alt={"after effects logo"}
              />
              After Effects
            </li>
          </a>
        </ul>
      </div>
      <h2>Categories</h2>
      {/* [@media(min-aspect-ratio:1/1)]:*/}
      <div className="mx-16 my-8 flex flex-wrap justify-center">
        {photoCategories.map((category, index) => (
          <label
            className={`${selectedCategory === category ? "bg-PrimaryGradient text-black" : "bg-background"} text-primary m-2 rounded-md border-2 px-6 py-3`}
          >
            <input
              className={`hidden appearance-none text-white shadow-md ring-blue-300`}
              type="radio"
              name="Categories"
              value={category}
              onChange={() => handleCategorySelect(category)}
            />
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </label>
        ))}
      </div>
      <PhotoCategory category={selectedCategory} />
    </div>
  );
}

export default HDRPhotos;
