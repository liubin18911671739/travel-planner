import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { jobRepository } from '@/lib/jobs/repository'
import { inngestEvents } from '@/lib/queue/client'
import { checkQuota, incrementQuota } from '@/lib/middleware/quota'
import { randomUUID } from 'crypto'

type MerchGenerateBody = {
  productType: 'mug' | 'phone_case' | 'tshirt'
  size?: string
  themeKeywords: string[]
  colorMood: 'warm' | 'cool' | 'natural' | 'elegant' | 'vibrant'
  density: 'sparse' | 'medium' | 'dense'
  styleLock: 'flat' | 'vintage' | 'ink' | 'modern_minimal'
  itineraryId?: string
  idempotencyKey?: string
}

/**
 * POST /api/merch/generate
 *
 * Create a new merchandise pattern generation job.
 *
 * Request body:
 * {
 *   productType: 'mug' | 'phone_case' | 'tshirt'
 *   size?: string
 *   themeKeywords: string[]
 *   colorMood: string
 *   density: 'sparse' | 'medium' | 'dense'
 *   styleLock: 'flat' | 'vintage' | 'ink' | 'modern_minimal'
 *   idempotencyKey?: string
 * }
 *
 * Response:
 * {
 *   designId: string
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
    const quotaCheck = await checkQuota(userId, 'merch.generate')
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

    const body = (await request.json()) as Partial<MerchGenerateBody>
    const {
      productType,
      size,
      themeKeywords = [],
      colorMood,
      density,
      styleLock,
      itineraryId,
      idempotencyKey,
    } = body

    // Validate product type
    const validProductTypes = ['mug', 'phone_case', 'tshirt']
    if (!productType || !validProductTypes.includes(productType)) {
      return NextResponse.json(
        { error: `Invalid productType. Must be one of: ${validProductTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate theme keywords
    if (!Array.isArray(themeKeywords) || themeKeywords.length === 0) {
      return NextResponse.json(
        { error: 'themeKeywords must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate color mood
    const validColorMoods = ['warm', 'cool', 'natural', 'elegant', 'vibrant']
    if (!colorMood || !validColorMoods.includes(colorMood)) {
      return NextResponse.json(
        { error: `Invalid colorMood. Must be one of: ${validColorMoods.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate density
    const validDensities = ['sparse', 'medium', 'dense']
    if (!density || !validDensities.includes(density)) {
      return NextResponse.json(
        { error: `Invalid density. Must be one of: ${validDensities.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate style lock
    const validStyles = ['flat', 'vintage', 'ink', 'modern_minimal']
    if (!styleLock || !validStyles.includes(styleLock)) {
      return NextResponse.json(
        { error: `Invalid styleLock. Must be one of: ${validStyles.join(', ')}` },
        { status: 400 }
      )
    }

    if (itineraryId) {
      const { data: itinerary, error: itineraryError } = await supabase
        .from('itineraries')
        .select('id')
        .eq('id', itineraryId)
        .eq('user_id', userId)
        .single()

      if (itineraryError || !itinerary) {
        return NextResponse.json(
          { error: 'Invalid itineraryId' },
          { status: 400 }
        )
      }
    }

    // Create merch design record
    const designId = randomUUID()
    const designName = `${themeKeywords.join(' ')} ${productType}`

    const { error: designError } = await supabaseAdmin
      .from('merch_designs')
      .insert({
        id: designId,
        user_id: userId,
        name: designName,
        product_type: productType,
        theme_keywords: themeKeywords,
        color_mood: colorMood,
        density,
        style_lock: styleLock,
        status: 'generating',
      })
      .select('id')
      .single()

    if (designError) {
      throw designError
    }

    // Create generation job
    const jobId = await jobRepository.create({
      userId,
      type: 'generate_merch',
      input: {
        designId,
        productType,
        size,
        themeKeywords,
        colorMood,
        density,
        styleLock,
        itineraryId,
      },
      idempotencyKey,
    })

    // Update design with job reference
    await supabaseAdmin
      .from('merch_designs')
      .update({ job_id: jobId })
      .eq('id', designId)

    // Send event to trigger generation
    await inngestEvents.merch.generate({
      jobId,
      designId,
      userId,
      productType,
      themeKeywords,
      colorMood,
      density,
      styleLock,
      itineraryId,
    })

    // Increment quota
    await incrementQuota(userId, 'merch.generate')

    return NextResponse.json({
      designId,
      jobId,
      status: 'pending',
    })
  } catch (error) {
    console.error('Merch generate error:', error)
    return NextResponse.json(
      { error: 'Failed to create merch design', message: (error as Error).message },
      { status: 500 }
    )
  }
}
