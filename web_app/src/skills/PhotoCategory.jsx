//input photo category, display all images of that category
import React, { useEffect, useState } from "react";
import { LazyLoadImage } from "react-lazy-load-image-component";
import { media_server_address } from "../serverInfo.jsx";

function PhotoCategory({ category }) {
  const [photos, setPhotos] = useState([]);

  async function getImagePaths() {
    const response = await fetch(
      media_server_address + "/getPhotoInCategory/" + category,
    );
    let list = await response.json();
    setPhotos(list);
  }

  useEffect(() => {
    if (category !== "") {
      getImagePaths().then((r) => {});
    }
  }, [category]);
  const handleImageClick = (imagePath) => {
    window.open(imagePath, "_blank");
  };

  return (
    <div className="flex items-center justify-center">
      <div className="z-6 h-auto columns-2 flex-col gap-0 lg:columns-3">
        {photos.map((photoName, index) => (
          /*max height limited to balance the visual weight of portrait and landscape images*/
          <LazyLoadImage
            className="-mt-1.5 max-h-[40vh] cursor-pointer lg:max-h-[65vh]"
            key={index}
            src={media_server_address + "/photo/" + category + "/" + photoName}
            alt={`img-${index}`}
            //onLoad={}
            effect="blur"
            onClick={() =>
              handleImageClick(
                media_server_address + "/photo/" + category + "/" + photoName,
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

export default PhotoCategory;
