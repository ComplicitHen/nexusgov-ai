/**
 * Qdrant vector database client
 * For storing and searching document embeddings
 */

import { QdrantClient } from '@qdrant/js-client-rest';

// Initialize Qdrant client
let qdrantClient: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (!qdrantClient) {
    const qdrantUrl = process.env.QDRANT_URL;
    const qdrantApiKey = process.env.QDRANT_API_KEY;

    if (!qdrantUrl) {
      throw new Error('QDRANT_URL environment variable is not set');
    }

    qdrantClient = new QdrantClient({
      url: qdrantUrl,
      apiKey: qdrantApiKey, // Optional - only if Qdrant has auth enabled
    });

    console.log(`Qdrant client initialized: ${qdrantUrl}`);
  }

  return qdrantClient;
}

/**
 * Check if Qdrant is configured and reachable
 */
export async function isQdrantAvailable(): Promise<boolean> {
  try {
    if (!process.env.QDRANT_URL) {
      return false;
    }

    const client = getQdrantClient();
    await client.getCollections();
    return true;
  } catch (error) {
    console.error('Qdrant not available:', error);
    return false;
  }
}

/**
 * Get Qdrant configuration info
 */
export function getQdrantInfo() {
  return {
    url: process.env.QDRANT_URL || 'Not configured',
    hasApiKey: !!process.env.QDRANT_API_KEY,
  };
}
