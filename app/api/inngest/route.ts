import { GET, POST } from '@/app/jobs'

/**
 * API route for Inngest dev server.
 *
 * The Inngest dev server polls this endpoint to discover functions.
 * Run with: npx inngest-cli dev
 */
export { GET, POST }

// Prevent static optimization for this route
export const dynamic = 'force-dynamic'
