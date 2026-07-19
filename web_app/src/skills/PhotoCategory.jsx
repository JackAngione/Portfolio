//displays all photos in a category as a grid with a click-to-preview overlay
import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import "ldrs/square";
import { media_server_address } from "../serverInfo.jsx";

function PhotoCategory() {
  const { category } = useParams();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    async function getImagePaths() {
      const response = await fetch(
        media_server_address + "/photo-categories/" + category + "/photos",
      );
      let list = await response.json();
      setPhotos(list);
      setLoading(false);
    }

    getImagePaths().then((r) => {});
  }, [category]);

  const photoURL = (photo) =>
    media_server_address + "/photo/" + category + "/" + photo;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-12 p-40">
        <l-square
          size="60"
          stroke="2"
          stroke-length="0.25"
          bg-opacity="0.1"
          speed="1.4"
          color="white"
        ></l-square>
        <h2>LOADING PHOTOS...</h2>
      </div>
    );
  }
  return (
    <>
      <h1 className="mb-8 pl-[3vw] uppercase md:pl-[10vw]">{category}</h1>
      <div className="relative z-10 flex items-center justify-center pb-20">
        <div className="grid grid-cols-2 gap-0.5 [@media(min-aspect-ratio:1/1)]:grid-cols-3">
          {photos.map((photo, index) => (
            <div
              key={index}
              className="relative h-[38vw] w-[38vw] overflow-hidden [@media(min-aspect-ratio:1/1)]:h-[25vw] [@media(min-aspect-ratio:1/1)]:w-[25vw]"
            >
              <img
                src={photoURL(photo)}
                alt={`photo`}
                loading="lazy"
                className="z-1 h-full w-full cursor-pointer object-cover"
                onClick={() => {
                  setShowPreview(true);
                  setSelectedPhoto(photo);
                }}
              />
            </div>
          ))}
          {showPreview && (
            <div
              /*Blurs the rest of the site when the image is open*/
              className="fixed top-1/2 left-1/2 z-10 flex h-screen w-screen -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center backdrop-blur-sm"
              onClick={() => {
                //click anywhere to close the preview
                setShowPreview(false);
              }}
            >
              <img
                src={photoURL(selectedPhoto)}
                alt={`photo`}
                className="z-0 max-h-[80vh] max-w-[80vw]"
              />
              <div className="mt-2 flex gap-2">
                <a target="_blank" href={photoURL(selectedPhoto)}>
                  <button className="bg-background/70">Full-Res</button>
                </a>
                <button
                  className="bg-background/70"
                  onClick={() => {
                    setShowPreview(false);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default PhotoCategory;
