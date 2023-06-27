import React from 'react'
import ReactDOM from 'react-dom/client'
import ResourcesPage from './routes/resourcesPage.jsx'
import Upload from "./routes/upload.jsx";
import './main.css'
import ErrorPage from "./routes/error-page.jsx";
import NavigationBar from "./routes/navigationBar.jsx";
import {BrowserRouter, createBrowserRouter, Route, RouterProvider, Routes} from "react-router-dom";
import Category from "./routes/category.jsx";

import Home from "./routes/home.jsx";
import CodeProjects from "./skills/codeProjects.jsx";

import Photography from "./skills/photography.jsx";
import Music from "./skills/music.jsx";
import App from "./app.jsx";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>

    <App/>

  </React.StrictMode>,
)
