/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1A4FD8',
      },
      fontFamily: {
        nunito: ['Nunito', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 18px 40px rgba(20, 31, 56, 0.08)',
      },
    },
  },
  plugins: [],
};
