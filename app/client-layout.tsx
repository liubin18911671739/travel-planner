'use client'

import React from 'react'
import { AppShell } from '@/components/app-shell'
import { Toaster } from '@/components/toaster'

interface ClientLayoutProps {
  children: React.ReactNode
  fontClasses: string
}

const ClientLayout = ({ children, fontClasses }: ClientLayoutProps) => {
  return (
    <body className={`${fontClasses} font-sans antialiased`}>
      <AppShell>{children}</AppShell>
      <Toaster />
    </body>
  )
}

export default ClientLayout
