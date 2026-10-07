import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import("@sveltejs/vite-plugin-svelte").SvelteConfig} */
export default {
  // Used by svelte-package when building dist/. Svelte 5 compiles TypeScript in
  // components natively, so .svelte files keep lang="ts"; .ts files become .js + .d.ts.
  preprocess: vitePreprocess(),
};
