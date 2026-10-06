import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0e2a24", soft: "#17382f", line: "#2a4a40", muted: "#8fb0a3" },
        paper: { DEFAULT: "#f4f6f1", raised: "#fbfcf9", line: "#d9e1d6", muted: "#5f726a" },
        leaf: { DEFAULT: "#1f7a5c", dark: "#175e47", tint: "#e1efe8" },
        saffron: { DEFAULT: "#e9a820", tint: "#fbf0d4" },
        clay: { DEFAULT: "#b4421a", tint: "#f8e3da" },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: { field: "6px", panel: "14px" },
    },
  },
  plugins: [],
};

export default config;
