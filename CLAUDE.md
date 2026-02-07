# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server (Next.js)
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Architecture

This is a Next.js 16 application for generating and managing study travel itineraries (研学行程生成器). The application is a Chinese-language platform for educational travel planning.

### Framework & Styling

- **Next.js 16** with App Router (`app/` directory)
- **React 19** with TypeScript 5.7
- **Tailwind CSS** for styling with shadcn/ui components
- **Radix UI** primitives for accessible components
- **next-themes** for dark mode support (class-based)

### Key Directories

- `app/` - Next.js App Router pages and layouts
  - `layout.tsx` - Root layout with Chinese fonts (Noto Sans SC, Noto Serif SC)
  - `client-layout.tsx` - Client-side wrapper for app shell and toaster
  - `page.tsx` - Itinerary/job management page (default route)
  - `itinerary/page.tsx` - Job management interface
  - `knowledge/page.tsx` - File upload and knowledge base management
  - `merch/page.tsx` - Product design studio for generating merchandise
  - `exports/page.tsx` - Export functionality for PDF/PPTX/DOCX
  - `settings/page.tsx` - App settings

- `components/` - React components
  - `ui/` - shadcn/ui components (Radix UI wrappers)
  - `app-shell.tsx` - Main navigation shell with sidebar
  - `job-status-card.tsx` - Job progress display with logs
  - `theme-provider.tsx` - Dark mode provider
  - `toaster.tsx` - Toast notification wrapper

- `lib/` - Utilities and data
  - `types.ts` - TypeScript interfaces (Job, KnowledgeFile, KnowledgePack, etc.)
  - `mock-data.ts` - Mock data for development
  - `utils.ts` - `cn()` utility for class merging

### App Shell Structure

The app uses a responsive layout:
- Desktop: Left sidebar navigation (`<aside>`)
- Mobile: Top header with Sheet drawer + bottom tab bar
- Navigation items: 行程 (Itinerary), 知识库 (Knowledge), 商品 (Merch), 交付 (Exports), 设置 (Settings)

### Page Structure Pattern

All pages follow a consistent pattern:
```
<div className="h-full flex flex-col bg-background">
  <div className="border-b border-border bg-card sticky top-0 z-30">
    {/* Header with title and description */}
  </div>
  <div className="flex-1 overflow-auto">
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto space-y-6">
      {/* Content */}
    </div>
  </div>
</div>
```

### Data Flow

- Pages use `useState` for local state management
- `useToast()` hook from `@/hooks/use-toast` for notifications
- Mock data in `lib/mock-data.ts` for development
- Types defined in `lib/types.ts`

### UI Patterns

- Chinese language throughout (zh-CN)
- Status types: `pending`, `running`, `done`, `failed`
- Job progress tracking with logs
- File upload with drag-and-drop
- Multi-step wizards (see `merch/page.tsx`)
- Responsive design with mobile-first approach

### Important Notes

- TypeScript build errors are ignored in Next.js config (`ignoreBuildErrors: true`)
- Images are unoptimized (`unoptimized: true`)
- Path alias `@/*` maps to project root
- All pages are client components (`'use client'`)
- Use `mounted` state pattern to avoid hydration mismatches with `new Date()`
