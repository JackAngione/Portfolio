import React, { useEffect, useState } from "react";

import "ldrs/square";
import "./backgroundAnimation.css";
import NavigationBar from "./navigationBar.jsx";
import { LazyLoadImage } from "react-lazy-load-image-component";

// Function to preload an array of image URLs
const preloadImages = (imageUrls) => {
  return Promise.all(
    imageUrls.map(
      (url) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.src = url;
          img.onload = resolve;
          img.onerror = reject;
        }),
    ),
  );
};

function BackgroundAnim(props) {
  const [imageSpeed, setImageSpeed] = useState(100);
  const [imageSpeedSelection, setImageSpeedSelection] = useState(0);
  //const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // This uses Vite's import.meta.glob to get all images in the specified directory
  // Replace the path with your actual images folder path
  const imageModules = import.meta.glob(
    "/src/jackAILOGO/*.{png,jpg,jpeg,webp}",
    { eager: true },
  );

  const images = Object.values(imageModules).map((module) => module.default);
  //console.log("images: ");
  //console.log(images);
  // Preload images on component mount
  useEffect(() => {
    preloadImages(images)
      .then(() => setLoading(false))
      .catch((err) => console.error("Error preloading images", err));
  }, [images]);

  //sets the speed at which the images are changed
  useEffect(() => {
    if (loading) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, imageSpeed); // Change image every 100ms. Adjust as needed.
    return () => {
      clearInterval(interval);
    };
  }, [loading, imageSpeed]);

  const handleImageSpeed = (e) => {
    setRangeValue(e.target.value);
    if (e.target.value == 2) {
      setImageSpeed(100);
    } else if (e.target.value == 1) {
      setImageSpeed(200);
    } else if (e.target.value == 0) {
      setImageSpeed(2000);
    }
  };
  function toggleImageSpeed(e) {
    const speedMap = {
      0: 100,
      1: 400,
      2: 2000,
    };
    setImageSpeedSelection((imageSpeedSelection + 1) % 3);
    setImageSpeed(speedMap[(imageSpeedSelection + 1) % 3]);
  }
  if (loading) {
    /*loading screen*/
    return (
      <div className="py-[50vh]">
        <l-square
          size="45"
          stroke="3"
          stroke-length="0.125"
          bg-opacity="0.1"
          speed="1.2"
          color="#fcf7f8"
        ></l-square>
      </div>
    );
  }

  return (
    <>
      <div
        className="flex h-lvh w-full flex-col justify-center overflow-y-hidden [@media(min-aspect-ratio:1/1)]:flex-row [@media(min-aspect-ratio:1/1)]:overflow-x-hidden"
        onClick={() => {
          toggleImageSpeed();
        }}
      >
        <LazyLoadImage
          className=""
          src={images[currentImageIndex]}
          alt="slideshow2"
        />
        <LazyLoadImage
          className=""
          src={images[currentImageIndex]}
          alt="slideshow"
        />
        <LazyLoadImage
          className=""
          src={images[currentImageIndex]}
          alt="slideshow"
        />
        <LazyLoadImage
          className=""
          src={images[currentImageIndex]}
          alt="slideshow"
        />
        <LazyLoadImage
          className=""
          src={images[currentImageIndex]}
          alt="slideshow"
        />
      </div>

      <p> (imagery made with stable diffusion and control net extension) </p>
    </>
  );
}

export default BackgroundAnim;
