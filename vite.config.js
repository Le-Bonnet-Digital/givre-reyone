import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Avoid closing the HTML <style> tag if the CSS text contains `</style`. */
function escapeCssForEmbeddedStyle(css) {
  return css.replace(/<\/style/gi, "\\3C /style");
}

function v1AboveFoldPrerender() {
  return {
    name: "v1-above-fold-prerender",
    transformIndexHtml(html) {
      let out = html;
      const markerCss = "<!--V1_SEED_CUSTOM_CSS-->";
      if (out.includes(markerCss)) {
        const cssPath = join(__dirname, "src/fragments/v1-seed-custom.css");
        let seedCss = "";
        if (existsSync(cssPath)) {
          seedCss = readFileSync(cssPath, "utf8");
        } else {
          console.warn(
            "[v1-seed-custom-css] Missing",
            cssPath,
            "— run: node scripts/emit-v1-hero-fragment.mjs"
          );
        }
        const escaped = escapeCssForEmbeddedStyle(seedCss);
        out = out.replace(
          markerCss,
          `<style id="page-custom-css" data-v1-seed-css="1">\n${escaped}\n</style>`
        );
      }

      if (!out.includes("<!--V1_ABOVE_FOLD_PRERENDER-->")) {
        return out;
      }
      const fragmentPath = join(__dirname, "src/fragments/v1-above-fold-prerender.html");
      if (!existsSync(fragmentPath)) {
        console.warn(
          "[v1-above-fold-prerender] Missing",
          fragmentPath,
          "— run: node scripts/emit-v1-hero-fragment.mjs"
        );
        return out.replace("<!--V1_ABOVE_FOLD_PRERENDER-->", "");
      }
      const fragment = readFileSync(fragmentPath, "utf8").trim();
      return out.replace("<!--V1_ABOVE_FOLD_PRERENDER-->", fragment);
    }
  };
}

function grapesManualChunk(id) {
  const n = id.replaceAll("\\", "/");
  if (n.includes("grapesjs-preset-webpage")) {
    return "grapes-preset";
  }
  if (n.includes("node_modules/grapesjs/")) {
    return "grapes";
  }
  return undefined;
}

export default defineConfig({
  plugins: [v1AboveFoldPrerender()],
  build: {
    // GrapesJS core minifies to ~1 MB; it is code-split from the builder entry; limit avoids noisy false positives.
    chunkSizeWarningLimit: 1200,
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
      },
      output: {
        manualChunks(id) {
          return grapesManualChunk(id);
        }
      }
    }
  }
});
