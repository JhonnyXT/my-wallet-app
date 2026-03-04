/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        pearl: "#FBFBFD",
        midnight: "#1C1C1E",
        silver: "#8E8E93",
        coral: "#FF6B6B",
        accent: "#3478F6",
      },
      fontFamily: {
        sans: ["Inter", "System"],
      },
    },
  },
  plugins: [],
};
