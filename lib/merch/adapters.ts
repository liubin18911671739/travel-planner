/**
 * Product Adapter Interface
 *
 * Abstract interface for merchandise generation providers.
 * Enables swapping between ComfyUI, Printify, Shopify, etc.
 */

import type {
  MerchProductType,
  MerchStyleLock,
  MerchDensity,
  MerchColorMood,
} from '@/lib/types'

export type ViewType = 'front' | 'side' | 'back' | 'context'

/**
 * Pattern generation options.
 */
export interface GeneratePatternOptions {
  keywords: string[]
  colorMood: MerchColorMood
  density: MerchDensity
  style: MerchStyleLock
  width?: number
  height?: number
  seed?: number
  itineraryContext?: ItineraryContext
}

/**
 * Itinerary context for themed patterns.
 */
export interface ItineraryContext {
  destination: string
  highlights?: string[]
  themes?: string[]
  settings?: Record<string, any>
}

/**
 * Product specification for mockup generation.
 */
export interface ProductSpec {
  type: MerchProductType
  size?: string
  views: ViewType[]
  printArea: PrintArea
  metadata?: Record<string, any>
}

/**
 * Print area dimensions.
 */
export interface PrintArea {
  width: number  // mm
  height: number // mm
  dpi?: number   // default 300
}

/**
 * Generated mockup result.
 */
export interface MockupResult {
  viewType: ViewType
  imageBuffer: Buffer
  imageUrl: string
  metadata?: Record<string, any>
}

/**
 * Generated pattern result.
 */
export interface PatternResult {
  imageBuffer: Buffer
  imageUrl: string
  metadata?: Record<string, any>
}

/**
 * Product variant information for external services.
 */
export interface ProductVariant {
  id: string
  size?: string
  color?: string
  price?: number
  currency?: string
}

/**
 * Abstract interface for merchandise generation providers.
 *
 * Implementations:
 * - ComfyProductAdapter: Local ComfyUI server
 * - PrintifyAdapter: Printify API (future)
 * - ShopifyAdapter: Shopify Printful/App (future)
 */
export interface ProductAdapter {
  /**
   * Get the provider name.
   */
  readonly name: string

  /**
   * Get supported product types.
   */
  getSupportedProducts(): MerchProductType[]

  /**
   * Get available sizes for a product type.
   */
  getAvailableSizes(productType: MerchProductType): string[]

  /**
   * Get available views for a product type.
   */
  getAvailableViews(productType: MerchProductType): ViewType[]

  /**
   * Get print area specifications for a product.
   */
  getPrintArea(productType: MerchProductType, size?: string): PrintArea

  /**
   * Generate a seamless pattern.
   *
   * @param options - Pattern generation options
   * @returns Generated pattern image
   */
  generatePattern(options: GeneratePatternOptions): Promise<PatternResult>

  /**
   * Generate product mockups with pattern applied.
   *
   * @param pattern - Pattern image buffer
   * @param product - Product specification
   * @returns Array of generated mockup images
   */
  generateMockups(
    pattern: Buffer,
    product: ProductSpec
  ): Promise<MockupResult[]>

  /**
   * Check if the provider is available/configured.
   */
  isAvailable(): boolean
}

/**
 * Product metadata for external providers.
 */
export interface ExternalProductInfo {
  providerId: string  // e.g., Printify product ID
  variantId?: string // e.g., specific size/color variant
  printProvider?: string // Printful, Printify, etc.
  externalUrl?: string // Link to external product page
}

/**
 * Validate product spec against adapter capabilities.
 */
export function validateProductSpec(
  adapter: ProductAdapter,
  spec: ProductSpec
): { valid: boolean; error?: string } {
  if (!adapter.getSupportedProducts().includes(spec.type)) {
    return {
      valid: false,
      error: `Product type ${spec.type} not supported by ${adapter.name}`,
    }
  }

  if (spec.size && !adapter.getAvailableSizes(spec.type).includes(spec.size)) {
    return {
      valid: false,
      error: `Size ${spec.size} not available for ${spec.type}`,
    }
  }

  for (const view of spec.views) {
    if (!adapter.getAvailableViews(spec.type).includes(view)) {
      return {
        valid: false,
        error: `View ${view} not available for ${spec.type}`,
      }
    }
  }

  return { valid: true }
}

/**
 * Default print area configurations (in mm).
 */
export const DEFAULT_PRINT_AREAS: Record<MerchProductType, Record<string, PrintArea>> = {
  mug: {
    default: { width: 200, height: 90, dpi: 300 },
    '350ml': { width: 180, height: 80, dpi: 300 },
    '500ml': { width: 200, height: 90, dpi: 300 },
    '750ml': { width: 220, height: 100, dpi: 300 },
  },
  phone_case: {
    default: { width: 150, height: 280, dpi: 300 },
    'iPhone 14': { width: 147, height: 282, dpi: 300 },
    'iPhone 15': { width: 147, height: 283, dpi: 300 },
    'Samsung S24': { width: 147, height: 280, dpi: 300 },
  },
  tshirt: {
    default: { width: 350, height: 400, dpi: 300 },
    S: { width: 300, height: 350, dpi: 300 },
    M: { width: 350, height: 400, dpi: 300 },
    L: { width: 380, height: 430, dpi: 300 },
    XL: { width: 410, height: 460, dpi: 300 },
    XXL: { width: 440, height: 490, dpi: 300 },
  },
}

/**
 * Get default print area for a product.
 */
export function getDefaultPrintArea(
  productType: MerchProductType,
  size?: string
): PrintArea {
  const areas = DEFAULT_PRINT_AREAS[productType]
  return areas[size || 'default'] || areas.default
}
