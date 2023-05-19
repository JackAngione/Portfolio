import React from 'react'
import ReactDOM from 'react-dom/client'
import Homepage from './homepage.jsx'
import Upload from "./upload.jsx";
import './main.css'
import ErrorPage from "./error-page.jsx";
import NavigationBar from "./navigationBar.jsx";
import {createBrowserRouter, RouterProvider} from "react-router-dom";

const router = createBrowserRouter([
    {
        path: "/",
        element: <NavigationBar />,
        errorElement: <ErrorPage />,
        children: [
            {
                path: "homepage",
                element: <Homepage/>
            },
            {
                path: "upload",
                element: <Upload/>
            }
        ],
    },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
      <RouterProvider router={router} />
  </React.StrictMode>,
)
