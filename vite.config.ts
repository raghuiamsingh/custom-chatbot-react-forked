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
      entry: path.resolve(__dirname, "src/web-component.tsx"),
      name: "chatbotWidget",
      fileName: "chatbot-widget",
    },
    rollupOptions: {
      // Ensure React is not bundled (host app provides it)
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
});
