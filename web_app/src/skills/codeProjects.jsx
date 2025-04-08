import { motion, useAnimation } from "motion/react";
import { useEffect } from "react";
import "./codeProjects.css";
function CodeProjects() {
  const controls = useAnimation();

  useEffect(() => {
    const sequence = async () => {
      controls.start({ width: "100%" });
      controls.start({ opacity: 1 });
    };
    sequence();
  }, []);
  return (
    <>
      <h1 className="my-14">CODING PROJECTS</h1>

      <div className="flex-col flex items-center">
        <div className="project">
          <motion.h2
            className=""
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.25 }}
          >
            <a
              href={"https://TheMiddlePlace.jackangione.com"}
              target="_blank"
              rel="noopener noreferrer"
            >
              The Middle Place
            </a>
          </motion.h2>
          <h2></h2>
          <h3>Algorithmic NFT Artwork</h3>
          <p>
            A collaboration with artist Josh Landis to create a line of
            algorithmic NFTs
          </p>
          <p>
            {" "}
            Used Canvas in Javascript to render out generated combinations of
            components to a final image file.
          </p>
          <p>
            {" "}
            Canvas also allowed me to interactively display the artwork on a
            website. Each component of the art can be swapped out with sliders
            to view the various combinations.{" "}
          </p>
          <h3>Features</h3>
          <ul>
            <li>
              Interactively view all possible combinations of the artwork
              components
            </li>
            <li>Randomly generate a look</li>
            <li>Link to buy NFT</li>
          </ul>
        </div>

        <div className="project">
          <motion.h2
            className=""
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.25 }}
          >
            <a
              href={"https://github.com/JackAngione/MuZe"}
              target="_blank"
              rel="noopener noreferrer"
            >
              MuZe
            </a>
          </motion.h2>
          <h3>
            {" "}
            Offline Music Player Application for Android made with Jetpack
            Compose and Kotlin
          </h3>
          <h3>Features</h3>
          <ul>
            <li>View and play music files on the device</li>
            <li>
              Intuitive interface for controlling music playback, including
              notification controls for background playback
            </li>
          </ul>
        </div>

        <div className="project">
          <motion.h2
            className=""
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.25 }}
          >
            <a href={"https://github.com/JackAngione/Media-Platform"}>
              "Media Platform"
            </a>
          </motion.h2>
          <h3> Platform for uploading/downloading artistic media</h3>
          <p>
            {" "}
            Users can upload and view the content of others on the platform
          </p>
          <p> Video, audio, or imagery can be uploaded</p>
          <p>
            {" "}
            Users can download another users upload at the full original
            quality{" "}
          </p>
          <h3>Features</h3>
          <ul>
            <li>File server for storing the platform's media</li>
            <li>Create an account or view other users</li>
            <li>Upload/Download content to your device</li>
          </ul>
        </div>

        <div className="project">
          <motion.h2
            className=""
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.25 }}
          >
            <a href={"/resources"}>"Resources"</a>
          </motion.h2>
          <h3> A collection of tutorials/sources of topics I've come across</h3>
          <p>
            {" "}
            Allows for easy access to a quality source when referencing
            something I've previously learned
          </p>
          <p>
            The database can be conveniently searched by title, description,
            source link, or keywords and results can be filtered by
            category{" "}
          </p>
          <h3>Features</h3>
          <ul>
            <li>Closely interfaces with MongoDB database</li>
            <li>Utilities for uploading, editing, and deleting sources</li>
            <li>Create/edit/delete categories</li>
            <li>
              Search Resources with MeiliSearch/InstantSearch implementation
            </li>
          </ul>
          <p></p>
        </div>

        <div className="project">
          <motion.h2
            className=""
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.25 }}
          >
            <a href={"https://github.com/JackAngione/jack_chess_application"}>
              "Console Chess Game"
            </a>
          </motion.h2>
          <h3> Functional Java Chess game playable in the console</h3>
          <p>
            {" "}
            Enter piece coordinate and destination coordinate to move pieces
          </p>
          <p> WIP: No pawn promotion</p>
          <h3>Features</h3>
          <ul>
            <li>Only allows valid moves</li>
            <li>Check, Checkmate</li>
          </ul>
          <p></p>
        </div>
      </div>
    </>
  );
}

export default CodeProjects;
