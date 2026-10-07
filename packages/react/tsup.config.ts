import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  // Components use hooks, so mark the bundle as client-only for React Server
  // Components (e.g. Next.js App Router). esbuild drops source-level directives
  // when bundling, so it has to be added as a banner.
  banner: { js: '"use client";' },
});
