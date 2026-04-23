import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, "index.html"),
        admin: resolve(__dirname, "admin.html"),
        builder: resolve(__dirname, "builder.html"),
        version1Redirect: resolve(__dirname, "version-1.html"),
        version2Redirect: resolve(__dirname, "version-2.html"),
        mentionsLegales: resolve(__dirname, "mentions-legales.html"),
        politiqueConfidentialite: resolve(__dirname, "politique-confidentialite.html"),
        politiqueCookies: resolve(__dirname, "politique-cookies.html"),
        cguCgv: resolve(__dirname, "cgu-cgv.html")
      }
    }
  }
});
