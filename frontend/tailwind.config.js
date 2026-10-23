/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#112d38",
        teal: "#087a6a",
        cream: "#f8f8f2"
      },
      fontFamily: {
        sans: ["DM Sans", "ui-sans-serif", "system-ui"],
        display: ["Lora", "Georgia", "serif"]
      }
    }
  },
  plugins: []
};
