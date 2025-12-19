/**
 * Meeting Processor Utility
 *
 * Uses AI to analyze meeting transcripts and generate:
 * - Meeting minutes (summary)
 * - Action items
 * - Decisions made
 * - Key topics
 */

import { createChatCompletion } from '@/lib/ai/openrouter-client';
import { calculateCost } from '@/lib/ai/models';
import { ActionItem, MeetingMinutes } from '@/types';

export interface ProcessMeetingOptions {
  transcript: string;
  meetingTitle?: string;
  participants?: string[];
  meetingDate?: Date;
  modelId?: string; // AI model to use (default: efficient model)
  language?: string; // 'sv' or 'en'
}

export interface ProcessMeetingResult {
  minutes: MeetingMinutes;
  cost: number; // in SEK
  tokensUsed: number;
}

/**
 * Process a meeting transcript to extract structured information
 *
 * @param options - Processing options including transcript and metadata
 * @returns Meeting minutes with action items, decisions, and summary
 */
export async function processMeetingTranscript(
  options: ProcessMeetingOptions
): Promise<ProcessMeetingResult> {
  const {
    transcript,
    meetingTitle = 'Möte',
    participants = [],
    meetingDate,
    modelId = 'openai/gpt-4o-mini', // Cost-efficient model for processing
    language = 'sv',
  } = options;

  console.log('[MeetingProcessor] Processing transcript...');
  console.log(`[MeetingProcessor] Length: ${transcript.length} characters`);
  console.log(`[MeetingProcessor] Model: ${modelId}`);

  // Build system prompt in Swedish
  const systemPrompt = language === 'sv' ? SYSTEM_PROMPT_SV : SYSTEM_PROMPT_EN;

  // Build user prompt with transcript
  const userPrompt = buildUserPrompt(transcript, meetingTitle, participants, meetingDate, language);

  try {
    // Call AI to process the transcript
    const response = await createChatCompletion({
      modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, // Lower temperature for more structured output
      maxTokens: 4000,
    });

    // Extract the AI response
    const aiResponse = response.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from AI model');
    }

    console.log('[MeetingProcessor] AI response received');

    // Parse the structured response
    const parsedResult = parseAIResponse(aiResponse, language);

    // Calculate cost
    const { prompt_tokens, completion_tokens, total_tokens } = response.usage;
    const cost = calculateCost(modelId, prompt_tokens, completion_tokens);

    console.log(`[MeetingProcessor] Processing complete. Cost: ${cost.toFixed(4)} SEK, Tokens: ${total_tokens}`);

    return {
      minutes: parsedResult,
      cost,
      tokensUsed: total_tokens,
    };
  } catch (error) {
    console.error('[MeetingProcessor] Error processing transcript:', error);
    throw error;
  }
}

/**
 * Build the user prompt with transcript and metadata
 */
function buildUserPrompt(
  transcript: string,
  title: string,
  participants: string[],
  date?: Date,
  language: string = 'sv'
): string {
  const lines: string[] = [];

  if (language === 'sv') {
    lines.push(`# Transkription av mötet: ${title}\n`);
    if (date) {
      lines.push(`**Datum:** ${date.toLocaleDateString('sv-SE')}\n`);
    }
    if (participants.length > 0) {
      lines.push(`**Deltagare:** ${participants.join(', ')}\n`);
    }
    lines.push(`\n---\n\n${transcript}\n\n---\n`);
    lines.push('\nAnalysera denna mötesutskrift och generera en strukturerad rapport enligt instruktionerna.');
  } else {
    lines.push(`# Meeting Transcript: ${title}\n`);
    if (date) {
      lines.push(`**Date:** ${date.toLocaleDateString('en-US')}\n`);
    }
    if (participants.length > 0) {
      lines.push(`**Participants:** ${participants.join(', ')}\n`);
    }
    lines.push(`\n---\n\n${transcript}\n\n---\n`);
    lines.push('\nAnalyze this meeting transcript and generate a structured report according to the instructions.');
  }

  return lines.join('\n');
}

/**
 * Parse AI response into structured meeting minutes
 */
function parseAIResponse(response: string, language: string = 'sv'): MeetingMinutes {
  console.log('[MeetingProcessor] Parsing AI response...');

  try {
    // Try to extract JSON if present (enclosed in ```json ... ```)
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/m);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        meetingId: '', // Will be set by caller
        summary: parsed.summary || parsed.sammanfattning || '',
        actionItems: parseActionItems(parsed.actionItems || parsed.åtgärdspunkter || []),
        decisions: parsed.decisions || parsed.beslut || [],
        topics: parsed.topics || parsed.ämnen || [],
        fullMinutes: parsed.fullMinutes || parsed.protokoll || response,
        generatedAt: new Date(),
        generatedBy: 'AI Processing',
      };
    }

    // Fallback: Parse from structured text format
    const sections = parseTextSections(response, language);

    return {
      meetingId: '',
      summary: sections.summary,
      actionItems: sections.actionItems,
      decisions: sections.decisions,
      topics: sections.topics,
      fullMinutes: response,
      generatedAt: new Date(),
      generatedBy: 'AI Processing',
    };
  } catch (error) {
    console.error('[MeetingProcessor] Error parsing AI response:', error);

    // Return basic structure with full response as minutes
    return {
      meetingId: '',
      summary: 'Sammanfattning kunde inte genereras automatiskt.',
      actionItems: [],
      decisions: [],
      topics: [],
      fullMinutes: response,
      generatedAt: new Date(),
      generatedBy: 'AI Processing',
    };
  }
}

/**
 * Parse action items from various formats
 */
function parseActionItems(items: any[]): ActionItem[] {
  if (!Array.isArray(items)) return [];

  return items.map((item, index) => {
    if (typeof item === 'string') {
      return {
        description: item,
        priority: 'MEDIUM',
      };
    }

    return {
      description: item.description || item.beskrivning || '',
      assignee: item.assignee || item.ansvarig || item.assignedTo,
      dueDate: item.dueDate || item.deadline ? new Date(item.dueDate || item.deadline) : undefined,
      priority: item.priority || item.prioritet || 'MEDIUM',
      completed: false,
    };
  });
}

/**
 * Parse text sections for fallback parsing
 */
function parseTextSections(text: string, language: string) {
  const result = {
    summary: '',
    actionItems: [] as ActionItem[],
    decisions: [] as string[],
    topics: [] as string[],
  };

  // Extract summary (first paragraph or section)
  const summaryMatch = text.match(/(?:Sammanfattning|Summary)[:\s]*\n(.*?)(?=\n\n|$)/im);
  if (summaryMatch) {
    result.summary = summaryMatch[1].trim();
  } else {
    // Use first paragraph as summary
    const firstParagraph = text.split('\n\n')[0];
    result.summary = firstParagraph.trim();
  }

  // Extract action items
  const actionItemsMatch = text.match(/(?:Åtgärdspunkter|Action Items)[:\s]*\n(.*?)(?=\n\n[A-Z]|$)/im);
  if (actionItemsMatch) {
    const lines = actionItemsMatch[1].split('\n').filter(l => l.trim().startsWith('-') || l.trim().match(/^\d+\./));
    result.actionItems = lines.map(line => ({
      description: line.replace(/^[-\d.]\s*/, '').trim(),
      priority: 'MEDIUM' as const,
    }));
  }

  // Extract decisions
  const decisionsMatch = text.match(/(?:Beslut|Decisions)[:\s]*\n(.*?)(?=\n\n[A-Z]|$)/im);
  if (decisionsMatch) {
    const lines = decisionsMatch[1].split('\n').filter(l => l.trim().startsWith('-') || l.trim().match(/^\d+\./));
    result.decisions = lines.map(line => line.replace(/^[-\d.]\s*/, '').trim());
  }

  // Extract topics
  const topicsMatch = text.match(/(?:Ämnen|Topics|Nyckelämnen|Key Topics)[:\s]*\n(.*?)(?=\n\n[A-Z]|$)/im);
  if (topicsMatch) {
    const lines = topicsMatch[1].split('\n').filter(l => l.trim().startsWith('-') || l.trim().match(/^\d+\./));
    result.topics = lines.map(line => line.replace(/^[-\d.]\s*/, '').trim());
  }

  return result;
}

// System prompts in Swedish and English
const SYSTEM_PROMPT_SV = `Du är en expert på att analysera mötesutskrifter och skapa professionella mötesprotokoll för svenska offentliga organisationer.

Din uppgift är att analysera mötesutskriften och producera ett strukturerat JSON-dokument med följande information:

1. **Sammanfattning** (summary): En kortfattad sammanfattning (2-4 meningar) av mötets huvudsakliga innehåll och resultat.

2. **Åtgärdspunkter** (actionItems): En lista över konkreta åtgärder som diskuterades eller beslutades. För varje åtgärd, ange:
   - beskrivning: Vad som ska göras
   - ansvarig: Vem som är ansvarig (om nämnt)
   - deadline: När det ska vara klart (om nämnt)
   - prioritet: HIGH, MEDIUM eller LOW

3. **Beslut** (decisions): En lista över viktiga beslut som fattades under mötet.

4. **Nyckelämnen** (topics): En lista över de huvudsakliga ämnena som diskuterades.

5. **Protokoll** (fullMinutes): Ett fullständigt, välformulerat mötesprotokoll med rubriker, punktlistor och professionell svensk språkstil.

**Viktigt:**
- Använd professionell svenska
- Följ svensk standard för mötesprotokoll
- Var kortfattad men komplett
- Fokusera på beslut och åtgärder
- Undvik att återge ordagrant, sammanfatta istället

**Returnera ditt svar som JSON inuti en kod-block:**

\`\`\`json
{
  "sammanfattning": "...",
  "åtgärdspunkter": [
    {
      "beskrivning": "...",
      "ansvarig": "...",
      "deadline": "YYYY-MM-DD",
      "prioritet": "MEDIUM"
    }
  ],
  "beslut": ["...", "..."],
  "ämnen": ["...", "..."],
  "protokoll": "# Mötesprotokoll\\n\\n## Sammanfattning\\n..."
}
\`\`\``;

const SYSTEM_PROMPT_EN = `You are an expert at analyzing meeting transcripts and creating professional meeting minutes for Swedish public organizations.

Your task is to analyze the meeting transcript and produce a structured JSON document with the following information:

1. **Summary**: A brief summary (2-4 sentences) of the main content and outcomes of the meeting.

2. **Action Items**: A list of concrete actions discussed or decided. For each action, specify:
   - description: What needs to be done
   - assignee: Who is responsible (if mentioned)
   - dueDate: When it should be completed (if mentioned)
   - priority: HIGH, MEDIUM, or LOW

3. **Decisions**: A list of important decisions made during the meeting.

4. **Topics**: A list of the main topics discussed.

5. **Full Minutes**: Complete, well-formatted meeting minutes with headings, bullet points, and professional language.

**Important:**
- Use professional language
- Follow meeting minutes standards
- Be concise but complete
- Focus on decisions and actions
- Summarize rather than quote verbatim

**Return your response as JSON inside a code block:**

\`\`\`json
{
  "summary": "...",
  "actionItems": [
    {
      "description": "...",
      "assignee": "...",
      "dueDate": "YYYY-MM-DD",
      "priority": "MEDIUM"
    }
  ],
  "decisions": ["...", "..."],
  "topics": ["...", "..."],
  "fullMinutes": "# Meeting Minutes\\n\\n## Summary\\n..."
}
\`\`\``;
