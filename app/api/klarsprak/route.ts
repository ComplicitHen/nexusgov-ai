import { NextRequest, NextResponse } from 'next/server';
import { simplifySwedishText } from '@/lib/utils/klarsprak';

export const runtime = 'nodejs'; // Need nodejs for AI processing
export const maxDuration = 60; // 60 seconds max

/**
 * POST - Simplify Swedish text using klarspråk principles
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, modelId } = body;

    // Validation
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
    }

    if (text.trim().length < 10) {
      return NextResponse.json(
        { error: 'Text must be at least 10 characters long' },
        { status: 400 }
      );
    }

    if (text.length > 10000) {
      return NextResponse.json(
        { error: 'Text must be less than 10,000 characters' },
        { status: 400 }
      );
    }

    console.log(`[Klarspråk API] Simplifying ${text.length} characters of text`);

    // Simplify the text
    const result = await simplifySwedishText(text, modelId);

    console.log(`[Klarspråk API] Simplification complete`);
    console.log(`[Klarspråk API] Readability improved from ${result.readabilityScore.before} to ${result.readabilityScore.after}`);
    console.log(`[Klarspråk API] Cost: ${result.cost.toFixed(4)} SEK`);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('[Klarspråk API] Error:', error);

    return NextResponse.json(
      {
        error: 'SIMPLIFICATION_ERROR',
        message: error.message || 'Failed to simplify text',
      },
      { status: 500 }
    );
  }
}
