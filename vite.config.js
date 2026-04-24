import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Avoid closing the HTML <style> tag if the CSS text contains `</style`. */
function escapeCssForEmbeddedStyle(css) {
  return css.replace(/<\/style/gi, "\\3C /style");
}

function v1PublishedHomepage() {
  return {
    name: "v1-published-homepage",
    transformIndexHtml(html) {
      let out = html;
      const markerCss = "<!--V1_SEED_CUSTOM_CSS-->";
      if (out.includes(markerCss)) {
        const cssPath = join(__dirname, "src/fragments/v1-seed-custom.css");
        if (!existsSync(cssPath)) {
          throw new Error(`[v1-seed-custom-css] Missing ${cssPath}. Run: node scripts/emit-v1-hero-fragment.mjs`);
        }

        const escaped = escapeCssForEmbeddedStyle(readFileSync(cssPath, "utf8"));
        out = out.replace(
          markerCss,
          `<style id="page-custom-css" data-v1-seed-css="1">\n${escaped}\n</style>`
        );
      }

      if (!out.includes("<!--V1_PUBLISHED_HOMEPAGE-->")) {
        return out;
      }

      const fragmentPath = join(__dirname, "src/fragments/v1-homepage-published.html");
      if (!existsSync(fragmentPath)) {
        throw new Error(
          `[v1-homepage-published] Missing ${fragmentPath}. Run: node scripts/emit-v1-hero-fragment.mjs`
        );
      }

      const fragment = readFileSync(fragmentPath, "utf8").trim();
      return out.replace("<!--V1_PUBLISHED_HOMEPAGE-->", fragment);
    }
  };
}

/**
 * Injects <link rel="preload"> for critical home-page fonts into index.html at build time,
 * so the browser discovers them before any JS runs (earlier than JS-created preloads).
 */
function v1FontPreloads() {
  const FONT_RE = /dm-sans-latin-(400|500)-normal|playfair-display-latin-900-normal/;
  let fontHrefs = [];

  return {
    name: "v1-font-preloads",
    apply: "build",
    generateBundle(_, bundle) {
      fontHrefs = Object.keys(bundle)
        .filter((name) => FONT_RE.test(name) && name.endsWith(".woff2"))
        .map((name) => `/${name}`);
    },
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        if (!ctx.filename.endsWith("index.html")) return html;
        if (!fontHrefs.length) return html;
        const tags = fontHrefs.map((href) => ({
          tag: "link",
          attrs: { rel: "preload", as: "font", type: "font/woff2", crossorigin: "", href },
          injectTo: "head"
        }));
        return { html, tags };
      }
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
  plugins: [v1PublishedHomepage(), v1FontPreloads()],
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
