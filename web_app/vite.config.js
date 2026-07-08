import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import reactCompiler from "eslint-plugin-react-compiler";
import tsconfigPaths from "vite-tsconfig-paths";
// https://vitejs.dev/config/
export default defineConfig({
  fmt: {
    sortTailwindcss: {},
    printWidth: 80,
    sortPackageJson: false,
    ignorePatterns: [],
  },
  lint: {
    plugins: ["eslint", "typescript", "unicorn", "oxc", "react"],
    ignorePatterns: ["dist/**"],
  },
  plugins: [
    react({
      "react-compiler": reactCompiler,
      rules: { "react-compiler/react-compiler": "error" },
    }),
    tailwindcss(),
    tsconfigPaths(),
  ],
  server: {
    host: "0.0.0.0",
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            const match = id.match(
              /node_modules\/(\.pnpm\/)?(@[^/]+\/[^/]+|[^/]+)/,
            );
            const pkg = match?.[2]?.replace("@", "");
            return `vendor-${pkg}`;
          }
        },
      },
    },
  },
});
