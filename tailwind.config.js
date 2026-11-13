/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#090A0F",
        surf: "#11131C",
        line: "#1E2230",
        mute: "#8A90A6",
        dim: "#5B6178",
        cy: "#22D3EE",
        em: "#34D399",
        rd: "#F87171",
        am: "#FBBF24",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
