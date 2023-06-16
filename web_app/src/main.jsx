import React from 'react'
import ReactDOM from 'react-dom/client'
import Homepage from './routes/homepage.jsx'
import Upload from "./routes/upload.jsx";
import './main.css'
import ErrorPage from "./routes/error-page.jsx";
import NavigationBar from "./routes/navigationBar.jsx";
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import Category from "./routes/category.jsx";
import EditTutorial from "./routes/editTutorial.jsx";

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
            },
            {
                path: "editTutorial",
                element: <EditTutorial/>
            },
            {
                path: "category",
                element: <Category/>
            }
        ],
    },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
      <RouterProvider router={router} />
  </React.StrictMode>,
)
