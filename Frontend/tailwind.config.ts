import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        slatebrand: "#1e293b",
        aqua: "#0ea5e9",
        mint: "#10b981",
        sand: "#f8fafc"
      },
      boxShadow: {
        card: "0 12px 30px -20px rgba(2, 6, 23, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;
