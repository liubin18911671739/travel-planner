import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/webhooks/payment
 *
 * Placeholder webhook for payment provider events.
 * Integrate with Stripe, Paddle, or other payment providers.
 *
 * Request: Varies by provider (usually JSON with signature)
 *
 * Events to handle:
 * - payment.succeeded: Upgrade user's plan
 * - payment.failed: Log for review
 * - subscription.created: Create subscription record
 * - subscription.cancelled: Downgrade to free tier
 */
export async function POST(request: NextRequest) {
  try {
    // Get signature header for verification
    const signature = request.headers.get('stripe-signature')
      || request.headers.get('x-paddle-signature')
      || request.headers.get('webhook-signature')

    // In production, verify the signature
    // if (!signature) {
    //   return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    // }

    const event = await request.json()

    console.log('Payment webhook received:', {
      type: event.type,
      id: event.id,
    })

    // Handle different event types
    switch (event.type) {
      case 'payment.succeeded':
      case 'invoice.paid':
        // Update user's plan or quota
        // await handlePaymentSuccess(event.data)
        console.log('Payment succeeded:', event.data)
        break

      case 'payment.failed':
      case 'invoice.payment_failed':
        // Log failed payment for review
        console.warn('Payment failed:', event.data)
        break

      case 'subscription.created':
      case 'customer.subscription.created':
        // Create subscription record
        console.log('Subscription created:', event.data)
        break

      case 'subscription.cancelled':
      case 'customer.subscription.deleted':
        // Downgrade user to free tier
        console.log('Subscription cancelled:', event.data)
        break

      case 'invoice.payment_succeeded':
        // Subscription renewal
        console.log('Subscription renewed:', event.data)
        break

      default:
        console.log('Unhandled payment event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Payment webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhooks/payment
 *
 * Health check for the payment webhook endpoint.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Payment webhook endpoint is ready. Configure your payment provider to send webhooks to this URL.',
  })
}
