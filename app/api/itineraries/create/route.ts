import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { jobRepository } from '@/lib/jobs/repository'
import { inngestEvents } from '@/lib/queue/client'
import { checkQuota, incrementQuota } from '@/lib/middleware/quota'
import { randomUUID } from 'crypto'

/**
 * POST /api/itineraries/create
 *
 * Create a new itinerary generation job.
 *
 * Request body:
 * {
 *   destination: string
 *   durationDays: number
 *   knowledgePackIds: string[]
 *   settings?: { themes: string[], difficulty: string, budget: string }
 *   idempotencyKey?: string
 * }
 *
 * Response:
 * {
 *   itineraryId: string
 *   jobId: string
 *   status: 'pending'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id

    // Check quota
    const quotaCheck = await checkQuota(userId, 'itinerary.generate')
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Quota exceeded',
          message: quotaCheck.reason,
          quota: { remaining: quotaCheck.remaining, limit: quotaCheck.limit },
        },
        { status: 402 }
      )
    }

    const body = await request.json()
    const {
      destination,
      durationDays,
      knowledgePackIds = [],
      settings = {},
      idempotencyKey,
    } = body

    // Validate input
    if (!destination || typeof destination !== 'string') {
      return NextResponse.json(
        { error: 'Invalid destination' },
        { status: 400 }
      )
    }

    if (!durationDays || typeof durationDays !== 'number' || durationDays < 1 || durationDays > 30) {
      return NextResponse.json(
        { error: 'Invalid durationDays (must be 1-30)' },
        { status: 400 }
      )
    }

    // Verify knowledge packs exist and belong to user
    if (knowledgePackIds.length > 0) {
      const { data: packs, error: packError } = await supabase
        .from('knowledge_packs')
        .select('id')
        .in('id', knowledgePackIds)
        .eq('user_id', userId)

      if (packError || !packs || packs.length !== knowledgePackIds.length) {
        return NextResponse.json(
          { error: 'Invalid knowledge pack IDs' },
          { status: 400 }
        )
      }
    }

    // Create itinerary record
    const itineraryId = randomUUID()
    const { data: itinerary, error: itineraryError } = await supabaseAdmin
      .from('itineraries')
      .insert({
        id: itineraryId,
        user_id: userId,
        name: `${destination} ${durationDays}日研学`,
        destination,
        duration_days: durationDays,
        knowledge_pack_ids: knowledgePackIds,
        settings,
        status: 'generating',
      })
      .select('id')
      .single()

    if (itineraryError) {
      throw itineraryError
    }

    // Create generation job
    const jobId = await jobRepository.create({
      userId,
      type: 'generate_itinerary',
      input: {
        itineraryId,
        destination,
        durationDays,
        knowledgePackIds,
        settings,
      },
      idempotencyKey,
    })

    // Update itinerary with job reference
    await supabaseAdmin
      .from('itineraries')
      .update({ job_id: jobId })
      .eq('id', itineraryId)

    // Send event to trigger generation
    await inngestEvents.itineraries.generate({
      jobId,
      itineraryId,
      userId,
      destination,
      durationDays,
      knowledgePackIds,
      settings,
    })

    // Increment quota
    await incrementQuota(userId, 'itinerary.generate')

    return NextResponse.json({
      itineraryId,
      jobId,
      status: 'pending',
    })
  } catch (error) {
    console.error('Itinerary create error:', error)
    return NextResponse.json(
      { error: 'Failed to create itinerary', message: (error as Error).message },
      { status: 500 }
    )
  }
}
