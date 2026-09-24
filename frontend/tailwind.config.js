/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sky: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
          950: '#082F49',
        },
        aqua: {
          DEFAULT: '#22D3EE',
          light: '#A5F3FC',
          dark: '#0891B2',
        },
        ocean: {
          DEFAULT: '#0EA5E9',
          hover: '#0284C7',
          light: '#E0F2FE',
          dark: '#0369A1',
        },
        deep: {
          DEFAULT: '#0C4A6E',
          darker: '#082F49',
          header: '#081D33',
        },
        mint: {
          DEFAULT: '#34D399',
          light: '#D1FAE5',
          dark: '#059669',
        },
        sun: {
          DEFAULT: '#FBBF24',
          light: '#FEF3C7',
          dark: '#D97706',
        },
        coral: {
          DEFAULT: '#FB7185',
          light: '#FFE4E6',
          dark: '#E11D48',
        },
        surface: {
          bg: '#F5FBFF',
          card: '#FFFFFF',
          border: '#E2E8F0',
        }
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Nunito', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(14, 165, 233, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 25px -3px rgba(14, 165, 233, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.04)',
        'glow-ocean': '0 0 20px rgba(14, 165, 233, 0.25)',
        'glow-coral': '0 0 20px rgba(225, 29, 72, 0.25)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave': 'wave 6s ease-in-out infinite',
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
