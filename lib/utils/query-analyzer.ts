/**
 * Query complexity analyzer for automatic model selection
 * Analyzes queries to determine optimal model based on complexity
 */

export type QueryComplexity = 'SIMPLE' | 'MEDIUM' | 'COMPLEX';

export interface QueryAnalysis {
  complexity: QueryComplexity;
  confidence: number; // 0-1
  reasoning: string;
  metrics: {
    length: number;
    words: number;
    sentences: number;
    hasCode: boolean;
    hasMultipleQuestions: boolean;
    technicalTerms: number;
    requiresReasoning: boolean;
  };
}

/**
 * Technical/complex keywords that suggest need for advanced model
 */
const TECHNICAL_KEYWORDS = [
  // Programming
  'algoritm', 'funktion', 'kod', 'programmering', 'databas', 'API', 'server',
  'implementation', 'arkitektur', 'design pattern', 'refactor', 'optimera',

  // Legal/Policy
  'juridisk', 'lag', 'förordning', 'policy', 'föreskrift', 'reglering',
  'kontrakt', 'avtal', 'GDPR', 'dataskydd',

  // Analysis
  'analys', 'utvärdera', 'jämför', 'bedöm', 'resonera', 'förklara varför',
  'motivera', 'argument', 'konsekvens',

  // Complex tasks
  'sammanfatta', 'skriv', 'formulera', 'designa', 'planera', 'strategisk',
  'översätt', 'omformulera', 'transformera',
];

/**
 * Simple query patterns
 */
const SIMPLE_PATTERNS = [
  /^(vad|när|var|vem|hur många|vilket år)/i, // Simple question words
  /^(ja eller nej|är det|finns det|kan du|har du)/i, // Yes/no questions
  /^(hej|tack|ok|bra)/i, // Greetings/acknowledgments
];

/**
 * Complex query patterns
 */
const COMPLEX_PATTERNS = [
  /\b(varför|hur kommer det sig|förklara|beskriv i detalj|analysera)\b/i,
  /\b(jämför|kontrast|skillnad mellan|för- och nackdelar)\b/i,
  /\b(skapa|generera|skriv|formulera|utarbeta)\b/i,
  /\b(steg för steg|guide|instruktion|hur gör jag)\b/i,
];

/**
 * Count sentences in text
 */
function countSentences(text: string): number {
  const sentences = text.match(/[.!?]+/g);
  return sentences ? sentences.length : 1;
}

/**
 * Check if text contains code
 */
function hasCode(text: string): boolean {
  // Look for common code patterns
  const codePatterns = [
    /```/,  // Code blocks
    /\bfunction\s+\w+\s*\(/,
    /\bconst\s+\w+\s*=/,
    /\blet\s+\w+\s*=/,
    /\bvar\s+\w+\s*=/,
    /\bdef\s+\w+\s*\(/,
    /\bclass\s+\w+/,
    /[{}\[\]();]/,  // Brackets/parens (but could be false positive)
  ];

  return codePatterns.some(pattern => pattern.test(text));
}

/**
 * Count technical terms in text
 */
function countTechnicalTerms(text: string): number {
  const lowerText = text.toLowerCase();
  return TECHNICAL_KEYWORDS.filter(keyword =>
    lowerText.includes(keyword.toLowerCase())
  ).length;
}

/**
 * Check if query requires reasoning/explanation
 */
function requiresReasoning(text: string): boolean {
  const reasoningKeywords = [
    'varför', 'hur kommer det sig', 'förklara', 'motivera', 'resonera',
    'logik', 'anledning', 'orsak', 'därför att', 'eftersom'
  ];

  const lowerText = text.toLowerCase();
  return reasoningKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Check if query has multiple questions
 */
function hasMultipleQuestions(text: string): boolean {
  const questionMarks = (text.match(/\?/g) || []).length;
  const questionWords = (text.match(/\b(vad|när|var|vem|hur|varför|vilket)\b/gi) || []).length;

  return questionMarks >= 2 || questionWords >= 3;
}

/**
 * Analyze query complexity
 */
export function analyzeQuery(query: string): QueryAnalysis {
  const trimmedQuery = query.trim();
  const words = trimmedQuery.split(/\s+/).length;
  const sentences = countSentences(trimmedQuery);
  const length = trimmedQuery.length;
  const technicalTerms = countTechnicalTerms(trimmedQuery);
  const hasCodeBlock = hasCode(trimmedQuery);
  const multipleQuestions = hasMultipleQuestions(trimmedQuery);
  const needsReasoning = requiresReasoning(trimmedQuery);

  const metrics = {
    length,
    words,
    sentences,
    hasCode: hasCodeBlock,
    hasMultipleQuestions: multipleQuestions,
    technicalTerms,
    requiresReasoning: needsReasoning,
  };

  // Score-based complexity calculation
  let complexityScore = 0;
  let reasoning = '';

  // Length factors
  if (words < 5) {
    complexityScore -= 2;
    reasoning += 'Mycket kort fråga. ';
  } else if (words > 50) {
    complexityScore += 2;
    reasoning += 'Lång, detaljerad fråga. ';
  }

  if (sentences > 3) {
    complexityScore += 1;
    reasoning += 'Flera meningar. ';
  }

  // Pattern matching
  if (SIMPLE_PATTERNS.some(pattern => pattern.test(trimmedQuery))) {
    complexityScore -= 2;
    reasoning += 'Enkel frågestruktur. ';
  }

  if (COMPLEX_PATTERNS.some(pattern => pattern.test(trimmedQuery))) {
    complexityScore += 2;
    reasoning += 'Komplex frågestruktur. ';
  }

  // Technical content
  if (technicalTerms > 0) {
    complexityScore += technicalTerms;
    reasoning += `${technicalTerms} tekniska termer. `;
  }

  if (hasCodeBlock) {
    complexityScore += 3;
    reasoning += 'Innehåller kod. ';
  }

  // Reasoning requirements
  if (needsReasoning) {
    complexityScore += 2;
    reasoning += 'Kräver resonemang/förklaring. ';
  }

  if (multipleQuestions) {
    complexityScore += 1;
    reasoning += 'Flera frågor. ';
  }

  // Determine complexity level
  let complexity: QueryComplexity;
  let confidence: number;

  if (complexityScore <= -1) {
    complexity = 'SIMPLE';
    confidence = Math.min(0.95, 0.7 + Math.abs(complexityScore) * 0.1);
    reasoning += '→ Enkel fråga, billig modell räcker.';
  } else if (complexityScore <= 3) {
    complexity = 'MEDIUM';
    confidence = 0.6 + Math.abs(complexityScore - 1) * 0.05;
    reasoning += '→ Medel komplexitet, standardmodell rekommenderas.';
  } else {
    complexity = 'COMPLEX';
    confidence = Math.min(0.95, 0.7 + (complexityScore - 3) * 0.05);
    reasoning += '→ Komplex fråga, avancerad modell krävs.';
  }

  return {
    complexity,
    confidence,
    reasoning: reasoning.trim(),
    metrics,
  };
}

/**
 * Get recommended model for query
 */
export function getRecommendedModel(
  query: string,
  availableModels: string[]
): { modelId: string; reasoning: string } {
  const analysis = analyzeQuery(query);

  // Model tiers (from cheapest to most expensive)
  // Based on the AI_MODELS configuration
  const modelTiers = {
    SIMPLE: [
      'mistral-small-eu',       // Cheapest EU model
      'gemini-flash-1.5-eu',    // Fast and cheap
      'llama-3.1-8b',           // Very cheap
    ],
    MEDIUM: [
      'mistral-large-eu',       // Good balance
      'gpt-4o-mini-eu',         // OpenAI's efficient model
      'claude-3.5-haiku',       // Fast Claude
    ],
    COMPLEX: [
      'gpt-4o-eu',              // Advanced reasoning
      'claude-3.5-sonnet-eu',   // Best for complex tasks
      'gpt-o1-preview',         // Reasoning model
    ],
  };

  // Get models for this complexity tier
  const tierModels = modelTiers[analysis.complexity];

  // Find first available model in tier
  const selectedModel = tierModels.find(modelId =>
    availableModels.includes(modelId)
  );

  // Fallback to first available model if none found in tier
  const modelId = selectedModel || availableModels[0];

  const reasoning = `${analysis.reasoning} (${(analysis.confidence * 100).toFixed(0)}% säker)`;

  return {
    modelId,
    reasoning,
  };
}
