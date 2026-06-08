#!/usr/bin/env node
import { readFile, readdir, writeFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const isWriteMode = process.argv.includes("--write");
const rootDir = new URL("../", import.meta.url);
const pagesDir = new URL("../src/data/pages/", import.meta.url);
const tempDir = new URL("../.tmp-cf-migration/", import.meta.url);
const tempDirPath = fileURLToPath(tempDir);
const namespace = process.env.CF_BUILDER_KV_NAMESPACE || "BUILDER_KV";
const r2Bucket = process.env.CF_BUILDER_R2_BUCKET || "BUILDER_R2";

function runCmd(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: "pipe",
      shell: process.platform === "win32"
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed (${code})\n${stderr || stdout}`));
      }
    });
  });
}

function buildPointer(page, timestamp) {
  const key = `builder/${page}/draft-${timestamp}.json`;
  return {
    key,
    pointer: {
      draft: {
        url: `r2://${key}`,
        pathname: key,
        updatedAt: new Date(timestamp).toISOString(),
        publishedAt: null
      },
      published: null
    }
  };
}

async function getPages() {
  const files = await readdir(pagesDir);
  return files.filter((name) => name.endsWith(".json")).map((name) => name.replace(".json", ""));
}

async function migratePage(page) {
  const raw = await readFile(new URL(`../src/data/pages/${page}.json`, import.meta.url), "utf8");
  const timestamp = Date.now();
  const { key, pointer } = buildPointer(page, timestamp);
  const tempFile = join(tempDirPath, `${page}.json`);
  await writeFile(tempFile, raw, "utf8");

  if (!isWriteMode) {
    return { page, key, pointer, skipped: true };
  }

  await runCmd("npx", ["wrangler", "r2", "object", "put", `${r2Bucket}/${key}`, "--file", tempFile]);
  await runCmd("npx", [
    "wrangler",
    "kv",
    "key",
    "put",
    "--binding",
    namespace,
    `builder:${page}`,
    JSON.stringify(pointer)
  ]);

  return { page, key, pointer, skipped: false };
}

async function main() {
  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });
  await writeFile(new URL("../.tmp-cf-migration/.gitkeep", import.meta.url), "", "utf8");
  const pages = await getPages();
  const results = [];

  for (const page of pages) {
    const result = await migratePage(page);
    results.push(result);
  }

  const migrated = results.filter((entry) => !entry.skipped).length;
  const mode = isWriteMode ? "WRITE" : "DRY-RUN";
  console.log(`[cloudflare-migration] Mode: ${mode}`);
  console.log(`[cloudflare-migration] Pages found: ${pages.length}`);
  console.log(`[cloudflare-migration] Pages migrated: ${migrated}`);
  for (const entry of results) {
    console.log(`- ${entry.page}: ${entry.key}${entry.skipped ? " (dry-run)" : ""}`);
  }

  if (isWriteMode) {
    const list = await runCmd("npx", ["wrangler", "kv", "key", "list", "--binding", namespace]);
    console.log("[cloudflare-migration] KV key list:");
    console.log(list.stdout.trim());
  }
}

main().catch((error) => {
  console.error("[cloudflare-migration] Failed:", error.message);
  process.exitCode = 1;
});
