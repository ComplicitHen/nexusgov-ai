import { AIModel, DataResidency } from '@/types';

/**
 * AI Models Configuration with GDPR Compliance
 *
 * This file defines all available AI models with their data residency,
 * DPA status, and cost information for NexusGov AI.
 */

export const AI_MODELS: AIModel[] = [
  // ===== EU-HOSTED MODELS (GDPR Strict Mode Compliant) =====
  {
    id: 'azure-gpt-4o-sweden',
    name: 'GPT-4o (Azure Sweden)',
    provider: 'Microsoft Azure',
    modelId: 'openai/gpt-4o-2024-08-06', // via Azure in Sweden region
    dataResidency: 'EU',
    hasDPA: true,
    zeroDataRetention: true,
    costPerToken: {
      input: 0.0025,
      output: 0.01,
    },
    maxTokens: 128000,
    supportedFeatures: ['chat', 'streaming', 'function-calling', 'vision'],
    isActive: true,
  },
  {
    id: 'mistral-large-eu',
    name: 'Mistral Large (EU)',
    provider: 'Mistral AI',
    modelId: 'mistralai/mistral-large-2407',
    dataResidency: 'EU',
    hasDPA: true,
    zeroDataRetention: true,
    costPerToken: {
      input: 0.002,
      output: 0.006,
    },
    maxTokens: 128000,
    supportedFeatures: ['chat', 'streaming', 'function-calling'],
    isActive: true,
  },
  {
    id: 'mistral-medium-eu',
    name: 'Mistral Medium (EU)',
    provider: 'Mistral AI',
    modelId: 'mistralai/mistral-medium',
    dataResidency: 'EU',
    hasDPA: true,
    zeroDataRetention: true,
    costPerToken: {
      input: 0.0015,
      output: 0.0045,
    },
    maxTokens: 32000,
    supportedFeatures: ['chat', 'streaming'],
    isActive: true,
  },

  // ===== US-HOSTED MODELS WITH ZDR (GDPR Open Mode) =====
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'Anthropic',
    modelId: 'anthropic/claude-sonnet-4-5:beta',
    dataResidency: 'US_ZDR',
    hasDPA: true,
    zeroDataRetention: true, // Anthropic offers ZDR
    costPerToken: {
      input: 0.003,
      output: 0.015,
    },
    maxTokens: 200000,
    supportedFeatures: ['chat', 'streaming', 'function-calling', 'vision'],
    isActive: true,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    modelId: 'openai/gpt-4o-2024-08-06',
    dataResidency: 'US_ZDR',
    hasDPA: true,
    zeroDataRetention: true, // OpenAI API has ZDR option
    costPerToken: {
      input: 0.0025,
      output: 0.01,
    },
    maxTokens: 128000,
    supportedFeatures: ['chat', 'streaming', 'function-calling', 'vision'],
    isActive: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    modelId: 'openai/gpt-4o-mini-2024-07-18',
    dataResidency: 'US_ZDR',
    hasDPA: true,
    zeroDataRetention: true,
    costPerToken: {
      input: 0.00015,
      output: 0.0006,
    },
    maxTokens: 128000,
    supportedFeatures: ['chat', 'streaming', 'function-calling', 'vision'],
    isActive: true,
  },
  {
    id: 'claude-haiku-4',
    name: 'Claude Haiku 4',
    provider: 'Anthropic',
    modelId: 'anthropic/claude-haiku-4:beta',
    dataResidency: 'US_ZDR',
    hasDPA: true,
    zeroDataRetention: true,
    costPerToken: {
      input: 0.0008,
      output: 0.004,
    },
    maxTokens: 200000,
    supportedFeatures: ['chat', 'streaming', 'function-calling', 'vision'],
    isActive: true,
  },

  // ===== OPEN SOURCE MODELS (Self-hostable for full GDPR compliance) =====
  {
    id: 'llama-3-70b',
    name: 'Llama 3 70B',
    provider: 'Meta',
    modelId: 'meta-llama/llama-3-70b-instruct',
    dataResidency: 'EU', // Can be self-hosted in EU
    hasDPA: true,
    zeroDataRetention: true,
    costPerToken: {
      input: 0.0007,
      output: 0.0009,
    },
    maxTokens: 8000,
    supportedFeatures: ['chat', 'streaming'],
    isActive: true,
  },
];

/**
 * Get models filtered by compliance mode
 */
export function getCompliantModels(complianceMode: 'STRICT' | 'OPEN'): AIModel[] {
  if (complianceMode === 'STRICT') {
    // Only EU-hosted models with DPA
    return AI_MODELS.filter(
      (model) => model.dataResidency === 'EU' && model.hasDPA && model.isActive
    );
  }

  // Open mode: EU models + US models with ZDR
  return AI_MODELS.filter(
    (model) =>
      (model.dataResidency === 'EU' || model.dataResidency === 'US_ZDR') &&
      model.hasDPA &&
      model.zeroDataRetention &&
      model.isActive
  );
}

/**
 * Get model by ID
 */
export function getModelById(modelId: string): AIModel | undefined {
  return AI_MODELS.find((model) => model.id === modelId);
}

/**
 * Calculate cost for a message
 */
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const model = getModelById(modelId);
  if (!model) return 0;

  const inputCost = (inputTokens / 1000) * model.costPerToken.input;
  const outputCost = (outputTokens / 1000) * model.costPerToken.output;

  return inputCost + outputCost;
}

/**
 * Get data residency indicator color
 */
export function getResidencyColor(residency: DataResidency): string {
  switch (residency) {
    case 'EU':
      return 'green'; // Safe for strict GDPR
    case 'US_ZDR':
      return 'yellow'; // OK with zero data retention
    case 'NON_COMPLIANT':
      return 'red'; // Not allowed
    default:
      return 'gray';
  }
}

/**
 * Get residency label for Swedish users
 */
export function getResidencyLabel(residency: DataResidency, language: 'sv' | 'en' = 'sv'): string {
  if (language === 'sv') {
    switch (residency) {
      case 'EU':
        return 'EU-värd (Säker)';
      case 'US_ZDR':
        return 'USA (Ingen datalagring)';
      case 'NON_COMPLIANT':
        return 'Ej GDPR-kompatibel';
    }
  }

  switch (residency) {
    case 'EU':
      return 'EU-hosted (Safe)';
    case 'US_ZDR':
      return 'US (Zero Data Retention)';
    case 'NON_COMPLIANT':
      return 'Non-GDPR Compliant';
  }
}
