import React, {useEffect, useState} from "react";
import NavigationBar from "./routes/navigationBar.jsx";
import {BrowserRouter, Route, Routes, useLocation} from "react-router-dom";
import Home from "./routes/home.jsx";
import Photography from "./skills/photography.jsx";
import CodeProjects from "./skills/codeProjects.jsx";
import Music from "./skills/MUSIC/music.jsx";
import ResourcesPage from "./routes/resourcesPage.jsx";
import Upload from "./routes/upload.jsx";
import Category from "./routes/category.jsx";
import "./app.css"

function App() {
    return (
        <>
                <BrowserRouter>
                    <NavigationBar />
                        <Routes>
                            <Route path ="/" element={<Home/>} />
                            <Route path= "photography" element={<Photography/>}/>
                            <Route path ="/code" element={<CodeProjects/>} />
                            <Route path ="/music" element={<Music/>} />
                            <Route path ="/resources" element={<ResourcesPage/>} />
                            <Route path ="/upload" element={<Upload/>} />
                            <Route path ="/category" element={<Category/>} />
                        </Routes>
                </BrowserRouter>
        </>
    )
}
export default App