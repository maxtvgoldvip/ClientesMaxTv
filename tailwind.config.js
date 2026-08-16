/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0b0f19',
          800: '#111827',
          700: '#1f2937',
        },
        gold: {
          500: '#d4af37',
          600: '#b8860b',
        }
      }
    },
  },
  plugins: [],
}
