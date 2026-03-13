import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Slop Machine for Developers",
  description: "Documentation for Slop Machine Developer Tools",
  base: "/slopmachine-sdk/",
  outDir: ".vitepress/dist",
  themeConfig: {
    nav: [
      { text: "Slop Machine", link: "https://slopmachine.dev" },
      { text: "For Developers", link: "/" },
      { text: "Getting Started", link: "/getting-started" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [{ text: "Getting Started", link: "/getting-started" }],
      },
      {
        text: "React",
        items: [
          { text: "SlopImage", link: "/react/slopimage" },
          { text: "SlopVideo", link: "/react/slopvideo" },
        ],
      },
      {
        text: "Svelte",
        items: [
          { text: "SlopImage", link: "/svelte/slopimage" },
          { text: "SlopVideo", link: "/svelte/slopvideo" },
        ],
      },
      {
        text: "Core API",
        items: [
          { text: "renderImage", link: "/api/render-image" },
          { text: "renderVideo", link: "/api/render-video" },
        ],
      },
    ],
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/slopmachine-dev/slopmachine-sdk",
      },
    ],
  },
});
