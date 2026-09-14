/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0A0A0A",       // main background
        surface: "#121212",     // elevated cards
        "surface-2": "#1C1C1C", // more elevated (modals, nested cards)
        border: {
          DEFAULT: "rgba(255,255,255,0.08)", // 1px machined-edge border
          soft: "rgba(255,255,255,0.05)",
        },
        text: {
          primary: "rgba(255,255,255,0.90)",
          secondary: "rgba(255,255,255,0.50)",
          muted: "rgba(255,255,255,0.35)",
        },
        accent: {
          DEFAULT: "#4F46E5",   // muted desaturated indigo (user bubbles, links)
          soft: "rgba(79,70,229,0.15)",
        },
        status: {
          match: "#34D399",     // muted neon green
          partial: "#F59E0B",   // warm amber
          fail: "#F87171",      // red
        },
      },
      boxShadow: {
        card: "0 24px 60px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.05)",
      },
    },
  },
  plugins: [],
};
