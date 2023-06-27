import React, { useState, useEffect } from 'react';

function PixelAnimation() {
    const [colors, setColors] = useState(Array(10000).fill('white'));

    useEffect(() => {
        const intervalId = setInterval(() => {
            const newColors = colors.map(() => getRandomColor());
            setColors(newColors);
        }, 250); // Change colors every 1 second

        return () => clearInterval(intervalId); // Clear interval on unmount
    }, [colors]);

    return (
        <div style={{
            top: "0",
            left: "0",
            position: "absolute",
            width: "100%",
            display: 'grid',
            gridTemplateColumns: 'repeat(100, 1fr)',
            gridTemplateRows: 'repeat(100, 1fr)',
            gap: '1px',
            height: '100vh'
        }}>
            {colors.map((color, index) => (
                <div key={index} style={{ backgroundColor: color, width: '100%', height: '100%' }} />
            ))}
        </div>
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

export default PixelAnimation;
