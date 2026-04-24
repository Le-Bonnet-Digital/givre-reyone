import {
  generateHeroAssets,
  getRepoRoot,
  readPublishedHomepageSource
} from "./lib/version1-homepage-build.mjs";

const root = getRepoRoot(import.meta.url);
const documentSource = await readPublishedHomepageSource(root);
const result = await generateHeroAssets(root, documentSource);

console.log("Generated hero assets from", result.heroSource);
for (const outputPath of result.outputs) {
  console.log("Wrote", outputPath);
}
