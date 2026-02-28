/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          1: '#0a0a0a',
          2: '#111111',
          3: '#1a1a1a',
          4: '#232323',
          5: '#2e2e2e',
          6: '#3d3d3d',
          7: '#4f4f4f',
          8: '#6b6b6b',
          9: '#8a8a8a',
          10: '#a8a8a8',
          11: '#c4c4c4',
          12: '#e8e8e8',
        },
        accent: {
          DEFAULT: '#5e6ad2',
          hover: '#6e7ae2',
          subtle: 'rgba(94, 106, 210, 0.15)',
        },
        success: {
          DEFAULT: '#45b36b',
          subtle: 'rgba(69, 179, 107, 0.15)',
        },
        warning: {
          DEFAULT: '#f5a524',
          subtle: 'rgba(245, 165, 36, 0.15)',
        },
        error: {
          DEFAULT: '#e5484d',
          subtle: 'rgba(229, 72, 77, 0.15)',
        },
      },
      fontFamily: {
        sans: ['SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SF Mono', 'Fira Code', 'Fira Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
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
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
