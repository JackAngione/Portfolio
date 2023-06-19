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
//TODO OLD ROUTER, SCHEDULED TO DELETE
/*const router = createBrowserRouter([
    {
        path: "/",
        element:<Upload/> ,
        errorElement: <ErrorPage />,
        children: [
            {
                path: "resources",
                element: <ResourcesPage/>
            },
            {
                path: "upload",
                element: <Upload/>
            },
            {
                path: "category",
                element: <Category/>
            }
        ],
    },
]);*/

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>

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

  </React.StrictMode>,
)
