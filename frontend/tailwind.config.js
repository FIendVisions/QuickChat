/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 与 Discord Web（约 2024）对齐的色板
        'dc-guilds': '#1e1f22',
        'dc-channels': '#2b2d31',
        'dc-chat': '#313338',
        'dc-userbar': '#232428',
        'dc-server-tile': '#313338',
        'dc-channel-hover': '#35373c',
        'dc-channel-active': '#3f4248',
        'dc-channel-text': '#949ba4',
        'dc-channel-text-active': '#f2f3f5',
        'dc-input': '#383a40',
        'dc-scroll-thumb': '#1a1b1e',
        'dc-separator': '#35363c',

        // 兼容旧语义类名（映射到 Discord 层级）
        'bg-primary': '#313338',
        'bg-secondary': '#2b2d31',
        'bg-tertiary': '#1e1f22',
        'bg-floating': '#111214',
        'bg-hover': '#35373c',
        'bg-active': '#3f4248',

        'text-normal': '#f2f3f5',
        'text-muted': '#949ba4',
        'text-link': '#00a8fc',
        'text-warning': '#f0b232',

        primary: '#5865f2',
        'primary-hover': '#4752c4',

        success: '#23a559',
        warning: '#f0b232',
        danger: '#f23f43',

        'border-color': '#26272c',
        'input-bg': '#383a40',
      },
      fontFamily: {
        sans: [
          'var(--font-inter)',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        'dc-header': '0 1px 0 rgba(4,4,5,0.2), 0 1.5px 0 rgba(6,6,7,0.05), 0 2px 0 rgba(4,4,5,0.05)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
}
