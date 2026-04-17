/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:  { DEFAULT: '#1B4F72', light: '#2E86C1', dark: '#154360' },
        accent:   { DEFAULT: '#F4D03F', light: '#F7DC6F', dark: '#D4AC0D' },
        success:  '#27AE60',
        warning:  '#F39C12',
        danger:   '#E74C3C',
        surface:  '#FFFFFF',
        bg:       '#F4F6F9',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};

