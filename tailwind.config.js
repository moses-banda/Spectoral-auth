/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Spectral palette — matches AS7341 channels
        spectrum: {
          f1: '#8338ec',  // 415nm violet
          f2: '#3a86ff',  // 445nm indigo
          f3: '#4cc9f0',  // 480nm blue
          f4: '#06d6a0',  // 515nm cyan
          f5: '#80ed99',  // 555nm green
          f6: '#ffd166',  // 590nm yellow
          f7: '#ff9f1c',  // 630nm orange
          f8: '#ef476f',  // 680nm red
          clear: '#f4f4f4',
          nir: '#6a040f',
        },
        // Lumen warm palette
        lumen: {
          warm:  '#D4A276',
          peach: '#E8A87C',
          teal:  '#0B7A8A',
          navy:  '#0F1729',
        },
        // Clean light laboratory theme
        lab: {
          bg:       '#faf8f5',
          panel:    '#ffffff',
          elevated: '#f5f0eb',
          border:   '#dce1e8',
          accent:   '#0B7A8A',
          'accent-dim': '#0B7A8A18',
          secondary:'#5b4fc7',
          muted:    '#6b7a8d',
          text:     '#1a2332',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Share Tech Mono', 'monospace'],
        display: ['Inter', 'Outfit', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s ease-in-out infinite',
      },
      keyframes: {
        scan: {
          '0%, 100%': { opacity: '0.4' },
          '50%':      { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
