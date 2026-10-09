import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0e2a24", soft: "#17382f", line: "#2a4a40", muted: "#8fb0a3" },
        paper: { DEFAULT: "#f4f6f1", raised: "#fbfcf9", line: "#d9e1d6", muted: "#5f726a" },
        leaf: { DEFAULT: "#1f7a5c", dark: "#175e47", tint: "#e1efe8" },
        saffron: { DEFAULT: "#e9a820", tint: "#fbf0d4", ink: "#7a5604" },
        clay: { DEFAULT: "#b4421a", tint: "#f8e3da" },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: { field: "6px", panel: "14px" },
      keyframes: {
        // A stamp landing on the page: starts big and tilted, settles with a small bounce.
        stamp: {
          "0%": { opacity: "0", transform: "scale(1.8) rotate(-12deg)" },
          "60%": { opacity: "1", transform: "scale(0.94) rotate(2deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(0deg)" },
        },
        // A soft pulse for the dot of a trip that is happening right now.
        live: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.45", transform: "scale(1.35)" },
        },
      },
      animation: {
        stamp: "stamp 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) both",
        live: "live 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
