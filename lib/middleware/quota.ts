import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Quota check result.
 */
export interface QuotaCheck {
  allowed: boolean
  reason?: string
  remaining: number
  limit: number
  used: number
}

/**
 * Plan tier quotas.
 */
const PLAN_LIMITS: Record<string, number> = {
  free: 10,
  pro: 500,
  enterprise: 10000,
}

/**
 * Operation costs (how many quota units each operation consumes).
 */
const OPERATION_COSTS: Record<string, number> = {
  'knowledge.upload': 1,
  'itinerary.generate': 2,
  'merch.generate': 3,
  'export.pdf': 1,
  'export.pptx': 1,
  'export.docx': 1,
}

/**
 * Check if a user has sufficient quota for an operation.
 *
 * @param userId - User ID
 * @param operation - Operation type
 * @returns Quota check result
 */
export async function checkQuota(
  userId: string,
  operation: string
): Promise<QuotaCheck> {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('plan_tier, quota_used, quota_limit')
    .eq('id', userId)
    .single()

  if (error || !user) {
    return {
      allowed: false,
      reason: 'User not found',
      remaining: 0,
      limit: 0,
      used: 0,
    }
  }

  // Cast to access properties
  const userData = user as { plan_tier?: string; quota_used?: number; quota_limit?: number }

  const limit = userData.quota_limit || PLAN_LIMITS[userData.plan_tier || ''] || PLAN_LIMITS.free
  const used = userData.quota_used || 0
  const remaining = Math.max(0, limit - used)

  // Check if quota is available
  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `Quota exceeded for ${userData.plan_tier} plan. Limit: ${limit}`,
      remaining: 0,
      limit,
      used,
    }
  }

  return {
    allowed: true,
    remaining,
    limit,
    used,
  }
}

/**
 * Increment user quota after successful operation.
 *
 * @param userId - User ID
 * @param operation - Operation type (for cost calculation)
 */
export async function incrementQuota(userId: string, operation?: string): Promise<void> {
  const cost = operation ? OPERATION_COSTS[operation] || 1 : 1

  await supabaseAdmin.rpc('increment_user_quota', {
    user_id: userId,
    amount: cost,
  } as any)
}

/**
 * Deduct quota (for refunds or corrections).
 *
 * @param userId - User ID
 * @param amount - Amount to deduct
 */
export async function deductQuota(userId: string, amount: number = 1): Promise<void> {
  await supabaseAdmin.rpc('decrement_user_quota', {
    user_id: userId,
    amount,
  } as any)
}

/**
 * Get user quota status.
 *
 * @param userId - User ID
 * @returns Current quota status
 */
export async function getQuotaStatus(userId: string): Promise<{
  plan: string
  used: number
  limit: number
  remaining: number
  resetAt?: string
}> {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('plan_tier, quota_used, quota_limit')
    .eq('id', userId)
    .single()

  if (error || !user) {
    return {
      plan: 'free',
      used: 0,
      limit: PLAN_LIMITS.free,
      remaining: PLAN_LIMITS.free,
    }
  }

  // Cast to access properties
  const userData = user as { plan_tier?: string; quota_used?: number; quota_limit?: number }

  const limit = userData.quota_limit || PLAN_LIMITS[userData.plan_tier || ''] || PLAN_LIMITS.free
  const used = userData.quota_used || 0

  return {
    plan: userData.plan_tier || 'free',
    used,
    limit,
    remaining: Math.max(0, limit - used),
  }
}

/**
 * Next.js middleware wrapper for quota checking.
 * Use this in API routes to enforce quota limits.
 *
 * @param request - Next.js request
 * @param operation - Operation type
 * @returns NextResponse if quota exceeded, null if allowed
 */
export async function withQuotaCheck(
  request: NextRequest,
  operation: string
): Promise<NextResponse | null> {
  // In a real app, extract user from session/JWT
  // For now, this is a stub
  const userId = request.headers.get('x-user-id')

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const check = await checkQuota(userId, operation)

  if (!check.allowed) {
    return NextResponse.json(
      {
        error: 'Quota exceeded',
        message: check.reason,
        quota: {
          remaining: check.remaining,
          limit: check.limit,
        },
      },
      { status: 402 } // Payment Required
    )
  }

  return null
}

/**
 * Type for quota middleware wrapper.
 */
export type QuotaProtectedHandler = (
  request: NextRequest,
  context?: { userId: string }
) => Promise<NextResponse>

/**
 * Higher-order function to protect API routes with quota checking.
 *
 * Usage:
 * ```ts
 * export const POST = withQuota('knowledge.upload', async (req, { userId }) => {
 *   // Your handler code here
 *   return NextResponse.json({ success: true })
 * })
 * ```
 */
export function withQuota(
  operation: string,
  handler: QuotaProtectedHandler
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    // Extract user ID from request (implement based on your auth)
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check quota
    const check = await checkQuota(userId, operation)

    if (!check.allowed) {
      return NextResponse.json(
        {
          error: 'Quota exceeded',
          message: check.reason,
          quota: {
            remaining: check.remaining,
            limit: check.limit,
          },
        },
        { status: 402 }
      )
    }

    // Call handler
    const response = await handler(request, { userId })

    // If handler succeeded, increment quota
    if (response.status >= 200 && response.status < 300) {
      // Note: This happens after response is sent
      // In production, use a queue or background job
      incrementQuota(userId, operation).catch(console.error)
    }

    return response
  }
}

/**
 * Create a new user record when they first sign up.
 * Call this from your auth webhook or signup handler.
 *
 * @param userId - User ID from auth
 * @param email - User email
 * @param plan - Initial plan tier
 */
export async function createUserOnSignup(
  userId: string,
  email: string,
  plan: string = 'free'
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('users')
    .insert({
      id: userId,
      email,
      plan_tier: plan,
      quota_used: 0,
      quota_limit: PLAN_LIMITS[plan] || PLAN_LIMITS.free,
    } as any)

  if (error) {
    // Ignore duplicate user errors
    if (error.code !== '23505') {
      throw new Error(`Failed to create user: ${error.message}`)
    }
  }
}
