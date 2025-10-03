/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      boxShadow: {
        'soft-sm': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'soft-md': '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        'soft-lg': '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
        'dark-sm': '0 1px 3px rgba(255, 255, 255, 0.08), 0 1px 2px rgba(255, 255, 255, 0.04)',
        'dark-md': '0 4px 6px rgba(255, 255, 255, 0.08), 0 2px 4px rgba(255, 255, 255, 0.04)',
        'dark-lg': '0 10px 15px rgba(255, 255, 255, 0.08), 0 4px 6px rgba(255, 255, 255, 0.04)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
  ],
}
