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
import fs from "fs/promises";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "generate-index-for-widget",
      apply: "build",
      async writeBundle(_, bundle) {
        const outDir = "dist";
        const files = Object.values(bundle);
        const jsFile = files.find(f => f.fileName.endsWith(".js"))?.fileName;
        const cssFile = files.find(f => f.fileName.endsWith(".css"))?.fileName;
        const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Chatbot Widget Demo</title>
    ${cssFile ? `<link rel="stylesheet" href="./${cssFile}">` : ""}
  </head>
  <body>
    <div id="chatbot-root"></div>
    <script src="./${jsFile}"></script>
  </body>
</html>`;
        await fs.writeFile(path.join(outDir, "index.html"), html);
      },
    },
  ],

  define: {
    // 👇 this line fixes the `process is not defined` error
    "process.env": {},
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: "src/widget.tsx",
      name: "ChatbotWidget",
      fileName: () => "chatbot-widget.js",
      formats: ["iife"],
    },
  },

  server: {
    allowedHosts: [".ngrok-free.app", "localhost"],
  },
});
  