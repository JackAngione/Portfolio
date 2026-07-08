import React from "react";
import NavigationBar from "./routes/navigationBar.jsx";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import Home from "./routes/home.jsx";
import CodeProjects from "./skills/codeProjects.jsx";
import Music from "./skills/MUSIC/music.jsx";
import ResourcesPage from "./routes/resourcesPage.jsx";
import Upload from "./routes/upload.jsx";
import HDRPhotos from "./skills/hdrPhotos.jsx";
import PhotoCategory from "./skills/PhotoCategory.jsx";
import AuthProvider from "./useAuth.jsx";

import Category from "./routes/category.jsx";
import { AdminRoute } from "./routes/adminRoute.jsx";
import { HeroUIProvider } from "@heroui/react";
import CommandK from "./routes/commandK.jsx";
import FilmGrain from "./FilmGrain.jsx";
import Filters2ProQ from "./skills/Filters2ProQ.jsx";
import EpilepsyWarningModal from "./routes/modals/epilepsyWarningModal.jsx";

//created once at module scope so the router (and its state) is never rebuilt
//by a re-render of App
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <>
        <EpilepsyWarningModal />
        <HeroUIProvider>
          <AuthProvider>
            <CommandK>
              <FilmGrain>
                <NavigationBar />
              </FilmGrain>
            </CommandK>
          </AuthProvider>
        </HeroUIProvider>
      </>
    ),
    children: [
      { index: true, Component: Home },
      { path: "/hdrphotos", Component: HDRPhotos },
      { path: "/hdrphotos/:category", Component: PhotoCategory },
      { path: "/code", Component: CodeProjects },
      { path: "/music", Component: Music },
      {
        path: "/resources",
        children: [
          { index: true, Component: ResourcesPage },
          {
            path: "upload",
            element: (
              <AdminRoute>
                <Upload />
              </AdminRoute>
            ),
          },
          {
            path: "category",
            element: (
              <AdminRoute>
                <Category />
              </AdminRoute>
            ),
          },
        ],
      },
      { path: "/f2q", Component: Filters2ProQ },
      /*{
          path: "upload",
          element: (
            <AdminRoute>
              <Upload />
            </AdminRoute>
          ),
        },
        {
          path: "category",
          element: (
            <AdminRoute>
              <Category />
            </AdminRoute>
          ),
        },*/
    ],
  },
  {
    //re-routes any invalid paths to homepage
    path: "*",
    element: <Navigate to="/" />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
