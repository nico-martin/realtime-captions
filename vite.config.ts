import { defineConfig } from "vite";
import react from "@vitejs/plugin-react"; // https://vitejs.dev/config/
import svgr from "vite-plugin-svgr";
import postcssNesting from "postcss-nesting";
import postcssPresetEnv from "postcss-preset-env";
import autoprefixer from "autoprefixer";
import htmlPlugin from "vite-plugin-html-config";

const app = {
  title: "Realtime Captions",
  description:
    "An example app of how we can use Transformers.js and WebGPU to run Whisper (whisper-base) directly in the browser to generate realtime captions.",
};

export default defineConfig({
  css: {
    postcss: {
      plugins: [postcssNesting, autoprefixer, postcssPresetEnv],
    },
  },
  plugins: [
    react(),
    svgr(),
    htmlPlugin({
      title: "Realtime Captions",
      metas: [
        {
          name: app.title,
          content: app.description,
        },
        {
          name: "og:image",
          content: "/facebook.jpg",
        },
        {
          name: "og:title",
          content: app.title,
        },
        {
          name: "og:description",
          content: app.description,
        },
        {
          name: "og:locale",
          content: "en_US",
        },
        {
          name: "og:type",
          content: "website",
        },
        {
          name: "twitter:card",
          content: "summary_large_image",
        },
        {
          name: "twitter:creator",
          content: "@nic_o_martin",
        },
        {
          name: "twitter:title",
          content: app.title,
        },
        {
          name: "twitter:description",
          content: app.description,
        },
        {
          name: "twitter:image",
          content: "/twitter.jpg",
        },
      ],
    }),
  ],
});
