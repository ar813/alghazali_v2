/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./App.js"],
  theme: {
    extend: {
      colors: {
        primary: "#4CAF50", // Sleek Green
        secondary: "#8BC34A", // Light Green
        background: "#FFFFFF",
        text: "#333333",
        error: "#FF5252",
      },
    },
  },
  plugins: [],
}
