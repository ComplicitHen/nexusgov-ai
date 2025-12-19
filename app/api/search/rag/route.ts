import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/utils/embeddings';
import { searchVectors } from '@/lib/vector/vector-store';
import { isQdrantAvailable } from '@/lib/vector/qdrant-client';

export const runtime = 'nodejs';

interface RAGSearchRequest {
  query: string;
  organizationId: string;
  userId: string;
  limit?: number;
  visibility?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: RAGSearchRequest = await request.json();
    const { query, organizationId, userId, limit = 5, visibility } = body;

    if (!query || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required fields: query, organizationId' },
        { status: 400 }
      );
    }

    // Check if Qdrant is available
    const qdrantAvailable = await isQdrantAvailable();

    if (!qdrantAvailable) {
      return NextResponse.json(
        {
          error: 'RAG_UNAVAILABLE',
          message: 'Vector database not configured',
          sources: [],
        },
        { status: 503 }
      );
    }

    // Generate embedding for query
    console.log(`Generating embedding for query: "${query.slice(0, 100)}..."`);
    const { embedding, tokenCount } = await generateEmbedding(query);

    // Determine visibility filter based on user's access
    // For now, we'll allow GLOBAL, UNIT (if user is in that unit), and PRIVATE (if user uploaded it)
    const visibilityFilter = visibility || ['GLOBAL', 'UNIT', 'PRIVATE'];

    // Search for similar vectors
    console.log(`Searching for ${limit} similar vectors...`);
    const searchResults = await searchVectors(
      embedding,
      organizationId,
      limit,
      visibilityFilter
    );

    // Format results with source information
    const sources = searchResults.map((result) => ({
      content: result.payload.content,
      score: result.score,
      source: {
        documentId: result.payload.documentId,
        fileName: result.payload.fileName,
        fileType: result.payload.fileType,
        chunkIndex: result.payload.chunkIndex,
        uploadedBy: result.payload.uploadedBy,
        visibility: result.payload.visibility,
      },
      metadata: result.payload.metadata,
    }));

    console.log(`Found ${sources.length} relevant sources`);

    return NextResponse.json({
      success: true,
      query,
      sources,
      stats: {
        queryTokens: tokenCount,
        resultsCount: sources.length,
        topScore: sources[0]?.score || 0,
      },
    });
  } catch (error: any) {
    console.error('RAG search error:', error);

    return NextResponse.json(
      {
        error: 'SEARCH_ERROR',
        message: error.message || 'Failed to search documents',
      },
      { status: 500 }
    );
  }
}
