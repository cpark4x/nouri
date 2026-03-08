import type { NextConfig } from "next";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// next-pwa ships CommonJS only; load via createRequire so this ESM config can use it
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  /* config options here */
};

// @ts-expect-error — next-pwa has no TypeScript declarations
export default withPWA(nextConfig);
