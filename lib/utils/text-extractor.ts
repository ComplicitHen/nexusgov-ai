/**
 * Text extraction utilities for various file formats
 * Supports PDF, DOCX, XLSX, TXT
 */

export interface ExtractedText {
  content: string;
  pageCount?: number;
  metadata?: Record<string, any>;
}

/**
 * Extract text from PDF using pdf-parse
 */
async function extractFromPDF(arrayBuffer: ArrayBuffer): Promise<ExtractedText> {
  try {
    // Dynamic import to avoid edge runtime issues
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(Buffer.from(arrayBuffer));

    return {
      content: data.text,
      pageCount: data.numpages,
      metadata: {
        info: data.info,
        version: data.version,
      },
    };
  } catch (error: any) {
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

/**
 * Extract text from DOCX using mammoth
 */
async function extractFromDOCX(arrayBuffer: ArrayBuffer): Promise<ExtractedText> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer });

    return {
      content: result.value,
      metadata: {
        messages: result.messages,
      },
    };
  } catch (error: any) {
    throw new Error(`DOCX extraction failed: ${error.message}`);
  }
}

/**
 * Extract text from Excel files
 */
async function extractFromXLSX(arrayBuffer: ArrayBuffer): Promise<ExtractedText> {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    let content = '';
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_txt(sheet);
      content += `\n\n=== ${sheetName} ===\n${sheetData}`;
    });

    return {
      content: content.trim(),
      metadata: {
        sheetCount: workbook.SheetNames.length,
        sheetNames: workbook.SheetNames,
      },
    };
  } catch (error: any) {
    throw new Error(`XLSX extraction failed: ${error.message}`);
  }
}

/**
 * Extract text from plain text file
 */
async function extractFromText(arrayBuffer: ArrayBuffer): Promise<ExtractedText> {
  const decoder = new TextDecoder('utf-8');
  const content = decoder.decode(arrayBuffer);

  return {
    content,
  };
}

/**
 * Main extraction function - determines file type and extracts text
 */
export async function extractText(
  arrayBuffer: ArrayBuffer,
  fileType: string
): Promise<ExtractedText> {
  const normalizedType = fileType.toLowerCase();

  if (normalizedType.includes('pdf')) {
    return extractFromPDF(arrayBuffer);
  } else if (
    normalizedType.includes('word') ||
    normalizedType.includes('docx') ||
    normalizedType.includes('document')
  ) {
    return extractFromDOCX(arrayBuffer);
  } else if (
    normalizedType.includes('spreadsheet') ||
    normalizedType.includes('excel') ||
    normalizedType.includes('xlsx')
  ) {
    return extractFromXLSX(arrayBuffer);
  } else if (normalizedType.includes('text') || normalizedType.includes('txt')) {
    return extractFromText(arrayBuffer);
  } else {
    // Default to text extraction
    return extractFromText(arrayBuffer);
  }
}

/**
 * Validate if file type is supported
 */
export function isSupportedFileType(fileType: string): boolean {
  const supportedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/plain',
  ];

  return supportedTypes.some((type) => fileType.includes(type));
}
