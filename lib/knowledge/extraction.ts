/**
 * Text Extraction Utilities
 *
 * Supports PDF, DOCX, TXT, and image files (OCR).
 * For production, install the required dependencies:
 * - PDF: pdf-parse or pdfjs-dist
 * - DOCX: mammoth
 * - Images: tesseract.js
 */

export interface ExtractedText {
  text: string
  metadata: {
    fileType: string
    pageCount?: number
    charCount: number
    [key: string]: any
  }
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
 * Extract text from PDF file.
 *
 * TODO: Implement with pdf-parse or pdfjs-dist
 * Install: npm install pdf-parse
 *
 * @param buffer - PDF file buffer
 * @returns Extracted text with page metadata
 */
async function extractTextFromPDF(buffer: Buffer): Promise<ExtractedText> {
  // Placeholder implementation
  // In production:
  //
  // import pdf from 'pdf-parse'
  //
  // const data = await pdf(buffer)
  // return {
  //   text: data.text,
  //   metadata: {
  //     fileType: 'PDF',
  //     pageCount: data.numpages,
  //     charCount: data.text.length,
  //     info: data.info,
  //   }
  // }

  return {
    text: '[PDF content extraction not implemented. Install pdf-parse to enable.]',
    metadata: {
      fileType: 'PDF',
      pageCount: 0,
      charCount: 0,
    },
  }
}

/**
 * Extract text from DOCX file.
 *
 * TODO: Implement with mammoth
 * Install: npm install mammoth
 *
 * @param buffer - DOCX file buffer
 * @returns Extracted text with metadata
 */
async function extractTextFromDOCX(buffer: Buffer): Promise<ExtractedText> {
  // Placeholder implementation
  // In production:
  //
  // import mammoth from 'mammoth'
  //
  // const result = await mammoth.extractRawText({ buffer })
  // return {
  //   text: result.value,
  //   metadata: {
  //     fileType: 'DOCX',
  //     charCount: result.value.length,
  //     messages: result.messages,
  //   }
  // }

  return {
    text: '[DOCX content extraction not implemented. Install mammoth to enable.]',
    metadata: {
      fileType: 'DOCX',
      charCount: 0,
    },
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
 * Extract text from image using OCR.
 *
 * TODO: Implement with tesseract.js
 * Install: npm install tesseract.js
 *
 * @param buffer - Image file buffer
 * @param fileType - Image file type
 * @returns Extracted text with metadata
 */
async function extractTextFromImage(
  buffer: Buffer,
  fileType: 'JPG' | 'JPEG' | 'PNG'
): Promise<ExtractedText> {
  // Placeholder implementation
  // In production:
  //
  // import Tesseract from 'tesseract.js'
  //
  // const { data: { text, confidence } } = await Tesseract.recognize(
  //   Buffer.from(buffer),
  //   'chi_sim+eng' // Chinese simplified + English
  // )
  //
  // return {
  //   text,
  //   metadata: {
  //     fileType,
  //     ocrConfidence: confidence,
  //     charCount: text.length,
  //   }
  // }

  return {
    text: '[Image OCR not implemented. Install tesseract.js to enable.]',
    metadata: {
      fileType,
      ocrConfidence: 0,
      charCount: 0,
    },
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
