import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import "ldrs/square";
import CaptureOneLogo from "./softwareLogos/CAPTURE_ONE_LOGO.svg";
import PhotoshopLogo from "./softwareLogos/adobe-photoshop-2.svg";
import LightroomLogo from "./softwareLogos/Lightroom_logo.svg";
import DavinciLogo from "./softwareLogos/DaVinci_Resolve_logo.svg";
import PremiereProLogo from "./softwareLogos/premiere-pro-cc.svg";
import AfterEffectsLogo from "./softwareLogos/after-effects-1.svg";
import "./hdrPhotos.css";
import { media_server_address } from "../serverInfo.jsx";

function HDRPhotos() {
  const [photoCategories, setPhotoCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    async function getCategories() {
      try {
        const response = await fetch(
          media_server_address + "/getPhotoCategories",
        );
        let list = await response.json();
        setPhotoCategories(list.sort());
      } catch (e) {
        setError(true);
      }
      setLoading(false);
    }

    getCategories().then((r) => {});
  }, []);

  return (
    <div className="mx-4 flex flex-col items-center justify-center">
      <h1 className="font-bold" style={{ marginTop: "var(--nav-safe-top, 112px)" }}>
        PHOTOGRAPHY
      </h1>
      <p className="">
        All images are in HDR. View this webpage on an HDR capable
        display/browser!
      </p>
      <h3 className="mt-12">
        Over 9 years of experience in photography/videography
      </h3>
      <h3 className="mb-4"> (and a little graphic design)</h3>
      <div className="mb-12 flex items-center justify-center gap-6">
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
      <h2>GALLERY</h2>
      {loading && (
        <div className="flex flex-col items-center justify-center gap-12 p-40">
          <l-square
            size="60"
            stroke="2"
            stroke-length="0.25"
            bg-opacity="0.1"
            speed="1.4"
            color="white"
          ></l-square>
          <h2>LOADING CATEGORIES...</h2>
        </div>
      )}
      {error && (
        <div className="flex flex-col items-center justify-center gap-12 p-40">
          <h2>Error loading categories :(</h2>
        </div>
      )}
      {!loading && !error && (
        <div className="z-6 my-8 flex flex-col text-center">
          <motion.div
            className="mb-4 text-sm"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
            }}
            transition={{
              opacity: { delay: 1, duration: 1 },
            }}
          >
            view by category
          </motion.div>
          {photoCategories.map((category, index) => (
            <Link
              to={`/hdrphotos/${category}`}
              key={index}
              className="text-4xl"
            >
              {category}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default HDRPhotos;
