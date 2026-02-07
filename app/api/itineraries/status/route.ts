import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { jobRepository } from '@/lib/jobs/repository'

/**
 * GET /api/itineraries/status?jobId={jobId}
 *
 * Get status of an itinerary generation job.
 *
 * Query params:
 * - jobId: Job ID (required)
 *
 * Response:
 * {
 *   jobId: string
 *   status: 'pending' | 'running' | 'done' | 'failed'
 *   progress: number
 *   logs: Array<{ level, message, timestamp }>
 *   result?: { itineraryId, gammaDeckUrl?, exportUrl? }
 *   error?: string
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    // Get job with logs
    const job = await jobRepository.getByIdWithLogs(jobId)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Verify user owns this job
    if (job.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build response
    const response: {
      jobId: string
      status: 'pending' | 'running' | 'done' | 'failed'
      progress: number
      logs: Array<{ level: 'info' | 'warning' | 'error'; message: string; timestamp: string }>
      result?: Record<string, unknown>
      error?: string | null
    } = {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      logs: job.logs,
    }

    // Add result if done
    if (job.status === 'done' && job.output) {
      response.result = job.output
    }

    // Add error if failed
    if (job.status === 'failed') {
      response.error = job.errorMessage
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Itinerary status error:', error)
    return NextResponse.json(
      { error: 'Failed to get job status', message: (error as Error).message },
      { status: 500 }
    )
  }
}
