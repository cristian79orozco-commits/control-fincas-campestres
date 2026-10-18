/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  corePlugins: {
    preflight: false, // PRESERVAR 100% de los estilos y resets nativos en index.css
  },
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--primary)',
          'primary-h': 'var(--primary-h)',
          'primary-bg': 'var(--primary-bg)',
          accent: 'var(--accent)',
          'accent-bg': 'var(--accent-bg)',
          surface: 'var(--surface)',
          'surface-2': 'var(--surface-2)',
          'surface-3': 'var(--surface-3)',
          border: 'var(--border)',
          text: 'var(--text)',
          'text-muted': 'var(--text-muted)',
          success: 'var(--success)',
          warning: 'var(--warning)',
          danger: 'var(--danger)',
        },
      },
      borderRadius: {
        'brand-xs': 'var(--rad-xs, 8px)',
        'brand-sm': 'var(--rad-sm, 14px)',
        'brand-md': 'var(--rad-md, 20px)',
        'brand-lg': 'var(--rad-lg, 28px)',
      },
      boxShadow: {
        'brand-sm': 'var(--sh-sm)',
        'brand-md': 'var(--sh-md)',
        'brand-lg': 'var(--sh-lg)',
      },
    },
  },
  plugins: [],
};
