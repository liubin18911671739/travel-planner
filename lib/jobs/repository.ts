import { supabaseAdmin } from '@/lib/supabase/admin'
import type {
  JobLogRow,
  JobRow,
  Json,
  TableInsert,
  TableUpdate,
} from '@/lib/db/types'
import { isRecord } from '@/lib/db/types'

/**
 * Job status types.
 */
export type JobStatus = 'pending' | 'running' | 'done' | 'failed'

/**
 * Job type identifiers.
 */
export type JobType =
  | 'index_knowledge'
  | 'generate_itinerary'
  | 'generate_merch'
  | 'export_gamma'

/**
 * Log level types.
 */
export type LogLevel = 'info' | 'warning' | 'error'

/**
 * Job creation options.
 */
export interface CreateJobOptions {
  userId: string
  type: JobType
  input: Record<string, unknown>
  idempotencyKey?: string
  metadata?: Record<string, unknown>
}

/**
 * Job record from database.
 */
export interface Job {
  id: string
  userId: string
  type: JobType
  status: JobStatus
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  errorMessage: string | null
  progress: number
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
}

/**
 * Job log entry.
 */
export interface JobLog {
  id: string
  jobId: string
  level: LogLevel
  message: string
  timestamp: string
  metadata: Record<string, unknown>
}

/**
 * Job status with logs for API responses.
 */
export interface JobStatusWithLogs extends Job {
  logs: Array<{
    level: LogLevel
    message: string
    timestamp: string
  }>
}

/**
 * Custom error for job operations.
 */
export class JobError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'JobError'
  }
}

/**
 * Repository for job management and progress tracking.
 */
export class JobRepository {
  private toJobType(value: unknown): JobType {
    if (
      value === 'index_knowledge' ||
      value === 'generate_itinerary' ||
      value === 'generate_merch' ||
      value === 'export_gamma'
    ) {
      return value
    }
    return 'generate_itinerary'
  }

  private toJobStatus(value: unknown): JobStatus {
    if (
      value === 'pending' ||
      value === 'running' ||
      value === 'done' ||
      value === 'failed'
    ) {
      return value
    }
    return 'pending'
  }

  private jsonToRecord(value: unknown): Record<string, unknown> {
    return isRecord(value) ? value : {}
  }

  private toJson(value: unknown): Json {
    return JSON.parse(JSON.stringify(value)) as Json
  }

  private toLogLevel(value: unknown): LogLevel {
    if (value === 'info' || value === 'warning' || value === 'error') {
      return value
    }
    return 'info'
  }

  /**
   * Create a new job.
   *
   * @param options - Job creation options
   * @returns Job ID
   */
  async create(options: CreateJobOptions): Promise<string> {
    const payload: TableInsert<'jobs'> = {
      user_id: options.userId,
      type: options.type,
      input: this.toJson(options.input),
      idempotency_key: options.idempotencyKey || null,
      status: 'pending',
      progress: 0,
      metadata: this.toJson(options.metadata || {}),
    }

    const { data, error } = await supabaseAdmin
      .from('jobs')
      .insert(payload)
      .select('id')
      .single()

    if (error) {
      // Check for unique constraint violation on idempotency_key
      if (error.code === '23505' && options.idempotencyKey) {
        // Return existing job id for idempotency
        const existing = await supabaseAdmin
          .from('jobs')
          .select('id')
          .eq('idempotency_key', options.idempotencyKey)
          .single()

        const existingData = existing.data
        if (existingData) {
          return existingData.id
        }
      }
      throw new JobError(`Failed to create job: ${error.message}`, error.code)
    }

    if (!data) {
      throw new JobError('Failed to create job: no row returned')
    }

    return data.id
  }

  /**
   * Get a job by ID.
   *
   * @param jobId - Job ID
   * @returns Job or null if not found
   */
  async getById(jobId: string): Promise<Job | null> {
    const { data, error } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error || !data) {
      return null
    }

    return this.mapJob(data)
  }

  /**
   * Get a job with logs by ID.
   *
   * @param jobId - Job ID
   * @returns Job with logs or null if not found
   */
  async getByIdWithLogs(jobId: string): Promise<JobStatusWithLogs | null> {
    const job = await this.getById(jobId)
    if (!job) return null

    const logs = await this.getLogs(jobId)

    return {
      ...job,
      logs,
    }
  }

  /**
   * List jobs for a user with optional filtering.
   *
   * @param userId - User ID
   * @param options - Filter options
   * @returns Array of jobs
   */
  async list(
    userId: string,
    options: {
      type?: JobType
      status?: JobStatus
      limit?: number
      offset?: number
    } = {}
  ): Promise<Job[]> {
    let query = supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (options.type) {
      query = query.eq('type', options.type)
    }

    if (options.status) {
      query = query.eq('status', options.status)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, (options.offset || 0) + (options.limit || 10) - 1)
    }

    const { data, error } = await query

    if (error) {
      throw new JobError(`Failed to list jobs: ${error.message}`)
    }

    return (data || []).map((job) => this.mapJob(job))
  }

  /**
   * Update job status and progress.
   *
   * @param jobId - Job ID
   * @param status - New status
   * @param progress - Progress percentage (0-100)
   * @param output - Optional output data
   * @param errorMessage - Optional error message
   */
  async updateStatus(
    jobId: string,
    status: JobStatus,
    progress: number,
    output?: Record<string, unknown>,
    errorMessage?: string
  ): Promise<void> {
    const updates: TableUpdate<'jobs'> = {
      status,
      progress: Math.max(0, Math.min(100, progress)), // Clamp to 0-100
      updated_at: new Date().toISOString(),
    }

    if (output !== undefined) {
      updates.output = this.toJson(output)
    }

    if (errorMessage !== undefined) {
      updates.error_message = errorMessage
    }

    // Set timestamps based on status transitions
    const currentJob = await this.getById(jobId)
    if (currentJob) {
      if (status === 'running' && !currentJob.startedAt) {
        updates.started_at = new Date().toISOString()
      }

      if (status === 'done' || status === 'failed') {
        if (!currentJob.completedAt) {
          updates.completed_at = new Date().toISOString()
        }
        // Ensure progress is 100 for completed jobs
        if (status === 'done') {
          updates.progress = 100
        }
      }
    }

    const { error } = await supabaseAdmin
      .from('jobs')
      .update(updates)
      .eq('id', jobId)

    if (error) {
      throw new JobError(`Failed to update job: ${error.message}`)
    }
  }

  /**
   * Increment job progress.
   *
   * @param jobId - Job ID
   * @param amount - Amount to increment (default: 1)
   */
  async incrementProgress(jobId: string, amount: number = 1): Promise<void> {
    const job = await this.getById(jobId)
    if (!job) {
      throw new JobError('Job not found')
    }

    await this.updateStatus(jobId, job.status, Math.min(100, job.progress + amount))
  }

  /**
   * Add a log entry to a job.
   *
   * @param jobId - Job ID
   * @param level - Log level
   * @param message - Log message
   * @param metadata - Optional metadata
   */
  async addLog(
    jobId: string,
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const payload: TableInsert<'job_logs'> = {
      job_id: jobId,
      level,
      message,
      metadata: this.toJson(metadata || {}),
    }

    const { error } = await supabaseAdmin
      .from('job_logs')
      .insert(payload)

    if (error) {
      throw new JobError(`Failed to add job log: ${error.message}`)
    }
  }

  /**
   * Add an info log entry.
   */
  async logInfo(jobId: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
    return this.addLog(jobId, 'info', message, metadata)
  }

  /**
   * Add a warning log entry.
   */
  async logWarning(jobId: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
    return this.addLog(jobId, 'warning', message, metadata)
  }

  /**
   * Add an error log entry.
   */
  async logError(jobId: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
    return this.addLog(jobId, 'error', message, metadata)
  }

  /**
   * Get logs for a job.
   *
   * @param jobId - Job ID
   * @param options - Options (limit, level)
   * @returns Array of logs
   */
  async getLogs(
    jobId: string,
    options: { level?: LogLevel; limit?: number } = {}
  ): Promise<Array<{ level: LogLevel; message: string; timestamp: string }>> {
    let query = supabaseAdmin
      .from('job_logs')
      .select('level, message, timestamp')
      .eq('job_id', jobId)
      .order('timestamp', { ascending: true })

    if (options.level) {
      query = query.eq('level', options.level)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      throw new JobError(`Failed to get logs: ${error.message}`)
    }

    const rows = (data || []) as JobLogRow[]
    return rows.map((row) => ({
      level: this.toLogLevel(row.level),
      message: row.message,
      timestamp: row.timestamp || new Date(0).toISOString(),
    }))
  }

  /**
   * Delete a job and its logs.
   *
   * @param jobId - Job ID
   */
  async delete(jobId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('jobs')
      .delete()
      .eq('id', jobId)

    if (error) {
      throw new JobError(`Failed to delete job: ${error.message}`)
    }
  }

  /**
   * Map database record to Job interface.
   */
  private mapJob(data: JobRow): Job {
    return {
      id: data.id,
      userId: data.user_id,
      type: this.toJobType(data.type),
      status: this.toJobStatus(data.status),
      input: this.jsonToRecord(data.input),
      output: isRecord(data.output) ? data.output : null,
      errorMessage: data.error_message,
      progress: data.progress || 0,
      metadata: this.jsonToRecord(data.metadata),
      createdAt: data.created_at || new Date(0).toISOString(),
      updatedAt: data.updated_at || new Date(0).toISOString(),
      startedAt: data.started_at,
      completedAt: data.completed_at,
    }
  }
}

/**
 * Singleton job repository instance.
 */
export const jobRepository = new JobRepository()
