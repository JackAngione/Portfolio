import React, { Suspense, lazy } from "react";
import NavigationBar from "./routes/navigationBar.jsx";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import Home from "./routes/home.jsx";
import AuthProvider from "./useAuth.jsx";

import { AdminRoute } from "./routes/adminRoute.jsx";
import { HeroUIProvider } from "@heroui/react";
import CommandK from "./routes/commandK.jsx";
import FilmGrain from "./FilmGrain.jsx";
import EpilepsyWarningModal from "./routes/modals/epilepsyWarningModal.jsx";

const CodeProjects = lazy(() => import("./skills/codeProjects.jsx"));
const Music = lazy(() => import("./skills/MUSIC/music.jsx"));
const ResourcesPage = lazy(() => import("./routes/resourcesPage.jsx"));
const Upload = lazy(() => import("./routes/upload.jsx"));
const HDRPhotos = lazy(() => import("./skills/hdrPhotos.jsx"));
const PhotoCategory = lazy(() => import("./skills/PhotoCategory.jsx"));
const Category = lazy(() => import("./routes/category.jsx"));
const Filters2ProQ = lazy(() => import("./skills/Filters2ProQ.jsx"));

function withSuspense(Component) {
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}

function App() {
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
        { path: "/hdrphotos", element: withSuspense(HDRPhotos) },
        { path: "/hdrphotos/:category", element: withSuspense(PhotoCategory) },
        { path: "/code", element: withSuspense(CodeProjects) },
        { path: "/music", element: withSuspense(Music) },
        {
          path: "/resources",
          children: [
            { index: true, element: withSuspense(ResourcesPage) },
            {
              path: "upload",
              element: (
                <AdminRoute>
                  <Suspense fallback={null}>
                    <Upload />
                  </Suspense>
                </AdminRoute>
              ),
            },
            {
              path: "category",
              element: (
                <AdminRoute>
                  <Suspense fallback={null}>
                    <Category />
                  </Suspense>
                </AdminRoute>
              ),
            },
          ],
        },
        { path: "/f2q", element: withSuspense(Filters2ProQ) },
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
