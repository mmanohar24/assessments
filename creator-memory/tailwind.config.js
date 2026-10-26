/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        bg1: '#111111',
        bg2: '#191919',
        bg3: '#212121',
        bg4: '#2a2a2a',
        fg: '#f2f2f2',
        fg2: '#999999',
        fg3: '#555555',
        accent: '#e8c97a',
        'accent-dim': 'rgba(232,201,122,0.10)',
        green: '#5ec97a',
        blue: '#7b8fff',
        'border-subtle': 'rgba(255,255,255,0.06)',
        'border-md': 'rgba(255,255,255,0.10)',
        'border-hi': 'rgba(255,255,255,0.16)',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '22px',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
