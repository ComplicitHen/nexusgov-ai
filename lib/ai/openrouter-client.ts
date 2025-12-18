/**
 * OpenRouter AI Client
 *
 * Handles communication with OpenRouter API for multi-model AI access
 */

import { AIModel } from '@/types';
import { getModelById } from './models';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  modelId: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Create a chat completion using OpenRouter
 */
export async function createChatCompletion(
  options: ChatCompletionOptions
): Promise<ChatCompletionResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const model = getModelById(options.modelId);
  if (!model) {
    throw new Error(`Model ${options.modelId} not found`);
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://nexusgov-ai.com',
      'X-Title': 'NexusGov AI',
    },
    body: JSON.stringify({
      model: model.modelId,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      stream: options.stream ?? false,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenRouter API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Create a streaming chat completion
 */
export async function createStreamingChatCompletion(
  options: ChatCompletionOptions
): Promise<ReadableStream> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const model = getModelById(options.modelId);
  if (!model) {
    throw new Error(`Model ${options.modelId} not found`);
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://nexusgov-ai.com',
      'X-Title': 'NexusGov AI',
    },
    body: JSON.stringify({
      model: model.modelId,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenRouter API error: ${error.error?.message || response.statusText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  return response.body;
}

/**
 * Get available models for a user based on their compliance mode
 */
export async function getAvailableModels(complianceMode: 'STRICT' | 'OPEN'): Promise<AIModel[]> {
  // Import dynamically to avoid circular dependency
  const { getCompliantModels } = await import('./models');
  return getCompliantModels(complianceMode);
}

/**
 * Validate model availability for organization
 */
export function validateModelAccess(
  modelId: string,
  allowedModelIds: string[],
  complianceMode: 'STRICT' | 'OPEN'
): { allowed: boolean; reason?: string } {
  const model = getModelById(modelId);

  if (!model) {
    return { allowed: false, reason: 'Model not found' };
  }

  if (!model.isActive) {
    return { allowed: false, reason: 'Model is not active' };
  }

  // Check compliance mode
  if (complianceMode === 'STRICT') {
    if (model.dataResidency !== 'EU') {
      return {
        allowed: false,
        reason: 'Model not EU-hosted. Switch to OPEN mode to use non-EU models.',
      };
    }

    if (!model.hasDPA) {
      return {
        allowed: false,
        reason: 'Model does not have a Data Processing Agreement (DPA)',
      };
    }
  } else if (complianceMode === 'OPEN') {
    if (model.dataResidency === 'NON_COMPLIANT') {
      return {
        allowed: false,
        reason: 'Model is not GDPR compliant',
      };
    }

    if (!model.zeroDataRetention) {
      return {
        allowed: false,
        reason: 'Model does not guarantee zero data retention',
      };
    }
  }

  // Check if model is in organization's allowed list
  if (allowedModelIds.length > 0 && !allowedModelIds.includes(modelId)) {
    return {
      allowed: false,
      reason: 'Model not in organization\'s allowed models list',
    };
  }

  return { allowed: true };
}
