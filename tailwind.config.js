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
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316', // Orange / Terracotta Arty
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        cinema: {
          950: '#09090b', // Noir d'encre
          900: '#18181b', // Titres profonds
          850: '#27272a',
          800: '#3f3f46',
          750: '#52525b',
          700: '#d4d4d8', // Bordures nettes
          600: '#e4e4e7', // Séparateurs
          100: '#f4f4f5', // Fond cartes secondaires
          50: '#fafafa',  // Fond cartes
          0: '#ffffff',   // Blanc pur
        },
        gallery: {
          canvas: '#fcfbf8',  // Fond ivoire galerie
          card: '#ffffff',    // Carte blanche
          border: '#e7e5e4',  // Bordure pierre délicate
          ink: '#1c1917',     // Encre noire
          muted: '#78716c',   // Gris texte adouci
          accent: '#e11d48',  // Rouge cinéma arty
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Outfit"', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'gallery': '0 2px 20px -2px rgba(0, 0, 0, 0.04), 0 1px 6px -1px rgba(0, 0, 0, 0.02)',
        'gallery-lg': '0 10px 30px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.03)',
        'gallery-hover': '0 16px 40px -6px rgba(0, 0, 0, 0.12)',
        'arty': '4px 4px 0px 0px rgba(28, 25, 23, 1)',
      }
    },
  },
  plugins: [],
}
