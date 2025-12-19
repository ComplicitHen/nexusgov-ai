/**
 * Text chunking utilities for RAG
 * Splits text into overlapping chunks suitable for embeddings
 */

export interface TextChunk {
  content: string;
  index: number;
  startChar: number;
  endChar: number;
  tokenCount?: number;
}

export interface ChunkingOptions {
  chunkSize?: number; // Target characters per chunk
  chunkOverlap?: number; // Overlap between chunks in characters
  minChunkSize?: number; // Minimum chunk size
  preserveParagraphs?: boolean; // Try to keep paragraphs intact
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text by paragraphs
 */
function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Split text by sentences (basic implementation)
 */
function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Create overlapping chunks from text
 */
export function chunkText(text: string, options: ChunkingOptions = {}): TextChunk[] {
  const {
    chunkSize = 1000, // ~250 tokens
    chunkOverlap = 200, // ~50 tokens overlap
    minChunkSize = 100,
    preserveParagraphs = true,
  } = options;

  const chunks: TextChunk[] = [];

  if (text.length <= chunkSize) {
    // Text is small enough to be a single chunk
    return [
      {
        content: text,
        index: 0,
        startChar: 0,
        endChar: text.length,
        tokenCount: estimateTokens(text),
      },
    ];
  }

  if (preserveParagraphs) {
    // Try to split by paragraphs first
    const paragraphs = splitIntoParagraphs(text);
    let currentChunk = '';
    let startChar = 0;
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const potentialChunk = currentChunk
        ? `${currentChunk}\n\n${paragraph}`
        : paragraph;

      if (potentialChunk.length <= chunkSize) {
        currentChunk = potentialChunk;
      } else {
        // Current chunk would be too large
        if (currentChunk.length >= minChunkSize) {
          // Save current chunk
          chunks.push({
            content: currentChunk,
            index: chunkIndex++,
            startChar,
            endChar: startChar + currentChunk.length,
            tokenCount: estimateTokens(currentChunk),
          });

          // Start new chunk with overlap
          const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
          const overlap = currentChunk.slice(overlapStart);
          currentChunk = `${overlap}\n\n${paragraph}`;
          startChar += currentChunk.length - overlap.length;
        } else {
          // Current chunk is too small, just add paragraph
          currentChunk = potentialChunk;
        }

        // If paragraph itself is larger than chunkSize, split it by sentences
        if (paragraph.length > chunkSize) {
          const sentences = splitIntoSentences(paragraph);
          currentChunk = '';

          for (const sentence of sentences) {
            if ((currentChunk + ' ' + sentence).length <= chunkSize) {
              currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
            } else {
              if (currentChunk.length >= minChunkSize) {
                chunks.push({
                  content: currentChunk,
                  index: chunkIndex++,
                  startChar,
                  endChar: startChar + currentChunk.length,
                  tokenCount: estimateTokens(currentChunk),
                });
                startChar += currentChunk.length;
              }
              currentChunk = sentence;
            }
          }
        }
      }
    }

    // Add final chunk
    if (currentChunk.length >= minChunkSize) {
      chunks.push({
        content: currentChunk,
        index: chunkIndex,
        startChar,
        endChar: startChar + currentChunk.length,
        tokenCount: estimateTokens(currentChunk),
      });
    }
  } else {
    // Simple sliding window approach
    let startChar = 0;
    let chunkIndex = 0;

    while (startChar < text.length) {
      const endChar = Math.min(startChar + chunkSize, text.length);
      const chunk = text.slice(startChar, endChar);

      if (chunk.length >= minChunkSize) {
        chunks.push({
          content: chunk,
          index: chunkIndex++,
          startChar,
          endChar,
          tokenCount: estimateTokens(chunk),
        });
      }

      startChar += chunkSize - chunkOverlap;
    }
  }

  return chunks;
}

/**
 * Get statistics about chunks
 */
export function getChunkingStats(chunks: TextChunk[]) {
  const sizes = chunks.map((c) => c.content.length);
  const tokens = chunks.map((c) => c.tokenCount || 0);

  return {
    chunkCount: chunks.length,
    avgChunkSize: sizes.reduce((a, b) => a + b, 0) / sizes.length,
    minChunkSize: Math.min(...sizes),
    maxChunkSize: Math.max(...sizes),
    avgTokens: tokens.reduce((a, b) => a + b, 0) / tokens.length,
    totalTokens: tokens.reduce((a, b) => a + b, 0),
  };
}
