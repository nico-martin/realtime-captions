import { defineConfig } from "vite";
import react from "@vitejs/plugin-react"; // https://vitejs.dev/config/
import svgr from "vite-plugin-svgr";
import postcssNesting from "postcss-nesting";
import postcssPresetEnv from "postcss-preset-env";
import autoprefixer from "autoprefixer";
import htmlPlugin from "vite-plugin-html-config";

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
          name: "description",
          content:
            "An example app of how we can use Transformers.js and WebGPU to run Whisper (whisper-base) directly in the browser to generate realtime captions.",
        },
      ],
    }),
  ],
});
