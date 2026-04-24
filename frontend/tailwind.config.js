/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#09111f",
        mist: "#f8fafc",
        mint: "#6ee7b7",
        coral: "#fb7185",
        sun: "#fbbf24",
      },
      boxShadow: {
        glow: "0 24px 80px rgba(20, 184, 166, 0.18)",
      },
    },
  },
  plugins: [],
};

