import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'QuickChat',
  description: '类 Discord 的实时语音与文字聊天',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
