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
          blueaccent: '#1D4ED8', // Blue for accents
          blue: '#0B3B8C',   // Logo text
          green: '#65CC28',  // Analyze button
          dark: '#111827',   // Add button
          red: '#C22929',    // Clear list icon
          bg: '#F8FAFC',     // Main background
          input: '#F3F4F6'   // Input field background
        }
      },
      backgroundImage: {
        'blue-gradient': 'var(--blue-linear-gradient)',
        'green-gradient': 'var(--green-linear-gradient)',
      }
    },
  },
  plugins: [],
}