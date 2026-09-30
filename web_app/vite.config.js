import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
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
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
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
