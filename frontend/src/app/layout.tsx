import './globals.css';

export const metadata = {
  title: 'QuickChat - 游戏语音开黑平台',
  description: '类似 Discord 的游戏语音聊天系统，支持实时语音和文字聊天',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
