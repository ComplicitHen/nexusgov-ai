import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { extractText, isSupportedFileType } from '@/lib/utils/text-extractor';
import { chunkText, getChunkingStats } from '@/lib/utils/text-chunker';
import { generateBatchEmbeddings, calculateEmbeddingCost } from '@/lib/utils/embeddings';
import { upsertVectors } from '@/lib/vector/vector-store';
import { isQdrantAvailable } from '@/lib/vector/qdrant-client';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs'; // Need Node.js runtime for file processing libraries
export const maxDuration = 300; // 5 minutes for large documents

interface ProcessRequest {
  documentId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ProcessRequest = await request.json();
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    console.log(`Processing document: ${documentId}`);

    // 1. Fetch document metadata from Firestore
    const docRef = doc(db, 'documents', documentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const docData = docSnap.data();
    const { downloadURL, fileType, fileName, organizationId } = docData;

    // Validate file type
    if (!isSupportedFileType(fileType)) {
      await updateDoc(docRef, {
        status: 'ERROR',
        error: `Unsupported file type: ${fileType}`,
        processedAt: serverTimestamp(),
      });

      return NextResponse.json(
        { error: `Unsupported file type: ${fileType}` },
        { status: 400 }
      );
    }

    // 2. Download file from Firebase Storage
    console.log(`Downloading file: ${fileName}`);
    const fileResponse = await fetch(downloadURL);

    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.statusText}`);
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    console.log(`File downloaded: ${arrayBuffer.byteLength} bytes`);

    // 3. Extract text from file
    console.log(`Extracting text from ${fileType}...`);
    const extracted = await extractText(arrayBuffer, fileType);
    console.log(`Extracted ${extracted.content.length} characters`);

    if (!extracted.content || extracted.content.trim().length === 0) {
      await updateDoc(docRef, {
        status: 'ERROR',
        error: 'No text content could be extracted from file',
        processedAt: serverTimestamp(),
      });

      return NextResponse.json(
        { error: 'No text content extracted' },
        { status: 400 }
      );
    }

    // 4. Chunk the text
    console.log('Chunking text...');
    const chunks = chunkText(extracted.content, {
      chunkSize: 1000,
      chunkOverlap: 200,
      minChunkSize: 100,
      preserveParagraphs: true,
    });

    const chunkStats = getChunkingStats(chunks);
    console.log(`Created ${chunks.length} chunks:`, chunkStats);

    // 5. Generate embeddings for all chunks
    console.log('Generating embeddings...');
    const chunkTexts = chunks.map((c) => c.content);
    const embeddingResult = await generateBatchEmbeddings(chunkTexts);
    console.log(`Generated ${embeddingResult.embeddings.length} embeddings`);

    // 6. Store chunks with embeddings in Qdrant
    console.log('Storing vectors in Qdrant...');

    // Check if Qdrant is available
    const qdrantAvailable = await isQdrantAvailable();

    if (!qdrantAvailable) {
      console.warn('Qdrant not available, skipping vector storage');
      await updateDoc(docRef, {
        status: 'ERROR',
        error: 'Qdrant vector database not configured or unavailable',
        processedAt: serverTimestamp(),
      });

      return NextResponse.json(
        { error: 'Vector database not available' },
        { status: 500 }
      );
    }

    // Prepare vector points for Qdrant
    const vectorPoints = chunks.map((chunk, index) => ({
      id: `${documentId}_${chunk.index}_${nanoid(8)}`,
      vector: embeddingResult.embeddings[index],
      payload: {
        documentId,
        organizationId,
        content: chunk.content,
        chunkIndex: chunk.index,
        fileName,
        fileType,
        uploadedBy: docData.uploadedBy,
        visibility: docData.visibility || 'PRIVATE',
        metadata: {
          startChar: chunk.startChar,
          endChar: chunk.endChar,
          tokenCount: chunk.tokenCount,
        },
      },
    }));

    // Upload to Qdrant
    await upsertVectors(vectorPoints);
    console.log(`Uploaded ${vectorPoints.length} vectors to Qdrant`);

    // 7. Calculate costs
    const embeddingCost = calculateEmbeddingCost(embeddingResult.totalTokens);

    // 8. Update document status
    await updateDoc(docRef, {
      status: 'READY',
      vectorCount: chunks.length,
      embeddingModel: embeddingResult.model,
      embeddingTokens: embeddingResult.totalTokens,
      embeddingCost,
      processedAt: serverTimestamp(),
      metadata: {
        ...docData.metadata,
        extractedTextLength: extracted.content.length,
        pageCount: extracted.pageCount,
        chunkingStats: chunkStats,
      },
    });

    console.log(`Document processing completed: ${documentId}`);

    return NextResponse.json({
      success: true,
      documentId,
      stats: {
        textLength: extracted.content.length,
        chunkCount: chunks.length,
        embeddingTokens: embeddingResult.totalTokens,
        embeddingCost,
        chunkingStats,
      },
    });
  } catch (error: any) {
    console.error('Document processing error:', error);

    // Try to update document status to ERROR
    try {
      const body: ProcessRequest = await request.json();
      if (body.documentId) {
        const docRef = doc(db, 'documents', body.documentId);
        await updateDoc(docRef, {
          status: 'ERROR',
          error: error.message,
          processedAt: serverTimestamp(),
        });
      }
    } catch (updateError) {
      console.error('Failed to update document error status:', updateError);
    }

    return NextResponse.json(
      {
        error: 'PROCESSING_ERROR',
        message: error.message || 'Failed to process document',
      },
      { status: 500 }
    );
  }
}
