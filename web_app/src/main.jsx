import React from 'react'
import ReactDOM from 'react-dom/client'
import ResourcesPage from './routes/resourcesPage.jsx'
import Upload from "./routes/upload.jsx";
import './main.css'
import ErrorPage from "./routes/error-page.jsx";
import NavigationBar from "./routes/navigationBar.jsx";
import {BrowserRouter, createBrowserRouter, Route, RouterProvider, Routes} from "react-router-dom";
import Category from "./routes/category.jsx";
import EditTutorial from "./routes/editTutorial.jsx";
import Homepage from "./routes/home.jsx";
import Home from "./routes/home.jsx";
import Projects from "./routes/projects.jsx";
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
              <Route path ="/projects" element={<Projects/>} />
              <Route path ="/resources" element={<ResourcesPage/>} />
              <Route path ="/upload" element={<Upload/>} />
              <Route path ="/category" element={<Category/>} />
          </Routes>
      </BrowserRouter>

  </React.StrictMode>,
)
