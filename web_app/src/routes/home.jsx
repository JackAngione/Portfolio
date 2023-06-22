import {useEffect, useState} from "react";
import "./home.css"
function Home() {
    const [imageSpeed, setImageSpeed] = useState(100)
    const [rangeValue, setRangeValue] = useState(2)
    // assuming you have 100 images named as 'image1.jpg', 'image2.jpg' etc. in the 'public/images' directory
    const images = Array.from({length: 11}, (_, i) => `/jackAILOGO/img${i + 1}.png`);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prevIndex) =>
                prevIndex === images.length - 1 ? 0 : prevIndex + 1
            );
        }, imageSpeed); // Change image every 100ms. Adjust as needed.

        return () => {
            clearInterval(interval);
        };
    }, [imageSpeed]);

    const handleImageSpeed = (e) =>
    {
        setRangeValue(e.target.value)
        if(e.target.value == 2)
        {
            setImageSpeed(100)
            console.log("CHANGING SPEED2")
        }
        else if (e.target.value == 1)
        {
            console.log("CHANGING SPEED1")
            setImageSpeed(200)
        }
        else if (e.target.value == 0)
        {
            console.log("CHANGING SPEED0")
            setImageSpeed(1000)
        }

    }

    return (
        <>
            <h1>HOME</h1>
            <div className="homepage" style={{backgroundImage: `url(${images[currentImageIndex]})`}}>

                <img className="AIimage" src={images[currentImageIndex]} alt="slideshow" />

            </div>

            <input
                type="range"
                min="0"
                max="2"
                value={rangeValue}
                onChange={handleImageSpeed}
            />
          

            <p>
                imagery made with stable diffusion with control net enabled
            </p>
        </>

    )



}
export default Home