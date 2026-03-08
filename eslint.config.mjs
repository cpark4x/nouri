import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Git worktrees — generated .next/ type files must not be linted
    ".worktrees/**",
    // next-pwa generates these service-worker bundles into public/ at build time
    "public/sw.js",
    "public/sw.js.map",
    "public/workbox-*.js",
    "public/workbox-*.js.map",
  ]),
]);

export default eslintConfig;
