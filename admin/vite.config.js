import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config({ path: "../.env" });

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: process.env.VITE_APP_ADMIN_PORT || 3001,
    proxy: {
      "/api": {
        target: process.env.VITE_APP_SERVER_URL || "http://server:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    // Single CSS file preserves entry import order (Bootstrap → theme).
    // With cssCodeSplit + ui-vendor manualChunks, Bootstrap CSS loaded AFTER
    // theme and overwrote --bs-* tokens in production. Do not re-enable
    // without verifying theme :root wins over Bootstrap.
    cssCodeSplit: false,
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        // JS-only splitting. Do not let Bootstrap CSS load after theme.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (
            id.includes("react") ||
            id.includes("react-dom") ||
            id.includes("react-router")
          ) {
            return "react-vendor";
          }
          if (id.includes("redux") || id.includes("@reduxjs/toolkit")) {
            return "redux-vendor";
          }
          if (id.includes("react-bootstrap") || id.includes("bootstrap")) {
            return "ui-vendor";
          }
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
    },
  },
  resolve: {
    extensions: [".js", ".jsx", ".json"],
    alias: {
      "@src": "/src",
      "@assets": "/src/assets",
      "@actions": "/src/actions",
      "@middlewares": "/src/middlewares",
      "@config": "/src/config",
      "@reducers": "/src/reducers",
      "@utils": "/src/utils",
      "@user": "/src/view/user",
    },
  },
});
