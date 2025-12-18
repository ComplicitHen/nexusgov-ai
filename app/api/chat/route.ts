import { NextRequest, NextResponse } from 'next/server';
import { createChatCompletion } from '@/lib/ai/openrouter-client';
import { detectPII, getPIIWarningMessage, anonymizePII } from '@/lib/utils/pii-detector';
import { calculateCost } from '@/lib/ai/models';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, modelId, temperature, maxTokens, enablePIIScreening } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    if (!modelId) {
      return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
    }

    // Get the last user message for PII screening
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

    // Call OpenRouter API
    const completion = await createChatCompletion({
      modelId,
      messages,
      temperature: temperature ?? 0.7,
      maxTokens,
    });

    // Calculate cost
    const cost = calculateCost(
      modelId,
      completion.usage.prompt_tokens,
      completion.usage.completion_tokens
    );

    // Return response with metadata
    return NextResponse.json({
      message: completion.choices[0]?.message,
      usage: completion.usage,
      cost,
      piiDetection: piiDetection?.hasPII ? piiDetection : null,
      piiWarning,
      model: modelId,
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
