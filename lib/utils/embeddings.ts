/**
 * Embeddings generation utilities
 * Uses OpenAI's text-embedding-3-small model via OpenRouter
 */

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
  model: string;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  tokenCounts: number[];
  totalTokens: number;
  model: string;
}

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const MAX_BATCH_SIZE = 100; // OpenAI allows up to 2048, but we'll be conservative

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'NexusGov AI',
      },
      body: JSON.stringify({
        model: `openai/${EMBEDDING_MODEL}`,
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Embedding API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      embedding: data.data[0].embedding,
      tokenCount: data.usage.total_tokens,
      model: EMBEDDING_MODEL,
    };
  } catch (error: any) {
    console.error('Embedding generation failed:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple texts in batches
 */
export async function generateBatchEmbeddings(
  texts: string[]
): Promise<BatchEmbeddingResult> {
  if (texts.length === 0) {
    return {
      embeddings: [],
      tokenCounts: [],
      totalTokens: 0,
      model: EMBEDDING_MODEL,
    };
  }

  const embeddings: number[][] = [];
  const tokenCounts: number[] = [];
  let totalTokens = 0;

  // Process in batches
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'NexusGov AI',
        },
        body: JSON.stringify({
          model: `openai/${EMBEDDING_MODEL}`,
          input: batch,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Embedding API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      // Extract embeddings and token counts
      for (const item of data.data) {
        embeddings.push(item.embedding);
      }

      // OpenAI returns total tokens for the batch
      const batchTokens = data.usage.total_tokens;
      totalTokens += batchTokens;

      // Approximate individual token counts
      const avgTokensPerText = Math.ceil(batchTokens / batch.length);
      for (let j = 0; j < batch.length; j++) {
        tokenCounts.push(avgTokensPerText);
      }
    } catch (error: any) {
      console.error(`Batch embedding failed for batch ${i / MAX_BATCH_SIZE + 1}:`, error);
      throw new Error(`Failed to generate batch embeddings: ${error.message}`);
    }
  }

  return {
    embeddings,
    tokenCounts,
    totalTokens,
    model: EMBEDDING_MODEL,
  };
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Calculate embedding cost (OpenAI pricing: $0.00002 per 1K tokens)
 */
export function calculateEmbeddingCost(tokenCount: number): number {
  const SEK_PER_USD = 10.5; // Approximate exchange rate
  const COST_PER_1K_TOKENS = 0.00002; // USD
  return (tokenCount / 1000) * COST_PER_1K_TOKENS * SEK_PER_USD;
}

/**
 * Get embedding model info
 */
export function getEmbeddingModelInfo() {
  return {
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    maxTokens: 8191,
    costPer1KTokens: 0.00002, // USD
  };
}
