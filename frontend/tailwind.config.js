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
        // Discord 风格颜色
        'bg-primary': '#36393f',
        'bg-secondary': '#2f3136',
        'bg-tertiary': '#202225',
        'bg-floating': '#18191c',
        'bg-hover': '#34373c',
        'bg-active': '#393c43',
        
        'text-normal': '#dcddde',
        'text-muted': '#72767d',
        'text-link': '#00aff4',
        'text-warning': '#faa61a',
        
        'primary': '#5865f2',
        'primary-hover': '#4752c4',
        
        'success': '#3ba55c',
        'warning': '#faa61a',
        'danger': '#ed4245',
        
        'border-color': '#26272d',
        'input-bg': '#202225',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
}
