import { NextRequest, NextResponse } from 'next/server';
import { createChatCompletion } from '@/lib/ai/openrouter-client';
import { detectPII, getPIIWarningMessage, anonymizePII } from '@/lib/utils/pii-detector';
import { calculateCost } from '@/lib/ai/models';
import { generateEmbedding } from '@/lib/utils/embeddings';
import { searchVectors } from '@/lib/vector/vector-store';
import { isQdrantAvailable } from '@/lib/vector/qdrant-client';

export const runtime = 'nodejs'; // Changed from edge to support RAG with Qdrant

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messages,
      modelId,
      temperature,
      maxTokens,
      enablePIIScreening,
      enableRAG,
      organizationId,
      userId,
    } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    if (!modelId) {
      return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
    }

    // Get the last user message for PII screening and RAG
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();

    let piiDetection = null;
    let piiWarning = null;

    // PII Screening (if enabled)
    if (enablePIIScreening && lastUserMessage) {
      piiDetection = detectPII(lastUserMessage.content);

      if (piiDetection.hasPII) {
        piiWarning = getPIIWarningMessage(piiDetection, 'sv');

        // If severity is HIGH, block the request
        if (piiDetection.severity === 'HIGH') {
          return NextResponse.json(
            {
              error: 'PII_DETECTED',
              message: piiWarning,
              detection: piiDetection,
              suggestion: 'Använd anonymisera-knappen för att ta bort personuppgifter.',
            },
            { status: 403 }
          );
        }
      }
    }

    // RAG Search (if enabled)
    let ragSources = [];
    let ragContext = '';
    let processedMessages = [...messages];

    if (enableRAG && lastUserMessage && organizationId) {
      try {
        const qdrantAvailable = await isQdrantAvailable();

        if (qdrantAvailable) {
          console.log('Performing RAG search for:', lastUserMessage.content.slice(0, 100));

          // Generate embedding for the query
          const { embedding } = await generateEmbedding(lastUserMessage.content);

          // Search for relevant document chunks
          const searchResults = await searchVectors(
            embedding,
            organizationId,
            5, // Top 5 results
            ['GLOBAL', 'UNIT', 'PRIVATE'] // All visibility levels
          );

          if (searchResults.length > 0) {
            ragSources = searchResults.map((result) => ({
              content: result.payload.content,
              score: result.score,
              source: {
                documentId: result.payload.documentId,
                fileName: result.payload.fileName,
                fileType: result.payload.fileType,
                chunkIndex: result.payload.chunkIndex,
              },
            }));

            // Build context from search results
            ragContext = searchResults
              .map(
                (result, index) =>
                  `[Källa ${index + 1}: ${result.payload.fileName}]\n${result.payload.content}`
              )
              .join('\n\n');

            // Inject context into messages
            const contextMessage = {
              role: 'system',
              content: `Du har tillgång till följande relevant information från organisationens dokument. Använd denna information för att ge ett mer precist svar och referera till källorna när du använder information från dem.\n\n${ragContext}`,
            };

            // Insert context before the last user message
            processedMessages = [
              ...messages.slice(0, -1),
              contextMessage,
              lastUserMessage,
            ];

            console.log(`RAG: Found ${ragSources.length} relevant sources`);
          } else {
            console.log('RAG: No relevant documents found');
          }
        }
      } catch (error) {
        console.error('RAG search error:', error);
        // Continue without RAG if search fails
      }
    }

    // Call OpenRouter API
    const completion = await createChatCompletion({
      modelId,
      messages: processedMessages,
      temperature: temperature ?? 0.7,
      maxTokens,
    });

    // Calculate cost
    const cost = calculateCost(
      modelId,
      completion.usage.prompt_tokens,
      completion.usage.completion_tokens
    );

    // Return response with metadata and RAG sources
    return NextResponse.json({
      message: completion.choices[0]?.message,
      usage: completion.usage,
      cost,
      piiDetection: piiDetection?.hasPII ? piiDetection : null,
      piiWarning,
      model: modelId,
      ragSources: ragSources.length > 0 ? ragSources : null,
      ragEnabled: enableRAG && ragSources.length > 0,
    });
  } catch (error: any) {
    console.error('Chat API error:', error);

    return NextResponse.json(
      {
        error: 'CHAT_ERROR',
        message: error.message || 'An error occurred while processing your request',
      },
      { status: 500 }
    );
  }
}
