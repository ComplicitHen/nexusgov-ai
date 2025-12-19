import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export const runtime = 'edge';

/**
 * Upload Meeting Audio File
 *
 * Receives metadata about an uploaded audio file (already in Firebase Storage)
 * and creates a meeting record in Firestore.
 *
 * Triggers async transcription process.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      uploadedBy,
      title,
      fileName,
      fileType,
      fileSize,
      audioURL,
      metadata,
    } = body;

    // Validate required fields
    if (!organizationId || !uploadedBy || !fileName || !audioURL) {
      return NextResponse.json(
        { error: 'Missing required fields: organizationId, uploadedBy, fileName, audioURL' },
        { status: 400 }
      );
    }

    // Validate file type (audio only)
    const validAudioTypes = ['mp3', 'wav', 'm4a', 'ogg', 'webm', 'mp4', 'mpeg', 'mpga'];
    const fileExt = fileName.toLowerCase().split('.').pop();
    if (!fileExt || !validAudioTypes.includes(fileExt)) {
      return NextResponse.json(
        {
          error: 'Invalid file type',
          message: `Supported formats: ${validAudioTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB for Whisper API)
    const maxSize = 25 * 1024 * 1024; // 25MB in bytes
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json(
        {
          error: 'File too large',
          message: 'Maximum file size is 25MB. Please compress the audio or split it into smaller files.',
        },
        { status: 400 }
      );
    }

    console.log(`[MeetingUpload] Creating meeting record: ${fileName}`);

    // Create meeting record in Firestore
    const meetingData = {
      organizationId,
      uploadedBy,
      title: title || fileName.replace(/\.[^/.]+$/, ''), // Remove extension if no title provided
      fileName,
      fileType: fileExt,
      fileSize: fileSize || 0,
      uploadedAt: serverTimestamp(),
      status: 'UPLOADING',
      audioURL,
      metadata: metadata || {},
    };

    const meetingRef = await addDoc(collection(db, 'meetings'), meetingData);

    console.log(`[MeetingUpload] Meeting record created: ${meetingRef.id}`);

    // Trigger transcription asynchronously
    // We don't await this to avoid timeout issues
    const baseUrl = request.nextUrl.origin;
    fetch(`${baseUrl}/api/meetings/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId: meetingRef.id }),
    }).catch((error) => {
      console.error('[MeetingUpload] Failed to trigger transcription:', error);
    });

    return NextResponse.json({
      success: true,
      meetingId: meetingRef.id,
      message: 'Mötet har laddats upp. Transkribering har startats.',
    });
  } catch (error: any) {
    console.error('[MeetingUpload] Upload error:', error);

    return NextResponse.json(
      {
        error: 'UPLOAD_ERROR',
        message: error.message || 'Failed to upload meeting audio',
      },
      { status: 500 }
    );
  }
}
