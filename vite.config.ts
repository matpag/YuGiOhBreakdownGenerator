import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/YuGiOhBreakdownGenerator/",
  server: {
    port: 5174,
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vendor-react",
              test: /[\\/]node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
            },
            {
              name: "vendor-canvas",
              test: /[\\/]node_modules[\\/](?:konva|react-konva)[\\/]/,
            },
            {
              name: "vendor-icons",
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            },
            {
              name: "vendor-archive",
              test: /[\\/]node_modules[\\/]jszip[\\/]/,
            },
            {
              name: "vendor-validation",
              test: /[\\/]node_modules[\\/]zod[\\/]/,
            },
            {
              name: "vendor-state",
              test: /[\\/]node_modules[\\/]zustand[\\/]/,
            },
          ],
        },
      },
    },
  },
});
