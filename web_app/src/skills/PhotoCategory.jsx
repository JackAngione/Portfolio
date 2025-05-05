//input photo category, display all images of that category
import React, { useEffect, useState } from "react";
import { LazyLoadImage } from "react-lazy-load-image-component";

function PhotoCategory({ category }) {
  const [photos, setPhotos] = useState([]);

  async function getImagePaths() {
    console.log("http://192.168.1.242:2121/getPhotoInCategory/" + category);
    const response = await fetch(
      "http://192.168.1.242:2121/getPhotoInCategory/" + category,
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
    <div className="flex">
      <div className="z-3 h-auto w-fit columns-2 flex-col gap-0">
        {photos.map((photoName, index) => (
          <LazyLoadImage
            className="-mt-1.5 max-h-[90vh] cursor-pointer"
            key={index}
            src={
              "http://192.168.1.242:2121/photo/" + category + "/" + photoName
            }
            alt={`img-${index}`}
            //onLoad={}
            effect="blur"
            onClick={() =>
              handleImageClick(
                "http://192.168.1.242:2121/photo/" + category + "/" + photoName,
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

export default PhotoCategory;
