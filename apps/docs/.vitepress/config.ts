import { defineConfig } from "vitepress";
import llmstxt from "vitepress-plugin-llms";

export default defineConfig({
  vite: {
    // @ts-expect-error type mismatch with vite versions
    plugins: [llmstxt()],
  },
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
          { text: "SlopText", link: "/react/sloptext" },
          { text: "SlopVideo", link: "/react/slopvideo" },
        ],
      },
      {
        text: "Svelte",
        items: [
          { text: "SlopImage", link: "/svelte/slopimage" },
          { text: "SlopText", link: "/svelte/sloptext" },
          { text: "SlopVideo", link: "/svelte/slopvideo" },
        ],
      },
      {
        text: "Core API",
        items: [
          { text: "renderImage", link: "/api/render-image" },
          { text: "renderText", link: "/api/render-text" },
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
