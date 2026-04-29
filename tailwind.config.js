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
        // Clean light laboratory theme
        lab: {
          bg:       '#f4f6f9',
          panel:    '#ffffff',
          elevated: '#eef1f5',
          border:   '#dce1e8',
          accent:   '#0a8f6c',
          'accent-dim': '#0a8f6c18',
          secondary:'#5b4fc7',
          muted:    '#6b7a8d',
          text:     '#1a2332',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Share Tech Mono', 'monospace'],
        display: ['Orbitron', 'sans-serif'],
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
