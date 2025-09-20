// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })
// vite.config.ts
// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";

// export default defineConfig({
//   plugins: [react()],
//   build: {
//     outDir: "dist",
//     lib: {
//       // just give the relative path directly
//       entry: "src/widget.tsx",
//       name: "ChatbotWidget",
//       fileName: () => "chatbot-widget.js",
//       formats: ["iife"],
//     },
//   },
// });
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    lib: {
      // just give the relative path directly
      entry: "src/widget.tsx",
      name: "ChatbotWidget",
      fileName: () => "chatbot-widget.js",
      formats: ["iife"],
    },
  },
  server: {
    allowedHosts: [
      '.ngrok-free.app', // allow all ngrok subdomains
      'localhost'         // keep localhost allowed
    ]
  }
});
  