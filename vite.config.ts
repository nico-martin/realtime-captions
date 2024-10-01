import { defineConfig } from "vite";
import react from "@vitejs/plugin-react"; // https://vitejs.dev/config/
import svgr from "vite-plugin-svgr";
import postcssNesting from "postcss-nesting";
import postcssPresetEnv from "postcss-preset-env";
import autoprefixer from "autoprefixer";

export default defineConfig({
  css: {
    postcss: {
      plugins: [postcssNesting, autoprefixer, postcssPresetEnv],
    },
  },
  plugins: [react(), svgr()],
});
