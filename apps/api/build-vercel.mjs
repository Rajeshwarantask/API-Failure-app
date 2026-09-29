import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

const entryPoint = path.resolve(artifactDir, "src/vercel.ts");
const outputFile = path.resolve(artifactDir, "../../api/index.mjs");

await esbuild({
  entryPoints: [entryPoint],

  platform: "node",
  bundle: true,
  format: "esm",

  outfile: outputFile,

  sourcemap: "linked",

  logLevel: "info",

  plugins: [
    esbuildPluginPino({
      transports: ["pino-pretty"],
    }),
  ],

  external: [
    "*.node",
    "sharp",
    "better-sqlite3",
    "sqlite3",
    "canvas",
    "bcrypt",
    "argon2",
  ],

  banner: {
    js: `
import { createRequire as __bannerCrReq } from 'node:module';
const require = __bannerCrReq(import.meta.url);
globalThis.require = require;
`,
  },
});

console.log(`Vercel API bundle created: ${outputFile}`);
