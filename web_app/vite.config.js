import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import reactCompiler from "eslint-plugin-react-compiler";
import tsconfigPaths from "vite-tsconfig-paths";
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      "react-compiler": reactCompiler,
      rules: { "react-compiler/react-compiler": "error" },
    }),
    tailwindcss(),
    tsconfigPaths(),
  ],
  server: {
    host: "192.168.1.242",
  },
});
