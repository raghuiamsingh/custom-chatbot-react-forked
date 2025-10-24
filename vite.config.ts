import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/chat": "http://localhost:3001",
      "/suggestions": "http://localhost:3001",
      "/test-structured": "http://localhost:3001",
      "/debug-botdojo": "http://localhost:3001",
      "/health": "http://localhost:3001",
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, "index.ts"),
      name: "botdojo-custom-chat",
      fileName: (format) => `index.${format}.js`,
    },
    cssCodeSplit: true,
    rollupOptions: {
      external: ["react", "react-dom"],
      output: {
        globals: { react: "React", "react-dom": "ReactDOM" },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            return "index.css";
          }
          return assetInfo.name || "[name].[ext]";
        },
      },
    },
  },
});
