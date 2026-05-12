import { defineConfig } from "vitepress";
import llmstxt from "vitepress-plugin-llms";

export default defineConfig({
  head: [
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    [
      "link",
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
    ],
    [
      "link",
      {
        href: "https://fonts.googleapis.com/css2?family=Rubik+Wet+Paint&display=swap",
        rel: "stylesheet",
      },
    ],
    [
      "link",
      {
        href: "https://fonts.googleapis.com/css2?family=Rubik+Dirt&display=swap",
        rel: "stylesheet",
      },
    ],
    [
      "link",
      {
        href: "https://fonts.googleapis.com/css2?family=Special+Elite&display=swap",
        rel: "stylesheet",
      },
    ],
    [
      "link",
      {
        rel: "icon",
        href: "https://slopmachine.dev//favicon-light/favicon.ico",
        media: "(prefers-color-scheme: light)",
      },
    ],
    [
      "link",
      {
        rel: "icon",
        href: "https://slopmachine.dev/favicon-dark/favicon.ico",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  ],
  vite: {
    // @ts-expect-error type mismatch with vite versions
    plugins: [llmstxt()],
  },
  title: "Slop Machine for Developers",
  description: "Documentation for Slop Machine Developer Tools",
  base: "/slopmachine-sdk/",
  outDir: ".vitepress/dist",
  appearance: "force-auto",
  themeConfig: {
    siteTitle: "Slop Machine",
    nav: [
      { text: "Slop Machine", link: "https://slopmachine.dev" },
      { text: "Getting Started", link: "/getting-started" },
      { text: "React Demo", link: "/demo-react/" },
      { text: "Svelte Demo", link: "/demo-svelte/" },
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
