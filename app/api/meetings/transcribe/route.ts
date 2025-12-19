import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { transcribeAudioFromUrl, calculateTranscriptionCost } from '@/lib/utils/whisper-transcription';

export const runtime = 'nodejs'; // Need nodejs for Whisper API
export const maxDuration = 300; // 5 minutes max (transcription can take time)

/**
 * Transcribe Meeting Audio
 *
 * Downloads audio from Firebase Storage and transcribes it using Whisper API.
 * Updates meeting record with transcript and triggers AI processing.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meetingId } = body;

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    console.log(`[MeetingTranscribe] Starting transcription for meeting: ${meetingId}`);

    // Get meeting record from Firestore
    const meetingRef = doc(db, 'meetings', meetingId);
    const meetingSnap = await getDoc(meetingRef);

    if (!meetingSnap.exists()) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    const meetingData = meetingSnap.data();
    const { audioURL, fileName, metadata } = meetingData;

    if (!audioURL) {
      throw new Error('Audio URL not found in meeting record');
    }

    // Update status to TRANSCRIBING
    await updateDoc(meetingRef, {
      status: 'TRANSCRIBING',
    });

    console.log(`[MeetingTranscribe] Downloading and transcribing: ${fileName}`);

    // Transcribe the audio using Whisper API
    const language = metadata?.language || 'sv'; // Default to Swedish
    const transcriptionResult = await transcribeAudioFromUrl(
      audioURL,
      fileName,
      {
        language,
        timestampGranularities: ['segment'], // Get timestamps for segments
      }
    );

    console.log(`[MeetingTranscribe] Transcription completed. Text length: ${transcriptionResult.text.length} characters`);

    // Calculate transcription cost
    const transcriptionCost = transcriptionResult.duration
      ? calculateTranscriptionCost(transcriptionResult.duration)
      : 0;

    console.log(`[MeetingTranscribe] Transcription cost: ${transcriptionCost.toFixed(4)} SEK`);

    // Update meeting record with transcript
    await updateDoc(meetingRef, {
      status: 'PROCESSING', // Move to processing state
      transcript: transcriptionResult.text,
      duration: transcriptionResult.duration || 0,
      transcriptionCost,
      'metadata.language': transcriptionResult.language || language,
    });

    console.log(`[MeetingTranscribe] Meeting record updated with transcript`);

    // Trigger AI processing asynchronously
    const baseUrl = request.nextUrl.origin;
    fetch(`${baseUrl}/api/meetings/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId }),
    }).catch((error) => {
      console.error('[MeetingTranscribe] Failed to trigger processing:', error);
    });

    return NextResponse.json({
      success: true,
      meetingId,
      transcriptLength: transcriptionResult.text.length,
      duration: transcriptionResult.duration,
      cost: transcriptionCost,
      message: 'Transkribering klar. AI-bearbetning har startats.',
    });
  } catch (error: any) {
    console.error('[MeetingTranscribe] Transcription error:', error);

    // Update meeting status to ERROR
    try {
      const { meetingId } = await request.json();
      if (meetingId) {
        const meetingRef = doc(db, 'meetings', meetingId);
        await updateDoc(meetingRef, {
          status: 'ERROR',
          processingError: error.message || 'Transkribering misslyckades',
        });
      }
    } catch (updateError) {
      console.error('[MeetingTranscribe] Failed to update error status:', updateError);
    }

    return NextResponse.json(
      {
        error: 'TRANSCRIPTION_ERROR',
        message: error.message || 'Failed to transcribe audio',
      },
      { status: 500 }
    );
  }
}
