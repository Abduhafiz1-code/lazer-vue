/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#1b1d1f',
        panel: '#232629',
        panel2: '#2a2d31',
        line: '#383b3f',
        text2: '#9a9a96',
        accent: '#e07a3f',
        cutc: '#e0413f',
        engravec: '#3f8fe0',
        markc: '#e0d13f'
      }
    }
  },
  plugins: []
}
