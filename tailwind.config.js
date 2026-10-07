/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tiktok: {
          dark: '#010101',
          cyan: '#25F4EE',
          red: '#FE2C55',
        }
      }
    },
  },
  plugins: [],
}
