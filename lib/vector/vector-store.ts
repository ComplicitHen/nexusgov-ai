/**
 * Vector store service for managing document embeddings in Qdrant
 */

import { getQdrantClient } from './qdrant-client';

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: {
    documentId: string;
    organizationId: string;
    content: string;
    chunkIndex: number;
    fileName: string;
    fileType: string;
    uploadedBy: string;
    visibility: string;
    metadata?: Record<string, any>;
  };
}

export interface SearchResult {
  id: string;
  score: number;
  payload: VectorPoint['payload'];
}

const COLLECTION_NAME = 'nexusgov_documents';
const VECTOR_SIZE = 1536; // text-embedding-3-small dimensions

/**
 * Ensure collection exists, create if not
 */
export async function ensureCollection(): Promise<void> {
  const client = getQdrantClient();

  try {
    // Check if collection exists
    const collections = await client.getCollections();
    const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);

    if (!exists) {
      console.log(`Creating Qdrant collection: ${COLLECTION_NAME}`);

      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 1,
      });

      // Create payload indexes for filtering
      await client.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'organizationId',
        field_schema: 'keyword',
      });

      await client.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'documentId',
        field_schema: 'keyword',
      });

      await client.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'visibility',
        field_schema: 'keyword',
      });

      console.log('Collection created successfully');
    }
  } catch (error: any) {
    console.error('Error ensuring collection:', error);
    throw new Error(`Failed to ensure collection: ${error.message}`);
  }
}

/**
 * Upload vectors to Qdrant
 */
export async function upsertVectors(points: VectorPoint[]): Promise<void> {
  if (points.length === 0) return;

  const client = getQdrantClient();

  try {
    await ensureCollection();

    const qdrantPoints = points.map((point) => ({
      id: point.id,
      vector: point.vector,
      payload: point.payload,
    }));

    await client.upsert(COLLECTION_NAME, {
      wait: true,
      points: qdrantPoints,
    });

    console.log(`Upserted ${points.length} vectors to Qdrant`);
  } catch (error: any) {
    console.error('Error upserting vectors:', error);
    throw new Error(`Failed to upsert vectors: ${error.message}`);
  }
}

/**
 * Search for similar vectors
 */
export async function searchVectors(
  queryVector: number[],
  organizationId: string,
  limit: number = 10,
  visibility?: string[]
): Promise<SearchResult[]> {
  const client = getQdrantClient();

  try {
    // Build filter
    const filter: any = {
      must: [
        {
          key: 'organizationId',
          match: { value: organizationId },
        },
      ],
    };

    // Add visibility filter if provided
    if (visibility && visibility.length > 0) {
      filter.must.push({
        key: 'visibility',
        match: { any: visibility },
      });
    }

    const searchResult = await client.search(COLLECTION_NAME, {
      vector: queryVector,
      filter,
      limit,
      with_payload: true,
      with_vector: false,
    });

    return searchResult.map((result) => ({
      id: result.id as string,
      score: result.score,
      payload: result.payload as VectorPoint['payload'],
    }));
  } catch (error: any) {
    console.error('Error searching vectors:', error);
    throw new Error(`Failed to search vectors: ${error.message}`);
  }
}

/**
 * Delete vectors by document ID
 */
export async function deleteVectorsByDocument(documentId: string): Promise<void> {
  const client = getQdrantClient();

  try {
    await client.delete(COLLECTION_NAME, {
      wait: true,
      filter: {
        must: [
          {
            key: 'documentId',
            match: { value: documentId },
          },
        ],
      },
    });

    console.log(`Deleted vectors for document: ${documentId}`);
  } catch (error: any) {
    console.error('Error deleting vectors:', error);
    throw new Error(`Failed to delete vectors: ${error.message}`);
  }
}

/**
 * Get collection info
 */
export async function getCollectionInfo() {
  const client = getQdrantClient();

  try {
    const info = await client.getCollection(COLLECTION_NAME);
    return {
      vectorCount: info.vectors_count || 0,
      pointsCount: info.points_count || 0,
      status: info.status,
      config: {
        vectorSize: VECTOR_SIZE,
        distance: 'Cosine',
      },
    };
  } catch (error: any) {
    if (error.message?.includes('Not found')) {
      return {
        vectorCount: 0,
        pointsCount: 0,
        status: 'not_created',
        config: {
          vectorSize: VECTOR_SIZE,
          distance: 'Cosine',
        },
      };
    }
    throw error;
  }
}

/**
 * Scroll through all points (for debugging/migration)
 */
export async function scrollPoints(limit: number = 100, offset?: string) {
  const client = getQdrantClient();

  try {
    const result = await client.scroll(COLLECTION_NAME, {
      limit,
      offset,
      with_payload: true,
      with_vector: false,
    });

    return {
      points: result.points,
      nextOffset: result.next_page_offset,
    };
  } catch (error: any) {
    console.error('Error scrolling points:', error);
    throw new Error(`Failed to scroll points: ${error.message}`);
  }
}
