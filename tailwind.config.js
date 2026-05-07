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
          DEFAULT: '#0a0a0c',
          lighter: '#16161a',
          card: '#1c1c21',
        },
        primary: {
          DEFAULT: '#8b5cf6', // Violet
          dark: '#7c3aed',
          light: '#a78bfa',
        },
        accent: {
          DEFAULT: '#ec4899', // Pink
          light: '#f472b6',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'karaoke-gradient': 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
      },
      animation: {
        'gradient': 'gradient 8s linear infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(139, 92, 246, 0.3)',
      }
    },
  },
  plugins: [],
}
