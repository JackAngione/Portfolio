import React, { useState, useEffect } from 'react';

function PixelAnimationBackup() {
    const [colors, setColors] = useState([Array(1000).fill('white')]);
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight
    });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        window.addEventListener('resize', handleResize);

        // Clean up
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const intervalId = setInterval(() => {
            const newColors = colors.map(() => getRandomColor());
            setColors(newColors);
        }, 400); // Change colors every 1 second

        return () => clearInterval(intervalId); // Clear interval on unmount
    }, [colors]);

    return (
        <>
            {/*<div className="flex">
                {windowSize.width}
            </div>*/}

            <div>
                <div style={{
                    width: "100%",
                    left: "100px",
                    position: "absolute",
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 100px)',
                    gridTemplateRows: 'repeat(5, 100px)',
                    gap: '1px'
                }}>
                    <div style={{
                        width: "100%",
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 100px)',
                        gridTemplateRows: 'repeat(5, 100px)',
                        gap: '1px',
                    }}>

                        {colors.map((color, index) => (
                            <div key={index} style={{backgroundColor: color, width: '100%', height: '100%'}}/>
                        ))}
                    </div>
                </div>
            </div>
        </>

    );
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

export default PixelAnimationBackup;
