import { inngest } from '@/lib/queue/client'
import { serve } from 'inngest/next'
import type { NextRequest } from 'next/server'

type RouteContext = { params?: Promise<Record<string, string>> }

/**
 * Inngest serve function for Next.js App Router.
 * Export this from app/api/inngest/route.ts for Inngest dev server.
 */
let inngestHandler: ReturnType<typeof serve> | null = null

function getHandler() {
  if (!inngestHandler) {
    // Lazy load job functions to avoid build-time Inngest client initialization
    const { indexKnowledge, deleteKnowledge } = require('./knowledge')
    const { generateItinerary } = require('./itineraries')
    const { generateMerch } = require('./merch')

    inngestHandler = serve({
      id: 'travel-planner',
      client: inngest,
      functions: [
        indexKnowledge,
        deleteKnowledge,
        generateItinerary,
        generateMerch,
      ],
    })
  }
  return inngestHandler
}

export async function GET(req: NextRequest, context: RouteContext) {
  return getHandler().GET(req, context)
}

export async function POST(req: NextRequest, context: RouteContext) {
  return getHandler().POST(req, context)
}
