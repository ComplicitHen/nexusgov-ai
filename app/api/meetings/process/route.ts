import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { processMeetingTranscript } from '@/lib/utils/meeting-processor';

export const runtime = 'nodejs'; // Need nodejs for AI processing
export const maxDuration = 300; // 5 minutes max (AI processing can take time)

/**
 * Process Meeting Transcript with AI
 *
 * Generates meeting minutes, action items, decisions, and topics
 * from the transcribed text using AI.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meetingId, modelId } = body;

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    console.log(`[MeetingProcess] Starting AI processing for meeting: ${meetingId}`);

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
    const { transcript, title, metadata } = meetingData;

    if (!transcript) {
      throw new Error('No transcript found. Please transcribe the meeting first.');
    }

    console.log(`[MeetingProcess] Processing transcript (${transcript.length} characters)`);

    // Process the transcript with AI
    const result = await processMeetingTranscript({
      transcript,
      meetingTitle: title,
      participants: metadata?.participants || [],
      meetingDate: metadata?.meetingDate ? new Date(metadata.meetingDate) : undefined,
      modelId: modelId || 'openai/gpt-4o-mini', // Default to cost-efficient model
      language: metadata?.language || 'sv',
    });

    console.log(`[MeetingProcess] AI processing completed`);
    console.log(`[MeetingProcess] Summary: ${result.minutes.summary.substring(0, 100)}...`);
    console.log(`[MeetingProcess] Action items: ${result.minutes.actionItems.length}`);
    console.log(`[MeetingProcess] Decisions: ${result.minutes.decisions.length}`);
    console.log(`[MeetingProcess] Topics: ${result.minutes.topics.length}`);
    console.log(`[MeetingProcess] Processing cost: ${result.cost.toFixed(4)} SEK`);

    // Calculate total cost (transcription + processing)
    const transcriptionCost = meetingData.transcriptionCost || 0;
    const totalCost = transcriptionCost + result.cost;

    // Store meeting minutes in subcollection
    const minutesRef = doc(db, 'meetings', meetingId, 'minutes', 'latest');
    await setDoc(minutesRef, {
      ...result.minutes,
      meetingId,
      generatedAt: new Date(),
      generatedBy: modelId || 'openai/gpt-4o-mini',
    });

    console.log(`[MeetingProcess] Meeting minutes stored in subcollection`);

    // Update meeting record with status and costs
    await updateDoc(meetingRef, {
      status: 'READY',
      processingCost: result.cost,
      totalCost,
    });

    console.log(`[MeetingProcess] Meeting status updated to READY`);

    return NextResponse.json({
      success: true,
      meetingId,
      minutes: result.minutes,
      costs: {
        transcription: transcriptionCost,
        processing: result.cost,
        total: totalCost,
      },
      tokensUsed: result.tokensUsed,
      message: 'Mötet har bearbetats och protokoll har genererats.',
    });
  } catch (error: any) {
    console.error('[MeetingProcess] Processing error:', error);

    // Update meeting status to ERROR
    try {
      const { meetingId } = await request.json();
      if (meetingId) {
        const meetingRef = doc(db, 'meetings', meetingId);
        await updateDoc(meetingRef, {
          status: 'ERROR',
          processingError: error.message || 'AI-bearbetning misslyckades',
        });
      }
    } catch (updateError) {
      console.error('[MeetingProcess] Failed to update error status:', updateError);
    }

    return NextResponse.json(
      {
        error: 'PROCESSING_ERROR',
        message: error.message || 'Failed to process meeting transcript',
      },
      { status: 500 }
    );
  }
}

/**
 * Retry processing for a failed meeting
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { meetingId } = body;

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    console.log(`[MeetingProcess] Retrying processing for meeting: ${meetingId}`);

    // Reset meeting status to PROCESSING
    const meetingRef = doc(db, 'meetings', meetingId);
    await updateDoc(meetingRef, {
      status: 'PROCESSING',
      processingError: null,
    });

    // Trigger processing
    const baseUrl = request.nextUrl.origin;
    const response = await fetch(`${baseUrl}/api/meetings/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId }),
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Återbearbetning har startats.',
      ...result,
    });
  } catch (error: any) {
    console.error('[MeetingProcess] Retry error:', error);

    return NextResponse.json(
      {
        error: 'RETRY_ERROR',
        message: error.message || 'Failed to retry processing',
      },
      { status: 500 }
    );
  }
}
