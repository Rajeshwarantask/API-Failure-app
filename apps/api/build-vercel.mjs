import { build as esbuild } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rm, mkdir, rename } from "node:fs/promises";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

const entryPoint = path.resolve(
  artifactDir,
  "src/index-vercel.ts"
);

const tempDir = path.resolve(
  artifactDir,
  "../../.vercel-api-build"
);

const outputDir = path.resolve(
  artifactDir,
  "../../api"
);

await rm(tempDir, {
  recursive: true,
  force: true,
});

await rm(outputDir, {
  recursive: true,
  force: true,
});

await mkdir(tempDir, {
  recursive: true,
});

await esbuild({
  entryPoints: [entryPoint],

  platform: "node",

  bundle: true,

  format: "esm",

  outdir: tempDir,

  sourcemap: "linked",

  logLevel: "info",

  external: [
    "*.node",
    "sharp",
    "better-sqlite3",
    "sqlite3",
    "canvas",
    "bcrypt",
    "argon2"
  ],

  banner: {
    js: `
import { createRequire as __bannerCrReq } from "node:module";
const require = __bannerCrReq(import.meta.url);
globalThis.require = require;
`
  }
});

await mkdir(outputDir, {
  recursive: true
});

await rename(
  path.join(tempDir, "index-vercel.mjs"),
  path.join(outputDir, "index.mjs")
);

await rm(tempDir, {
  recursive: true,
  force: true
});

console.log("✓ Vercel API bundle created:");
console.log("  api/index.mjs");
