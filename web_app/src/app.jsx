import React from "react";
import NavigationBar from "./routes/navigationBar.jsx";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import Home from "./routes/home.jsx";
import CodeProjects from "./skills/codeProjects.jsx";
import Music from "./skills/MUSIC/music.jsx";
import ResourcesPage from "./routes/resourcesPage.jsx";
import Upload from "./routes/upload.jsx";
import HDRPhotos from "./skills/hdrPhotos.jsx";
import AuthProvider from "./useAuth.jsx";

import Category from "./routes/category.jsx";
import { AdminRoute } from "./routes/adminRoute.jsx";
import { HeroUIProvider } from "@heroui/react";
import CommandK from "./routes/commandK.jsx";
import GrainCanvas from "./GrainCanvas.jsx";

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: (
        <>
          <HeroUIProvider>
            <AuthProvider>
              <CommandK>
                <GrainCanvas>
                  {/*   <FilmGrainScene>*/}
                  {/* <SVGGRAIN>*/}
                  <NavigationBar />
                  {/*  </SVGGRAIN>*/}
                  {/*  </FilmGrainScene>*/}
                </GrainCanvas>
              </CommandK>
            </AuthProvider>
          </HeroUIProvider>
        </>
      ),
      children: [
        { index: true, Component: Home },
        { path: "/hdrphotos", Component: HDRPhotos },
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
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;
