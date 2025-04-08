import React, { Component } from "react";
import NavigationBar from "./routes/navigationBar.jsx";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import Home from "./routes/home.jsx";
import CodeProjects from "./skills/codeProjects.jsx";
import Music from "./skills/MUSIC/music.jsx";
import ResourcesPage from "./routes/resourcesPage.jsx";
import Upload from "./routes/upload.jsx";
import HDRPhotos from "./skills/hdrPhotos.jsx";
import AuthProvider from "./useAuth.jsx";
import GrainOverlay from "./GrainOverlay.jsx";
import Category from "./routes/category.jsx";
import { AdminRoute } from "./routes/adminRoute.jsx";
import * as path from "node:path";

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: (
        <>
          <AuthProvider>
            <GrainOverlay />
            <NavigationBar />
          </AuthProvider>
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
  ]);
  return (
    <>
      {/*<BrowserRouter>
        <AuthProvider>
          <GrainOverlay>
            <NavigationBar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="photography" element={<Photography />} />
              <Route path="hdrphotos" element={<HDRPhotos />} />
              <Route path="/code" element={<CodeProjects />} />
              <Route path="/music" element={<Music />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route
                path="/upload"
                element={
                  <AdminRoute>
                    <Upload />
                  </AdminRoute>
                }
              />
              <Route
                path="/category"
                element={
                  <AdminRoute>
                    <Category />
                  </AdminRoute>
                }
              />
            </Routes>
          </GrainOverlay>
        </AuthProvider>
      </BrowserRouter>*/}

      <RouterProvider router={router} />
    </>
  );
}
export default App;
