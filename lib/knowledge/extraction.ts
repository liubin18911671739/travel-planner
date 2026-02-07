/**
 * Text Extraction Utilities
 *
 * Supports PDF, DOCX, TXT, and image files (OCR).
 *
 * Dependencies:
 * - PDF: pdf-parse (installed)
 * - DOCX: mammoth (installed)
 * - Images: tesseract.js (installed)
 */

export interface ExtractedText {
  text: string
  metadata: {
    fileType: string
    pageCount?: number
    charCount: number
    [key: string]: unknown
  }
}

type OCRLoggerMessage = {
  status?: string
  progress?: number
}

function isOCRLoggerMessage(value: unknown): value is OCRLoggerMessage {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    (typeof record.status === 'string' || record.status === undefined) &&
    (typeof record.progress === 'number' || record.progress === undefined)
  )
}

export type FileType = 'PDF' | 'DOCX' | 'TXT' | 'JPG' | 'JPEG' | 'PNG'

/**
 * Extract text from a file buffer based on its type.
 *
 * @param buffer - File buffer
 * @param fileType - File type
 * @returns Extracted text with metadata
 */
export async function extractText(
  buffer: Buffer,
  fileType: FileType
): Promise<ExtractedText> {
  switch (fileType) {
    case 'PDF':
      return await extractTextFromPDF(buffer)
    case 'DOCX':
      return await extractTextFromDOCX(buffer)
    case 'TXT':
      return await extractTextFromTXT(buffer)
    case 'JPG':
    case 'JPEG':
    case 'PNG':
      return await extractTextFromImage(buffer, fileType)
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

/**
 * Extract text from PDF file using pdf-parse.
 *
 * @param buffer - PDF file buffer
 * @returns Extracted text with page metadata
 */
async function extractTextFromPDF(buffer: Buffer): Promise<ExtractedText> {
  try {
    // Dynamic import to avoid Next.js bundling issues with native modules
    const pdf = (await import('pdf-parse')).default

    const data = await pdf(buffer)

    // Clean up extracted text
    const text = data.text
      .replace(/\x00/g, '') // Remove null bytes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()

    // Validate extraction succeeded
    if (!text || text.length < 5) {
      throw new Error('PDF extraction produced empty or invalid text')
    }

    return {
      text,
      metadata: {
        fileType: 'PDF',
        pageCount: data.numpages,
        charCount: text.length,
        pdfInfo: {
          title: data.info?.Title || null,
          author: data.info?.Author || null,
          subject: data.info?.Subject || null,
          creator: data.info?.Creator || null,
          creationDate: data.info?.CreationDate || null,
        },
      },
    }
  } catch (error) {
    // Provide meaningful error messages for common failures
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF')) {
        throw new Error('Invalid or corrupted PDF file')
      }
      if (error.message.includes('password')) {
        throw new Error('Password-protected PDFs are not supported')
      }
    }
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Extract text from DOCX file using mammoth.
 *
 * @param buffer - DOCX file buffer
 * @returns Extracted text with metadata
 */
async function extractTextFromDOCX(buffer: Buffer): Promise<ExtractedText> {
  try {
    // Dynamic import for Next.js compatibility
    const mammoth = await import('mammoth')

    // Extract raw text (preserves paragraph structure)
    const result = await mammoth.extractRawText({ buffer })

    // Clean up the extracted text
    const text = result.value
      .replace(/\x00/g, '') // Remove null bytes
      .replace(/\f/g, '\n\n') // Convert form feeds to paragraph breaks
      .trim()

    // Validate extraction succeeded
    if (!text || text.length < 5) {
      throw new Error('DOCX extraction produced empty or invalid text')
    }

    // Count paragraphs for metadata
    const paragraphCount = text.split('\n\n').filter((p) => p.trim().length > 0).length

    return {
      text,
      metadata: {
        fileType: 'DOCX',
        charCount: text.length,
        paragraphCount,
        // Mammoth messages (warnings about unsupported features)
        hasWarnings: result.messages.length > 0,
      },
    }
  } catch (error) {
    // Provide meaningful error messages
    if (error instanceof Error) {
      if (error.message.includes('not a valid DOCX')) {
        throw new Error('Invalid or corrupted DOCX file')
      }
    }
    throw new Error(`DOCX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Extract text from TXT file.
 *
 * @param buffer - TXT file buffer
 * @returns Extracted text with metadata
 */
async function extractTextFromTXT(buffer: Buffer): Promise<ExtractedText> {
  // Try to decode as UTF-8, fallback to latin1
  let text: string
  try {
    text = buffer.toString('utf-8')
  } catch {
    text = buffer.toString('latin1')
  }

  // Clean up BOM if present
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1)
  }

  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  return {
    text,
    metadata: {
      fileType: 'TXT',
      charCount: text.length,
      lineCount: text.split('\n').length,
    },
  }
}

/**
 * Extract text from image using OCR with tesseract.js.
 *
 * Supports Chinese (Simplified) and English text recognition.
 *
 * @param buffer - Image file buffer
 * @param fileType - Image file type (JPG, JPEG, PNG)
 * @returns Extracted text with OCR metadata
 */
async function extractTextFromImage(
  buffer: Buffer,
  fileType: 'JPG' | 'JPEG' | 'PNG'
): Promise<ExtractedText> {
  try {
    // Dynamic import to avoid Next.js bundling issues
    const Tesseract = await import('tesseract.js')

    // Recognize text with Chinese + English
    const { data } = await Tesseract.recognize(
      buffer,
      'chi_sim+eng',
      {
        logger: (m: unknown) => {
          // Log OCR progress for debugging
          if (isOCRLoggerMessage(m) && m.status === 'recognizing text') {
            const progress = Math.round((m.progress || 0) * 100)
            console.log(`[OCR] Progress: ${progress}%`)
          }
        },
      }
    )

    const text = data.text.trim()
    const confidence = data.confidence

    // Validate extraction quality
    if (!text || text.length < 3) {
      throw new Error('OCR extraction produced empty or invalid text')
    }

    // Warn on low confidence but still return results
    if (confidence < 50) {
      console.warn(
        `[OCR] Low confidence (${confidence.toFixed(1)}%), results may be inaccurate`
      )
    }

    // Count words and lines from blocks structure
    let wordCount = 0
    let lineCount = 0
    if (data.blocks) {
      for (const block of data.blocks) {
        for (const para of block.paragraphs) {
          lineCount += para.lines.length
          for (const line of para.lines) {
            wordCount += line.words.length
          }
        }
      }
    }

    return {
      text,
      metadata: {
        fileType,
        ocrConfidence: confidence,
        charCount: text.length,
        ocrEngine: 'tesseract.js',
        words: wordCount,
        lines: lineCount,
      },
    }
  } catch (error) {
    // Provide meaningful error messages
    if (error instanceof Error) {
      if (error.message.includes('buffer')) {
        throw new Error('Invalid image format or corrupted image file')
      }
    }
    throw new Error(
      `Image OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Clean extracted text by removing excessive whitespace and artifacts.
 *
 * @param text - Raw extracted text
 * @returns Cleaned text
 */
export function cleanExtractedText(text: string): string {
  return text
    // Replace multiple spaces with single space
    .replace(/[ \t]+/g, ' ')
    // Replace multiple newlines with double newline (paragraph break)
    .replace(/\n{3,}/g, '\n\n')
    // Remove leading/trailing whitespace from lines
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim()
}

/**
 * Validate extracted text meets minimum quality standards.
 *
 * @param extracted - Extracted text result
 * @param minChars - Minimum character count (default: 10)
 * @returns True if text is valid
 */
export function isValidExtractedText(
  extracted: ExtractedText,
  minChars: number = 10
): boolean {
  const cleaned = cleanExtractedText(extracted.text)
  return cleaned.length >= minChars
}
