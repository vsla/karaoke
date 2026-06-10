/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a14",
        "ink-2": "#11111f",
        "ink-3": "#181828",
        neon: {
          pink: "#ff2d95",
          cyan: "#22d3ee",
          purple: "#a855f7",
        },
      },
      fontFamily: {
        display: ['"Unbounded"', "cursive"],
        body: ['"Outfit"', "sans-serif"],
      },
      boxShadow: {
        "glow-pink": "0 0 18px rgba(255,45,149,0.45), 0 0 50px rgba(255,45,149,0.18)",
        "glow-cyan": "0 0 18px rgba(34,211,238,0.45), 0 0 50px rgba(34,211,238,0.18)",
        "glow-purple": "0 0 18px rgba(168,85,247,0.45), 0 0 50px rgba(168,85,247,0.18)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 18px rgba(255,45,149,0.45), 0 0 50px rgba(255,45,149,0.18)" },
          "50%": { boxShadow: "0 0 30px rgba(255,45,149,0.7), 0 0 80px rgba(255,45,149,0.3)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2.2s ease-in-out infinite",
        "slide-up": "slide-up 0.25s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        floaty: "floaty 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
