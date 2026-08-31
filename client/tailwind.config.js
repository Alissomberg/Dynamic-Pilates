/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pilates: {
          50: '#F0FDF9',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D8B75', // Primária oficial
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
          dark: '#083344',
          leaf: '#22C55E', // Verde folha da logo
          leafHover: '#16A34A',
          lime: '#84CC16'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'touch': '0 4px 14px 0 rgba(13, 139, 117, 0.15)',
        'touch-active': '0 2px 6px 0 rgba(13, 139, 117, 0.25)',
        'card': '0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 1px 4px -1px rgba(0, 0, 0, 0.03)'
      },
      minHeight: {
        'touch': '52px'
      }
    },
  },
  plugins: [],
}
