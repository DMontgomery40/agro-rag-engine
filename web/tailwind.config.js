/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  corePlugins: {
    preflight: false, // Disable Tailwind's base reset to preserve custom CSS
  },
  theme: {
    extend: {},
  },
  plugins: [],
}
