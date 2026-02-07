import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { jobRepository } from '@/lib/jobs/repository'
import { getSignedUrl } from '@/lib/storage/helper'
import { DEFAULT_SIGNED_URL_EXPIRES_IN } from '@/lib/storage/buckets'

type StatusResponse = {
  jobId: string
  status: 'pending' | 'running' | 'done' | 'failed'
  progress: number
  logs: Array<{ level: string; message: string; timestamp: string }>
  result?: Record<string, unknown>
  error?: string | null
}

/**
 * GET /api/merch/status?jobId={jobId}
 *
 * Get status of a merchandise generation job.
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
 *   result?: { designId, patternUrl, mockupUrls }
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
    const response: StatusResponse = {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      logs: job.logs,
    }

    // Add result if done
    if (job.status === 'done' && job.output) {
      const output = job.output
      const designId = typeof output.designId === 'string' ? output.designId : null

      if (designId) {
        const { data: design } = await supabase
          .from('merch_designs')
          .select('id, pattern_storage_path, mockup_storage_paths')
          .eq('id', designId)
          .eq('user_id', user.id)
          .single()

        if (design) {
          const patternStoragePath = design.pattern_storage_path
          const patternUrl = patternStoragePath
            ? await getSignedUrl(
                'MERCH',
                patternStoragePath,
                DEFAULT_SIGNED_URL_EXPIRES_IN
              )
            : null

          const mockupPaths = design.mockup_storage_paths || []
          const mockupUrls = await Promise.all(
            mockupPaths.map((path) =>
              getSignedUrl('MERCH', path, DEFAULT_SIGNED_URL_EXPIRES_IN)
            )
          )

          response.result = {
            ...output,
            designId,
            patternUrl,
            mockupUrls,
          }
        } else {
          response.result = output
        }
      } else {
        response.result = output
      }
    }

    // Add error if failed
    if (job.status === 'failed') {
      response.error = job.errorMessage
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Merch status error:', error)
    return NextResponse.json(
      { error: 'Failed to get job status', message: (error as Error).message },
      { status: 500 }
    )
  }
}
