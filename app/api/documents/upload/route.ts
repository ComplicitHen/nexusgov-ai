import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      uploadedBy,
      fileName,
      fileType,
      fileSize,
      visibility,
      downloadURL,
    } = body;

    // Validate required fields
    if (!organizationId || !uploadedBy || !fileName || !downloadURL) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create document record
    const docData = {
      organizationId,
      uploadedBy,
      fileName,
      fileType: fileType || 'application/octet-stream',
      fileSize: fileSize || 0,
      uploadedAt: serverTimestamp(),
      visibility: visibility || 'PRIVATE',
      status: 'PROCESSING',
      vectorCount: 0,
      embeddingModel: 'text-embedding-3-small',
      downloadURL,
      metadata: {},
    };

    const docRef = await addDoc(collection(db, 'documents'), docData);

    // TODO: Trigger document processing
    // This would normally call a Cloud Function or background job to:
    // 1. Download the file
    // 2. Extract text (PDF, DOCX, etc.)
    // 3. Chunk the text
    // 4. Create embeddings
    // 5. Store in Qdrant
    // 6. Update document status to 'READY'

    // For now, we'll just simulate success
    // You can implement the processing logic later

    return NextResponse.json({
      success: true,
      documentId: docRef.id,
      message: 'Document uploaded successfully. Processing will begin shortly.',
    });
  } catch (error: any) {
    console.error('Document upload error:', error);

    return NextResponse.json(
      {
        error: 'UPLOAD_ERROR',
        message: error.message || 'Failed to upload document',
      },
      { status: 500 }
    );
  }
}
