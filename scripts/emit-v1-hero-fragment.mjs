import {
  buildPublishedHomepageArtifacts,
  getRepoRoot
} from "./lib/version1-homepage-build.mjs";

const root = getRepoRoot(import.meta.url);
const result = await buildPublishedHomepageArtifacts(root);

console.log("emit-v1-homepage: using published Git document from src/data/pages/version-1.json");
console.log("emit-v1-homepage: hero source", result.hero.heroSource);
for (const outputPath of result.hero.outputs) {
  console.log("Wrote", outputPath);
}
console.log("Wrote", result.fragmentPath, `(${result.prepared.html.length} bytes)`);
console.log("Wrote", result.cssPath, `(${(result.prepared.css || "").length} bytes)`);
