import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      // One-shot entrances and feedback. The looping illustration keyframes
      // live in src/styles/motion.css next to the SVG classes they drive.
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards',
        'pop-in': 'popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) backwards',
        squish: 'squish 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)',
        shake: 'shake 0.45s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // The "compressed" beat: flatten, overshoot, settle.
        squish: {
          '0%, 100%': { transform: 'scale(1, 1)' },
          '30%': { transform: 'scale(1.04, 0.86)' },
          '60%': { transform: 'scale(0.98, 1.03)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-5px)' },
          '40%, 80%': { transform: 'translateX(5px)' },
        },
      },
      colors: {
        // The single accent. Same hue the product has always used (Tailwind
        // blue), named so every surface reaches for one token instead of
        // picking a different blue/indigo/purple per component.
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Neutral surfaces for dark mode; light mode uses the gray scale.
        dark: {
          bg: '#0f172a',
          card: '#1e293b',
          border: '#334155',
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
