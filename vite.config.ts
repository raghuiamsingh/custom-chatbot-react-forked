import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import dts from "vite-plugin-dts";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    dts({
      include: ["src", "index.ts"],
      outDir: "dist",
      rollupTypes: false,
      tsconfigPath: "./tsconfig.declaration.json",
      entryRoot: ".",
    }),
  ],
  server: {
    proxy: {
      "/chat": "http://localhost:3001",
      "/suggestions": "http://localhost:3001",
      "/test-structured": "http://localhost:3001",
      "/debug-botdojo": "http://localhost:3001",
      "/health": "http://localhost:3001",
      "/encryption/public-key": "http://localhost:3001",
      '/product-info': 'http://localhost:3001',
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, "index.ts"),
      name: "custom-chatbot-react",
      fileName: (format) => `index.${format}.js`,
    },
    cssCodeSplit: true,
    rollupOptions: {
      // So that react and react-dom don't get bundled up
      external: ["react", "react-dom"],
      output: {
        globals: { react: "React", "react-dom": "ReactDOM" },
        assetFileNames: (assetInfo) => {
          // export all styles in index.css
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            return "index.css";
          }
          return assetInfo.name || "[name].[ext]";
        },
      },
    },
  },
});
