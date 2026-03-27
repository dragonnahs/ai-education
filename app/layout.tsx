import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '教师智能问答系统',
  description: '基于RAG技术的教学辅助工具',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
