import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--primary-color)",
          light: "var(--primary-color-light)",
          dark: "var(--primary-color-dark)",
        },
        main: "var(--main-bg-color)",
        sidebar: "var(--sidebar-bg-color)",
      },
    },
  },
  plugins: [],
};
export default config;