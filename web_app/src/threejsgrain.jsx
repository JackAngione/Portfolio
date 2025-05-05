// src/components/FilmGrainScene.jsx
import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing"; // Import BlendFunction
import { OrbitControls } from "@react-three/drei"; // Optional: for camera controls

// Inner component to use hooks like useFrame
function SceneContent() {
  const cubeRef = useRef();

  // useFrame runs on every rendered frame
  useFrame((state, delta) => {
    // Animate the cube (optional)
    if (cubeRef.current) {
      cubeRef.current.rotation.x += delta * 0.2;
      cubeRef.current.rotation.y += delta * 0.3;
    }
    // Note: The Noise/Scanlines effects might have internal time sensitivity
    // or props for animation if needed, but often a static effect is desired.
  });

  return (
    <>
      {/* Lights */}
      <ambientLight intensity={0.1} />
      <directionalLight position={[2, 5, 3]} intensity={4.0} />

      {/* Objects */}
      <mesh ref={cubeRef}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="mediumseagreen" />
      </mesh>

      {/* Optional: Controls to move the camera */}
      <OrbitControls />
    </>
  );
}

// Main component containing Canvas and Effects
function FilmGrainScene() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {" "}
      {/* Ensure container has size */}
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        {" "}
        {/* Set up Canvas */}
        <SceneContent /> {/* Add lights, objects, controls */}
        {/* Post-processing Effects */}
        <EffectComposer>
          {/* Combine Noise and Scanlines to simulate Film Grain */}
          <Noise
            premultiply // Defines if the noise should be multiplied with the source color (useful for dark backgrounds)
            blendFunction={BlendFunction.SCREEN} // How the noise blends. ADD, SCREEN, OVERLAY are common
            opacity={1.0} // Opacity of the noise effect
          />
          <Bloom
            opacity={1.0} // Opacity of the noise effect
          />
          {/*  <Scanlines
            blendFunction={BlendFunction.OVERLAY} // How the scanlines blend
            density={1.25} // Density/frequency of scanlines
            opacity={0.15} // Opacity of the scanlines
          />*/}
          {/* You could add other effects here like Vignette, Bloom etc. */}
          {/* <Vignette eskil={false} offset={0.1} darkness={1.1} /> */}
        </EffectComposer>
      </Canvas>
    </div>
  );
}

export default FilmGrainScene;
