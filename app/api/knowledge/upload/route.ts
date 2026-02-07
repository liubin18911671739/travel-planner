import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { jobRepository } from '@/lib/jobs/repository'
import { inngestEvents } from '@/lib/queue/client'
import { uploadFileWithUniqueName } from '@/lib/storage/helper'
import { BUCKETS } from '@/lib/storage/buckets'
import { checkQuota, incrementQuota } from '@/lib/middleware/quota'
import { randomUUID } from 'crypto'

/**
 * POST /api/knowledge/upload
 *
 * Upload a knowledge file and trigger indexing job.
 *
 * Request: multipart/form-data
 * - file: File
 * - userId: string (from auth in production)
 *
 * Response:
 * - fileId: string
 * - status: 'pending' | 'indexing'
 * - jobId: string
 */
export async function POST(request: NextRequest) {
  try {
    // Get user from session (in production, use proper auth)
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id

    // Check quota
    const quotaCheck = await checkQuota(userId, 'knowledge.upload')
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

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: PDF, DOCX, TXT, JPG, PNG' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size: 10MB' },
        { status: 400 }
      )
    }

    // Upload to storage
    const buffer = Buffer.from(await file.arrayBuffer())
    const storagePath = await uploadFileWithUniqueName(
      'KNOWLEDGE',
      'files',
      file.name,
      buffer,
      file.type
    )

    // Get file extension
    const ext = file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN'

    // Create knowledge file record
    const fileId = randomUUID()
    const { error: dbError } = await supabaseAdmin
      .from('knowledge_files')
      .insert({
        id: fileId,
        user_id: userId,
        name: file.name,
        file_type: ext,
        file_size: file.size,
        storage_path: storagePath,
        status: 'pending',
      })
      .select('id')
      .single()

    if (dbError) {
      // Clean up uploaded file
      await supabaseAdmin.storage.from(BUCKETS.KNOWLEDGE).remove([storagePath])
      throw dbError
    }

    // Create indexing job
    const jobId = await jobRepository.create({
      userId,
      type: 'index_knowledge',
      input: {
        fileId,
        fileName: file.name,
        fileType: ext,
        storagePath,
      },
    })

    // Send event to trigger indexing
    await inngestEvents.knowledge.indexRequested({
      jobId,
      fileId,
      userId,
    })

    // Increment quota
    await incrementQuota(userId, 'knowledge.upload')

    return NextResponse.json({
      fileId,
      status: 'pending',
      jobId,
    })
  } catch (error) {
    console.error('Knowledge upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file', message: (error as Error).message },
      { status: 500 }
    )
  }
}
