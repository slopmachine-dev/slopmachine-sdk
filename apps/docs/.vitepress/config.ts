import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Slop Machine SDK",
  description: "Documentation for @slopmachine/react and @slopmachine/svelte",
  base: "/slopmachine-sdk/",
  outDir: ".vitepress/dist",
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Getting Started", link: "/getting-started" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [{ text: "Getting Started", link: "/getting-started" }],
      },
      {
        text: "React",
        items: [{ text: "SlopImage", link: "/react/slopimage" }],
      },
      {
        text: "Svelte",
        items: [{ text: "SlopImage", link: "/svelte/slopimage" }],
      },
      {
        text: "Core API",
        items: [{ text: "renderImage", link: "/api/render-image" }],
      },
    ],
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/slopmachine/slopmachine-sdk",
      },
    ],
  },
});
