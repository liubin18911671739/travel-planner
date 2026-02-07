import { Inngest } from 'inngest'
import { serve } from 'inngest/next'

/**
 * Validate required environment variables.
 */
const inngestEventKey = process.env.INNGEST_EVENT_KEY || process.env.INNGEST_KEY
const inngestSigningKey = process.env.INNGEST_SIGNING_KEY

/**
 * Inngest client for sending events and defining functions.
 *
 * This client is used both for:
 * 1. Sending events from API routes to trigger jobs
 * 2. Defining Inngest functions in app/jobs/
 *
 * Note: The client is lazily initialized to avoid build-time errors.
 */
let inngestClient: Inngest | null = null

export function getInngestClient() {
  if (!inngestClient) {
    const eventKey = inngestEventKey || process.env.INNGEST_EVENT_KEY || process.env.INNGEST_KEY
    const signingKey = inngestSigningKey || process.env.INNGEST_SIGNING_KEY

    if (!eventKey) {
      throw new Error(
        'INNGEST_EVENT_KEY (or INNGEST_KEY) environment variable is required'
      )
    }

    if (!signingKey) {
      throw new Error('INNGEST_SIGNING_KEY environment variable is required')
    }

    inngestClient = new Inngest({
      id: 'travel-planner',
      eventKey,
      signingKey,
    })
  }

  return inngestClient
}

/**
 * Convenience export for the inngest client.
 * Lazy initialized to avoid build-time errors.
 */
export const inngest = new Proxy({} as Inngest, {
  get(_target, prop) {
    return Reflect.get(getInngestClient(), prop)
  },
})

// Re-export serve for Next.js handler
export { serve }

/**
 * Send an event to trigger a job.
 *
 * @param name - Event name (e.g., 'knowledge/index', 'itineraries/generate')
 * @param data - Event data
 */
export async function sendEvent(
  name: string,
  data: Record<string, any>
): Promise<{ ids: string[] }> {
  return await getInngestClient().send({
    name,
    data,
  })
}

/**
 * Helper events for job types.
 */
export const inngestEvents = {
  knowledge: {
    index: (data: { jobId: string; fileId: string; userId: string }) =>
      sendEvent('knowledge/index', data),
  },
  itineraries: {
    generate: (data: {
      jobId: string
      itineraryId: string
      userId: string
      destination: string
      durationDays: number
      knowledgePackIds: string[]
      settings: Record<string, any>
    }) => sendEvent('itineraries/generate', data),
  },
  merch: {
    generate: (data: {
      jobId: string
      designId: string
      userId: string
      productType: string
      themeKeywords: string[]
      colorMood: string
      density: string
      styleLock: string
    }) => sendEvent('merch/generate', data),
  },
  exports: {
    gamma: (data: { jobId: string; itineraryId: string; userId: string }) =>
      sendEvent('exports/gamma', data),
  },
}
