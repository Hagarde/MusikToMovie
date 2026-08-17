/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fbf7ee',
          100: '#f5edd6',
          200: '#ebdaa9',
          300: '#dec074',
          400: '#d1a346',
          500: '#bf882d',
          600: '#a36c23',
          700: '#82501e',
          800: '#6c411e',
          900: '#5a371c',
          950: '#331c0d',
        },
        cinema: {
          900: '#0c0d12',
          850: '#12141c',
          800: '#171923',
          700: '#232738',
          600: '#343a52',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
