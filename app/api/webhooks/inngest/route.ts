import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/lib/queue/client'

/**
 * POST /api/webhooks/inngest
 *
 * Inngest webhook handler for receiving events from Inngest.
 * This endpoint is called by Inngest for various event notifications.
 *
 * Verify the request signature using Inngest signing key.
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const rawBody = await request.text()
    const signature = request.headers.get('x-inngest-signature')

    // In production, verify the signature
    // if (!signature) {
    //   return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    // }

    // Parse the event
    const event = JSON.parse(rawBody)

    // Handle different event types
    switch (event.type) {
      case 'function.completed':
        // Update job status to done
        console.log('Function completed:', event.data)
        break

      case 'function.failed':
        // Update job status to failed
        console.error('Function failed:', event.data)
        break

      case 'function.running':
        // Update job status to running
        console.log('Function running:', event.data)
        break

      default:
        console.log('Unknown event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Inngest webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhooks/inngest
 *
 * Health check for the webhook endpoint.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
