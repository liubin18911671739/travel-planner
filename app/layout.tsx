import React from 'react'
import type { Metadata } from 'next'
import { Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google'
import ClientLayout from './client-layout'
import './globals.css'

const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '研学行程生成器',
  description: '专业的研学行程规划、知识库管理和商品设计平台',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const fontClasses = `${notoSansSC.variable} ${notoSerifSC.variable}`

  return (
    <html lang="zh-CN">
      <ClientLayout fontClasses={fontClasses}>{children}</ClientLayout>
    </html>
  )
}
