import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "motion/react";
import "ldrs/square";
import "./backgroundAnimation.css";

function BackgroundAnim(props) {
  const [imageSpeed, setImageSpeed] = useState(100);
  const [imageSpeedSelection, setImageSpeedSelection] = useState(0);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { scrollYProgress } = useScroll();
  const [isClickable, setIsClickable] = useState(true);

  const opacity = useTransform(
    scrollYProgress,
    [0, 0.25], // When scrollYProgress is between 0 and 0.5...
    [1, 0], // ...opacity maps from 1 to 0
  );
  const blurAmount = useTransform(
    scrollYProgress,
    [0, 0.25], // When scrollYProgress is between 0 and 0.5...
    [0, 10], // ...opacity maps from 1 to 0
  );
  // Monitor the opacity value and update clickability
  useMotionValueEvent(opacity, "change", (latest) => {
    setIsClickable(latest >= 0.3);
  });
  // Function to preload an array of image URLs
  const cacheImages = async (imageUrls) => {
    const promises = await imageUrls.map((src) => {
      return new Promise(function (resolve, reject) {
        const img = new Image();
        img.src = src;
        img.onload = resolve;
        img.onerror = reject;
      });
    });
    await Promise.all(promises);
    setLoading(false);
  };
  const imgRef = useRef(null);

  useEffect(() => {
    if (imgRef.current) {
      imgRef.current.setAttribute("loading", "eager");
      // Force browser to respect cache
      imgRef.current.crossOrigin = "anonymous";
    }
  }, []);
  // Preload images on component mount
  useEffect(() => {
    const imageModules = import.meta.glob(
      "/src/jackAILOGO/*.{png,jpg,jpeg,webp}",
      { eager: true },
    );
    let imagePromises = [];
    const imageURLs = Object.values(imageModules).map(
      (module) => module.default,
    );
    /*console.log(imageURLs);*/
    setImages(imageURLs);
    cacheImages(imageURLs).then((r) => {
      setLoading(false);
    });
  }, []);

  //sets the speed at which the images are changed
  useEffect(() => {
    if (images.length === 0) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, imageSpeed); // Change image every 100ms. Adjust as needed.
    return () => {
      clearInterval(interval);
    };
  }, [images, imageSpeed]);

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
    <div
      className={`fixed inset-0 z-1 ${isClickable ? "cursor-pointer" : "pointer-events-none"}`}
    >
      <motion.div
        style={{
          opacity,
          filter: `blur(${blurAmount.get()}px)`,
        }}
        className={`flex items-center justify-center`}
        onClick={() => {
          toggleImageSpeed();
        }}
      >
        {/*<img className="absolute top-180 w-40" src={downArrowIcon} alt="" />*/}
        <div className="bg-background/10 absolute bottom-4 w-16 rounded-xl backdrop-blur-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="white"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m4.5 5.25 7.5 7.5 7.5-7.5m-15 6 7.5 7.5 7.5-7.5"
            />
          </svg>
        </div>
        <div className="flex h-lvh w-full flex-col justify-center overflow-y-hidden [@media(min-aspect-ratio:1/1)]:flex-row [@media(min-aspect-ratio:1/1)]:overflow-x-hidden">
          <img className="" src={images[currentImageIndex]} alt="slideshow2" />
          <img className="" src={images[currentImageIndex]} alt="slideshow" />
          <img className="" src={images[currentImageIndex]} alt="slideshow" />
          <img className="" src={images[currentImageIndex]} alt="slideshow" />
          <img className="" src={images[currentImageIndex]} alt="slideshow" />
        </div>

        {/*
          this seems to help with images staying in cache properly,
          cache issues seem to exist when throttling internet speed in dev server,
          but in production, cache is bulletproof
         */}
        <div className="hidden">
          {images.map((src, index) => (
            <img key={index} src={src} alt={`Preload ${index}`} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default BackgroundAnim;
