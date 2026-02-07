/**
 * ComfyUI API Client
 *
 * Wrapper for ComfyUI/ComfyAPI with retry logic.
 * Handles seamless pattern generation and product mockup creation.
 */

const COMFY_MAX_RETRIES = 3
const COMFY_RETRY_DELAY_BASE = 2000 // ms
const COMFY_GENERATION_TIMEOUT = 300000 // 5 minutes for image generation
const COMFY_POLL_INTERVAL = 3000 // 3 seconds

/**
 * Pattern generation options.
 */
export interface GeneratePatternOptions {
  keywords: string[]
  colorMood: string
  density: 'sparse' | 'medium' | 'dense'
  style: 'flat' | 'vintage' | 'ink' | 'modern_minimal'
  width?: number
  height?: number
  seed?: number
}

/**
 * Mockup generation options.
 */
export interface GenerateMockupsOptions {
  patternImageUrl: string
  productType: 'mug' | 'phone_case' | 'tshirt'
  views: ('front' | 'side' | 'context')[]
  size?: string // For phone case: 'iPhone 14', 'iPhone 15', etc.
}

/**
 * Image generation result.
 */
export interface ComfyResult {
  imageUrl: string
  imageBuffer: Buffer
  metadata?: Record<string, any>
}

/**
 * ComfyUI prompt/workflow execution status.
 */
interface PromptStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  prompt_id: string
  outputs?: Array<{ url: string; metadata?: any }>
  error?: string
}

/**
 * Custom error for ComfyUI operations.
 */
export class ComfyError extends Error {
  constructor(
    message: string,
    public code?: string,
    public retryable: boolean = false
  ) {
    super(message)
    this.name = 'ComfyError'
  }
}

/**
 * ComfyUI API client with retry and polling logic.
 */
export class ComfyClient {
  private readonly apiUrl: string
  private readonly apiKey: string

  constructor(config?: { apiUrl?: string; apiKey?: string }) {
    this.apiUrl = config?.apiUrl || process.env.COMFY_API_URL || ''
    this.apiKey = config?.apiKey || process.env.COMFY_API_KEY || ''

    // Don't throw during construction - throw on first use instead
  }

  private getApiUrl(): string {
    if (!this.apiUrl && !process.env.COMFY_API_URL) {
      throw new Error('COMFY_API_URL environment variable is required')
    }
    return this.apiUrl || process.env.COMFY_API_URL!
  }

  private getApiKey(): string {
    if (!this.apiKey && !process.env.COMFY_API_KEY) {
      throw new Error('COMFY_API_KEY environment variable is required')
    }
    return this.apiKey || process.env.COMFY_API_KEY!
  }

  /**
   * Generate a seamless pattern from keywords.
   *
   * @param options - Pattern generation options
   * @returns Generated pattern image
   */
  async generatePattern(options: GeneratePatternOptions): Promise<ComfyResult> {
    return this.withRetry(async () => {
      const workflow = this.buildPatternWorkflow(options)

      const response = await fetch(`${this.getApiUrl()}/prompt`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.getApiKey(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workflow }),
        signal: AbortSignal.timeout(COMFY_GENERATION_TIMEOUT),
      })

      if (!response.ok) {
        const body = await response.text()
        throw new ComfyError(
          `Pattern generation failed: ${response.statusText} - ${body}`,
          response.status.toString(),
          this.isRetryable(response.status)
        )
      }

      const { prompt_id } = await response.json()

      // Wait for completion and download result
      return await this.waitForResult(prompt_id)
    })
  }

  /**
   * Generate product mockups with pattern applied.
   *
   * @param options - Mockup generation options
   * @returns Array of generated mockup images
   */
  async generateMockups(options: GenerateMockupsOptions): Promise<ComfyResult[]> {
    return this.withRetry(async () => {
      const workflow = this.buildMockupWorkflow(options)

      const response = await fetch(`${this.getApiUrl()}/prompt`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.getApiKey(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workflow }),
        signal: AbortSignal.timeout(COMFY_GENERATION_TIMEOUT * 2), // Longer for multiple outputs
      })

      if (!response.ok) {
        const body = await response.text()
        throw new ComfyError(
          `Mockup generation failed: ${response.statusText} - ${body}`,
          response.status.toString(),
          this.isRetryable(response.status)
        )
      }

      const { prompt_id } = await response.json()

      // Wait for all mockups to complete
      return await this.waitForResults(prompt_id, options.views.length)
    })
  }

  /**
   * Wait for a single image generation to complete.
   */
  private async waitForResult(promptId: string): Promise<ComfyResult> {
    const maxAttempts = Math.floor(COMFY_GENERATION_TIMEOUT / COMFY_POLL_INTERVAL)

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getPromptStatus(promptId)

      if (status.status === 'completed' && status.outputs?.[0]) {
        // Download the generated image
        const imageResponse = await fetch(status.outputs[0].url)
        if (!imageResponse.ok) {
          throw new ComfyError('Failed to download generated image')
        }

        const buffer = Buffer.from(await imageResponse.arrayBuffer())

        return {
          imageUrl: status.outputs[0].url,
          imageBuffer: buffer,
          metadata: status.outputs[0].metadata,
        }
      }

      if (status.status === 'failed') {
        throw new ComfyError(status.error || 'Generation failed')
      }

      await this.delay(COMFY_POLL_INTERVAL)
    }

    throw new ComfyError('Generation timed out')
  }

  /**
   * Wait for multiple image generations to complete.
   */
  private async waitForResults(
    promptId: string,
    expectedCount: number
  ): Promise<ComfyResult[]> {
    const maxAttempts = Math.floor((COMFY_GENERATION_TIMEOUT * 2) / COMFY_POLL_INTERVAL)

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getPromptStatus(promptId)

      if (status.status === 'completed' && status.outputs?.length >= expectedCount) {
        // Download all generated images
        const results = await Promise.all(
          status.outputs.slice(0, expectedCount).map(async (output) => {
            const imageResponse = await fetch(output.url)
            if (!imageResponse.ok) {
              throw new ComfyError('Failed to download generated image')
            }

            const buffer = Buffer.from(await imageResponse.arrayBuffer())

            return {
              imageUrl: output.url,
              imageBuffer: buffer,
              metadata: output.metadata,
            }
          })
        )

        return results
      }

      if (status.status === 'failed') {
        throw new ComfyError(status.error || 'Generation failed')
      }

      await this.delay(COMFY_POLL_INTERVAL)
    }

    throw new ComfyError('Generation timed out')
  }

  /**
   * Get the status of a prompt.
   */
  private async getPromptStatus(promptId: string): Promise<PromptStatus> {
    const response = await fetch(`${this.getApiUrl()}/history/${promptId}`, {
      headers: {
        'X-API-Key': this.getApiKey(),
      },
    })

    if (!response.ok) {
      throw new ComfyError(`Failed to get prompt status: ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Build ComfyUI workflow for pattern generation.
   * This is a template - customize based on your ComfyUI setup.
   */
  private buildPatternWorkflow(options: GeneratePatternOptions): any {
    // Map density to node parameters
    const densityMap = {
      sparse: { steps: 10, cfg_scale: 5 },
      medium: { steps: 20, cfg_scale: 7 },
      dense: { steps: 30, cfg_scale: 10 },
    }

    // Map style to style presets
    const stylePresets: Record<string, any> = {
      flat: { sampler_name: 'euler', scheduler: 'simple' },
      vintage: { sampler_name: 'ddim', scheduler: 'karras' },
      ink: { sampler_name: 'uni_pc', scheduler: 'normal' },
      modern_minimal: { sampler_name: 'dpmpp_2m', scheduler: 'karras' },
    }

    const densityParams = densityMap[options.density]
    const styleParams = stylePresets[options.style] || stylePresets.flat

    return {
      // ComfyUI workflow JSON
      // This is a template - replace with your actual workflow
      '1': {
        class_type: 'KSampler',
        inputs: {
          seed: options.seed || Math.floor(Math.random() * 1000000),
          steps: densityParams.steps,
          cfg: densityParams.cfg_scale,
          sampler_name: styleParams.sampler_name,
          scheduler: styleParams.scheduler,
          denoise: 1,
          model: ['4', 0],
          positive: ['6', 0],
          negative: ['7', 0],
          latent_image: ['5', 0],
        },
      },
      '2': {
        class_type: 'VAEDecode',
        inputs: {
          samples: ['1', 0],
          vae: ['4', 2],
        },
      },
      '3': {
        class_type: 'SaveImage',
        inputs: {
          images: ['2', 0],
        },
      },
      '4': {
        class_type: 'CheckpointLoaderSimple',
        inputs: {
          ckpt_name: 'model.safetensors',
        },
      },
      '5': {
        class_type: 'EmptyLatentImage',
        inputs: {
          width: options.width || 1024,
          height: options.height || 1024,
          batch_size: 1,
        },
      },
      '6': {
        class_type: 'CLIPTextEncode',
        inputs: {
          text: this.buildPrompt(options),
          clip: ['4', 1],
        },
      },
      '7': {
        class_type: 'CLIPTextEncode',
        inputs: {
          text: 'ugly, blurry, low quality, distorted',
          clip: ['4', 1],
        },
      },
    }
  }

  /**
   * Build ComfyUI workflow for mockup generation.
   */
  private buildMockupWorkflow(options: GenerateMockupsOptions): any {
    // Product-specific templates
    const productTemplates: Record<string, any> = {
      mug: {
        width: 1024,
        height: 1024,
        template_path: 'templates/mug.png',
      },
      phone_case: {
        width: 1080,
        height: 1920,
        template_path: `templates/phone_${options.size || 'iphone14'}.png`,
      },
      tshirt: {
        width: 1024,
        height: 1024,
        template_path: 'templates/tshirt.png',
      },
    }

    const template = productTemplates[options.productType] || productTemplates.mug

    return {
      // ComfyUI workflow JSON for mockup generation
      // This should include:
      // 1. Load pattern image
      // 2. Apply to product template
      // 3. Generate multiple views
      '1': {
        class_type: 'LoadImage',
        inputs: {
          image: options.patternImageUrl,
        },
      },
      '2': {
        class_type: 'ImageComposite',
        inputs: {
          images: [['1', 0], ['1', 0], ['1', 0]], // For each view
          template: template.template_path,
        },
      },
      '3': {
        class_type: 'SaveImage',
        inputs: {
          images: ['2', 0],
        },
      },
    }
  }

  /**
   * Build a text prompt from options.
   */
  private buildPrompt(options: GeneratePatternOptions): string {
    const keywordString = options.keywords.join(', ')
    const styleString = {
      flat: 'flat design, vector style, minimalist',
      vintage: 'vintage style, retro, nostalgic, aged texture',
      ink: 'Chinese ink wash painting style, watercolor, brush strokes',
      modern_minimal: 'modern minimal, clean, geometric',
    }[options.style]

    const colorString = {
      warm: 'warm colors, orange, red, yellow tones',
      cool: 'cool colors, blue, green, purple tones',
      natural: 'natural colors, earth tones, greens and browns',
      elegant: 'elegant colors, gold, deep purple, navy',
      vibrant: 'vibrant colors, bright, saturated',
    }[options.colorMood]

    const densityString = {
      sparse: 'lots of negative space, sparse elements',
      medium: 'balanced composition',
      dense: 'intricate pattern, detailed, complex',
    }[options.density]

    return `seamless pattern of ${keywordString}, ${styleString}, ${colorString}, ${densityString}, high quality, detailed`
  }

  /**
   * Execute a function with exponential backoff retry.
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = COMFY_MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        if (error instanceof ComfyError) {
          if (!error.retryable) {
            throw error
          }

          // Don't retry client errors
          if (error.code && parseInt(error.code) >= 400 && parseInt(error.code) < 500) {
            throw error
          }
        }

        if (attempt < maxRetries - 1) {
          const delay = COMFY_RETRY_DELAY_BASE * Math.pow(2, attempt)
          await this.delay(delay)
        }
      }
    }

    throw lastError || new ComfyError('Operation failed after retries')
  }

  /**
   * Check if a status code is retryable.
   */
  private isRetryable(statusCode: number): boolean {
    return (
      statusCode === 408 || // Request Timeout
      statusCode === 429 || // Too Many Requests
      statusCode >= 500 // Server errors
    )
  }

  /**
   * Delay helper.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Default ComfyUI client instance.
 */
export const comfyClient = new ComfyClient()
