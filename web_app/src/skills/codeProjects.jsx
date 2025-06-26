import { motion } from "motion/react";
import "./codeProjects.css";
import CodeMarquee from "./CodeMarquee.jsx";
import { website_address } from "../serverInfo.jsx";

function CodeProjects() {
  return (
    <div className="justify-center">
      <div className="fixed inset-0 flex items-center justify-center blur-xs">
        <CodeMarquee columns={10}></CodeMarquee>
      </div>
      <h1 className="my-14 mix-blend-difference">CODING PROJECTS</h1>

      <div className="flex flex-col items-center justify-center">
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
              href={website_address + "/f2q"}
              target="_blank"
              rel="noopener noreferrer"
            >
              Filters<sub>2</sub>ProQ
            </a>
          </motion.h2>
          <h2></h2>
          <h3>Generate a FabFilter Pro-Q4 Preset From Parametric EQ Filters</h3>
          <p>MacOS App created with Swift </p>

          <h3>Features</h3>
          <ul>
            <li>
              Correct frequency response of headphones or individual L/R speaker
              channels
            </li>
            <li>Convert REW or AutoEQ filter files to a Pro-Q4 preset</li>
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
          <h3> Offline Music Player Application for Android</h3>
          <p>Made with Jetpack Compose and Kotlin</p>
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
            <a
              href={"https://github.com/JackAngione/Media-Platform"}
              target="_blank"
            >
              "Media Platform"
            </a>
          </motion.h2>
          <h3> Platform for uploading/downloading artistic media</h3>
          <p>
            {" "}
            Users can upload and view the content (video, audio, or images) of
            others on the platform
          </p>
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
          <h3> A collection of informative resources</h3>
          <p>
            {" "}
            Allows for easy access to quality sources from a broad range of
            topics.
          </p>

          <h3>Features</h3>
          <ul>
            <li>Closely interfaces with MongoDB database</li>
            <li>
              Admin utilities for uploading, editing, and deleting resources
            </li>
            <li>Create/edit/delete categories</li>
            <li>
              Comprehensively search Resources with MeiliSearch/InstantSearch
              implementation
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
            <a
              href={"https://github.com/JackAngione/jack_chess_application"}
              target="_blank"
            >
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
            <li>Move Validation</li>
            <li>Check, Checkmate</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default CodeProjects;
