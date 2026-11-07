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
        },
        slate: {
          650: '#283548',
          750: '#1e293b',
          850: '#0f172a',
          950: '#020617',
        }
      }
    },
  },
  plugins: [],
}
