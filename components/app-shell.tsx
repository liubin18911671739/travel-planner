'use client'

import React from "react"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  MapPin,
  BookOpen,
  ShoppingBag,
  FileText,
  Settings,
  Menu,
} from 'lucide-react'
import { useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import type { TabItem } from '@/lib/types'

const NAVIGATION_ITEMS: TabItem[] = [
  {
    label: '行程',
    value: 'itinerary',
    icon: <MapPin className="w-4 h-4" />,
    href: '/itinerary',
  },
  {
    label: '知识库',
    value: 'knowledge',
    icon: <BookOpen className="w-4 h-4" />,
    href: '/knowledge',
  },
  {
    label: '商品',
    value: 'merch',
    icon: <ShoppingBag className="w-4 h-4" />,
    href: '/merch',
  },
  {
    label: '交付',
    value: 'exports',
    icon: <FileText className="w-4 h-4" />,
    href: '/exports',
  },
  {
    label: '设置',
    value: 'settings',
    icon: <Settings className="w-4 h-4" />,
    href: '/settings',
  },
]

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const getCurrentTab = () => {
    if (pathname === '/') return 'itinerary'
    return NAVIGATION_ITEMS.find(
      (item) => pathname.startsWith(item.href)
    )?.value
  }

  const currentTab = getCurrentTab()

  return (
    <div className="flex flex-col h-screen bg-background md:flex-row">
      {/* Mobile Header */}
      {isMobile && (
        <header className="sticky top-0 z-40 flex items-center justify-between w-full px-4 py-3 border-b bg-card border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">学</span>
            </div>
            <h1 className="text-lg font-bold text-foreground">研学行程</h1>
          </div>
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <nav className="flex flex-col gap-1 p-4">
                {NAVIGATION_ITEMS.map((item) => (
                  <Link key={item.value} href={item.href}>
                    <Button
                      variant={
                        currentTab === item.value ? 'default' : 'ghost'
                      }
                      className="w-full justify-start gap-3"
                      onClick={() => setSidebarOpen(false)}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </header>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="hidden md:flex md:flex-col md:w-64 bg-sidebar-background border-r border-sidebar-border">
          <div className="flex items-center gap-3 px-5 py-6">
            <div className="w-12 h-12 bg-gradient-to-br from-primary via-primary to-primary/90 rounded-2xl flex items-center justify-center shadow-md">
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-sidebar-foreground text-base">
                研学行程生成器
              </h1>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            <Link href="/">
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 h-11 rounded-xl font-medium transition-all ${
                  currentTab === 'itinerary'
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
              >
                <MapPin className="w-5 h-5" />
                <span>行程</span>
              </Button>
            </Link>
            {NAVIGATION_ITEMS.map((item) => (
              <Link key={item.value} href={item.href}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 h-11 rounded-xl font-medium transition-all ${
                    currentTab === item.value
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Button>
              </Link>
            ))}
          </nav>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="w-full h-full">{children}</div>
      </main>

      {/* Mobile Tab Bar */}
      {isMobile && (
        <nav className="sticky bottom-0 z-40 flex gap-1 justify-around w-full px-2 py-2 border-t bg-card border-border">
          {NAVIGATION_ITEMS.map((item) => (
            <Link key={item.value} href={item.href} className="flex-1">
              <Button
                variant={currentTab === item.value ? 'default' : 'ghost'}
                size="sm"
                className="w-full flex flex-col gap-1 h-auto py-2"
              >
                {item.icon}
                <span className="text-xs">{item.label}</span>
              </Button>
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}
