/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0f9f0',
          100: '#dcf0dc',
          200: '#b8e2b8',
          300: '#86ce86',
          400: '#52b552',
          500: '#2d9a2d',
          600: '#1a7c1a',
          700: '#166316',
          800: '#154f15',
          900: '#124212',
          950: '#061f06',
        },
        forest: {
          50:  '#f2f7f2',
          100: '#e0ede0',
          200: '#c2dbc2',
          300: '#97c297',
          400: '#64a364',
          500: '#3d833d',
          600: '#2a682a',
          700: '#1f521f',
          800: '#1a421a',
          900: '#153715',
          950: '#0a1f0a',
        },
        harvest: {
          50:  '#fff8ed',
          100: '#ffefd4',
          200: '#ffdca8',
          300: '#ffc371',
          400: '#ffa038',
          500: '#ff8210',
          600: '#f06505',
          700: '#c74c08',
          800: '#9e3c0f',
          900: '#7f3310',
          DEFAULT: '#ff8210',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
