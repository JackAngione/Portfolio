
import "./codeProjects.css"
function CodeProjects() {

    return (
        <>
            <h1>PROGRAMMING PROJECTS</h1>
            <div id="projects">
                <div className="project">
                    <h1><a href={"https://github.com/JackAngione/TheMiddlePlace"} target="_blank" rel="noopener noreferrer">The Middle Place</a></h1>
                    <h4>Algorithmic NFT Artwork</h4>
                    <p>A collaboration with artist Josh Landis to create a line of algorithmic NFTs</p>
                    <p> Used Canvas in Javascript to render out generated combinations of components to a final image file.</p>
                    <p> Canvas also allowed me to interactively display the artwork on a website. Each component of the art can be swapped out with sliders to view the various combinations. </p>
                    <h4>Features</h4>
                    <ul>
                        <li>
                            Interactively view all possible combinations of the artwork components
                        </li>
                        <li>
                            Buy NFT
                        </li>
                    </ul>
                </div>

                <div className="project">
                    <h1> <a href={"https://github.com/JackAngione/MuZe"} target="_blank" rel="noopener noreferrer">MuZe</a> </h1>
                    <h4> Offline Music Player Application for Android made with Jetpack Compose and Kotlin</h4>
                    <h4>Features</h4>
                    <ul>
                        <li>
                            View and play music files on the device
                        </li>
                        <li>
                            Intuitive interface for controlling music playback, including notification controls for background playback
                        </li>
                    </ul>
                </div>

                <div className="project">
                    <h1><a href={"/resources"} >"Resources"</a></h1>
                    <h4> A collection of tutorials/sources of topics I've come across</h4>
                    <p> Allows for the easy access of information when I need to reference something I've previously regarded as a quality source for the topic</p>
                    <p>The database can be conveniently searched by title, description, source link, or keywords and results can be filtered by category </p>
                    <h4>Features</h4>
                    <ul>
                        <li>
                            Closely interfaces with MongoDB database
                        </li>
                        <li>
                            Utilities for uploading, editing, and deleting sources
                        </li>
                        <li>
                            Create/edit/delete categories
                        </li>
                    </ul>
                    <p></p>
                </div>
            </div>

        </>
    )



}
export default CodeProjects