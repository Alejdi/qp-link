import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary colors from reference
        brand: {
          primary: '#21255B',    // Dark navy blue
          accent: '#B8EDFD',     // Light cyan
          light: '#F1F2F3',      // Light gray
          lighter: '#F8F8F8',    // Very light gray
          white: '#FFFFFF',      // Pure white
        },
        // Light mode colors
        light: {
          bg: '#F8F8F8',
          sidebar: '#FFFFFF',
          card: '#FFFFFF',
          border: '#E5E7EB',
          text: '#21255B',
          'text-secondary': '#6B7280',
        },
        // Dark mode colors
        dark: {
          bg: '#0D0D12',
          sidebar: '#15151D',
          card: '#1A1A24',
          border: '#2A2A3C',
          text: '#FFFFFF',
          'text-secondary': '#9CA3AF',
        },
      },
      fontFamily: {
        'mabry': ['Mabry Pro', 'Inter Tight', 'system-ui', 'sans-serif'],
        'inter': ['Inter Tight', 'Mabry Pro', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
