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

    // Trigger document processing asynchronously
    // We don't await this to avoid timeout issues with large files
    const baseUrl = request.nextUrl.origin;
    fetch(`${baseUrl}/api/documents/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: docRef.id }),
    }).catch((error) => {
      console.error('Failed to trigger document processing:', error);
    });

    return NextResponse.json({
      success: true,
      documentId: docRef.id,
      message: 'Document uploaded successfully. Processing has been started.',
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
