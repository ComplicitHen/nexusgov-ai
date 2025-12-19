/**
 * Klarspråk (Plain Swedish) Utility
 *
 * Simplifies complex bureaucratic Swedish text into clear, accessible language
 * following Swedish Language Law (Språklagen) and klarspråk principles.
 */

import { createChatCompletion } from '@/lib/ai/openrouter-client';
import { calculateCost } from '@/lib/ai/models';

export interface KlarsprakResult {
  originalText: string;
  simplifiedText: string;
  improvements: KlarsprakImprovement[];
  readabilityScore: {
    before: number; // 0-100, higher is easier
    after: number;
  };
  statistics: {
    originalWordCount: number;
    simplifiedWordCount: number;
    originalSentenceCount: number;
    simplifiedSentenceCount: number;
    averageWordsPerSentenceBefore: number;
    averageWordsPerSentenceAfter: number;
  };
  cost: number; // in SEK
  tokensUsed: number;
}

export interface KlarsprakImprovement {
  type: 'PASSIVE_TO_ACTIVE' | 'JARGON_REMOVAL' | 'SHORTER_SENTENCES' | 'SIMPLER_WORDS' | 'CLEARER_STRUCTURE';
  description: string;
  example?: {
    before: string;
    after: string;
  };
}

/**
 * Simplify Swedish bureaucratic text using AI
 */
export async function simplifySwedishText(
  text: string,
  modelId: string = 'openai/gpt-4o-mini'
): Promise<KlarsprakResult> {
  console.log('[Klarspråk] Simplifying text...');
  console.log(`[Klarspråk] Original length: ${text.length} characters`);

  // Calculate original statistics
  const originalStats = analyzeText(text);

  // Build AI prompt
  const systemPrompt = KLARSPRAK_SYSTEM_PROMPT;
  const userPrompt = `Följande text behöver förenklas enligt klarspråksprinciper:\n\n---\n${text}\n---\n\nFörenkla denna text.`;

  try {
    // Call AI to simplify
    const response = await createChatCompletion({
      modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, // Lower temperature for consistent simplification
      maxTokens: 4000,
    });

    const aiResponse = response.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    console.log('[Klarspråk] AI response received');

    // Parse the response
    const parsed = parseKlarsprakResponse(aiResponse);

    // Calculate simplified statistics
    const simplifiedStats = analyzeText(parsed.simplifiedText);

    // Calculate readability scores
    const readabilityBefore = calculateReadabilityScore(text);
    const readabilityAfter = calculateReadabilityScore(parsed.simplifiedText);

    // Calculate cost
    const { prompt_tokens, completion_tokens, total_tokens } = response.usage;
    const cost = calculateCost(modelId, prompt_tokens, completion_tokens);

    console.log(`[Klarspråk] Simplification complete. Cost: ${cost.toFixed(4)} SEK`);

    return {
      originalText: text,
      simplifiedText: parsed.simplifiedText,
      improvements: parsed.improvements,
      readabilityScore: {
        before: readabilityBefore,
        after: readabilityAfter,
      },
      statistics: {
        originalWordCount: originalStats.wordCount,
        simplifiedWordCount: simplifiedStats.wordCount,
        originalSentenceCount: originalStats.sentenceCount,
        simplifiedSentenceCount: simplifiedStats.sentenceCount,
        averageWordsPerSentenceBefore: originalStats.avgWordsPerSentence,
        averageWordsPerSentenceAfter: simplifiedStats.avgWordsPerSentence,
      },
      cost,
      tokensUsed: total_tokens,
    };
  } catch (error) {
    console.error('[Klarspråk] Error:', error);
    throw error;
  }
}

/**
 * Analyze text statistics
 */
function analyzeText(text: string) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.trim().length > 0);

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgWordsPerSentence: sentences.length > 0 ? words.length / sentences.length : 0,
  };
}

/**
 * Calculate readability score (simplified LIX-like formula for Swedish)
 * Lower score = easier to read
 */
function calculateReadabilityScore(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.trim().length > 0);
  const longWords = words.filter(w => w.length > 6).length;

  if (sentences.length === 0 || words.length === 0) return 0;

  const avgWordsPerSentence = words.length / sentences.length;
  const percentLongWords = (longWords / words.length) * 100;

  // Simplified LIX formula
  const lix = avgWordsPerSentence + percentLongWords;

  // Convert to 0-100 scale (inverted so higher = easier)
  // LIX scores typically range from 20 (very easy) to 60+ (very hard)
  // We'll map: 20 -> 100, 60 -> 0
  const score = Math.max(0, Math.min(100, 100 - ((lix - 20) * 2.5)));

  return Math.round(score);
}

/**
 * Parse AI response into structured format
 */
function parseKlarsprakResponse(response: string): {
  simplifiedText: string;
  improvements: KlarsprakImprovement[];
} {
  // Try to extract JSON if present
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/m);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      return {
        simplifiedText: parsed.simplifiedText || parsed.förenkladText || '',
        improvements: parseImprovements(parsed.improvements || parsed.förbättringar || []),
      };
    } catch (e) {
      console.warn('[Klarspråk] Failed to parse JSON, falling back to text extraction');
    }
  }

  // Fallback: extract simplified text from markdown sections
  const simplifiedMatch = response.match(/(?:Förenklad text|Simplified Text)[:\s]*\n([\s\S]*?)(?=\n\n##|$)/i);
  const simplifiedText = simplifiedMatch ? simplifiedMatch[1].trim() : response;

  // Try to extract improvements
  const improvements: KlarsprakImprovement[] = [];
  const improvementsMatch = response.match(/(?:Förbättringar|Improvements)[:\s]*\n([\s\S]*?)(?=\n\n##|$)/i);
  if (improvementsMatch) {
    const lines = improvementsMatch[1].split('\n').filter(l => l.trim().startsWith('-') || l.trim().match(/^\d+\./));
    lines.forEach(line => {
      const cleanLine = line.replace(/^[-\d.]\s*/, '').trim();
      improvements.push({
        type: 'CLEARER_STRUCTURE',
        description: cleanLine,
      });
    });
  }

  return {
    simplifiedText,
    improvements,
  };
}

/**
 * Parse improvements array
 */
function parseImprovements(items: any[]): KlarsprakImprovement[] {
  if (!Array.isArray(items)) return [];

  return items.map(item => ({
    type: item.type || 'CLEARER_STRUCTURE',
    description: item.description || item.beskrivning || '',
    example: item.example || item.exempel,
  }));
}

/**
 * System prompt for klarspråk simplification
 */
const KLARSPRAK_SYSTEM_PROMPT = `Du är en expert på klarspråk (plain Swedish) och hjälper svenska myndigheter att förenkla komplicerad byråkratisk text.

Din uppgift är att omformulera texter enligt följande klarspråksprinciper:

**Klarspråksprinciper:**
1. **Använd aktivt språk** istället för passiva konstruktioner
   - Dåligt: "Ansökan ska inlämnas av sökanden"
   - Bra: "Du ska lämna in ansökan"

2. **Korta meningar** - helst högst 15-20 ord per mening
   - Dela upp långa meningar
   - Använd punkter istället för kommatecken

3. **Enkla ord** istället för facktermer och byråkratiska uttryck
   - Dåligt: "vidtaga åtgärder", "i enlighet med", "i syfte att"
   - Bra: "göra något", "enligt", "för att"

4. **Du-tilltal** när det är möjligt
   - Dåligt: "Den sökande ska..."
   - Bra: "Du ska..."

5. **Tydlig struktur** med logisk ordning och rubriker

6. **Konkreta exempel** istället för abstrakta begrepp

7. **Undvik nominaliseringar** (substantiverade verb)
   - Dåligt: "genomförandet av en utvärdering"
   - Bra: "utvärdera"

8. **Ta bort onödiga ord** - var koncis utan att förlora information

**Output-format:**
Returnera ditt svar som JSON:

\`\`\`json
{
  "förenkladText": "Den förenklade texten här...",
  "förbättringar": [
    {
      "typ": "PASSIVE_TO_ACTIVE",
      "beskrivning": "Ändrade från passiv till aktiv form",
      "exempel": {
        "före": "Ansökan ska inlämnas",
        "efter": "Du ska lämna in ansökan"
      }
    }
  ]
}
\`\`\`

**Typer av förbättringar:**
- PASSIVE_TO_ACTIVE: Bytte från passiv till aktiv form
- JARGON_REMOVAL: Tog bort facktermer och byråkratspråk
- SHORTER_SENTENCES: Kortade ner långa meningar
- SIMPLER_WORDS: Bytte komplicerade ord mot enklare
- CLEARER_STRUCTURE: Förbättrade struktur och logik

Behåll all viktig information från originaltexten. Målet är att göra texten lättare att förstå för alla medborgare, inte att ta bort innehåll.`;

export default simplifySwedishText;
