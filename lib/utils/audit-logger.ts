/**
 * Audit Logger Utility for GDPR Compliance
 *
 * Creates audit log entries for all AI interactions and sensitive operations
 */

import { DataResidency, ComplianceMode } from '@/types';

interface CreateAuditLogParams {
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  organizationName: string;
  action: string;
  actionDescription: string;
  modelId?: string;
  modelName?: string;
  dataResidency: DataResidency;
  complianceMode: ComplianceMode;
  maskedQuery?: string;
  maskedResponse?: string;
  piiDetected?: boolean;
  piiTypes?: string[];
  piiAction?: 'WARN' | 'BLOCK' | 'ANONYMIZE';
  tokens?: number;
  cost?: number;
  conversationId?: string;
  documentId?: string;
  meetingId?: string;
  assistantId?: string;
  status?: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  errorMessage?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    await fetch('/api/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    // Fire and forget - don't wait for response
    // Errors are logged on the server side
  } catch (error) {
    console.error('[Audit Logger] Failed to create audit log:', error);
    // Don't throw - audit logging should not block operations
  }
}

/**
 * Mask PII in text for audit logging
 * Simple implementation - replace detected PII patterns with [REDACTED]
 */
export function maskPII(text: string, piiTypes?: string[]): string {
  if (!piiTypes || piiTypes.length === 0) {
    return text;
  }

  let masked = text;

  // Swedish SSN (personnummer): YYYYMMDD-XXXX or YYMMDD-XXXX
  if (piiTypes.includes('SSN') || piiTypes.includes('PERSONNUMMER')) {
    masked = masked.replace(/\b\d{6,8}[-\s]?\d{4}\b/g, '[PERSONNUMMER]');
  }

  // Email addresses
  if (piiTypes.includes('EMAIL')) {
    masked = masked.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
  }

  // Phone numbers (Swedish format)
  if (piiTypes.includes('PHONE')) {
    masked = masked.replace(/\b(\+46|0)[\s-]?\d{1,3}[\s-]?\d{3}[\s-]?\d{2,3}[\s-]?\d{2,3}\b/g, '[TELEFON]');
  }

  // Names (if explicitly marked)
  if (piiTypes.includes('PERSON_NAME')) {
    // This is tricky - would need NER model for accurate detection
    // For now, just note it was detected
    masked = `[INNEHÅLLER PERSONNAMN]\n${masked}`;
  }

  return masked;
}

/**
 * Log a chat message interaction
 */
export async function logChatMessage(params: {
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  organizationName: string;
  modelId: string;
  modelName: string;
  dataResidency: DataResidency;
  complianceMode: ComplianceMode;
  userMessage: string;
  aiResponse: string;
  piiDetected: boolean;
  piiTypes?: string[];
  tokens: number;
  cost: number;
  conversationId?: string;
  assistantId?: string;
}): Promise<void> {
  await createAuditLog({
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    organizationId: params.organizationId,
    organizationName: params.organizationName,
    action: 'CHAT_MESSAGE',
    actionDescription: `Chat med ${params.modelName}${params.assistantId ? ' (via assistent)' : ''}`,
    modelId: params.modelId,
    modelName: params.modelName,
    dataResidency: params.dataResidency,
    complianceMode: params.complianceMode,
    maskedQuery: maskPII(params.userMessage, params.piiTypes),
    maskedResponse: maskPII(params.aiResponse, params.piiTypes),
    piiDetected: params.piiDetected,
    piiTypes: params.piiTypes,
    tokens: params.tokens,
    cost: params.cost,
    conversationId: params.conversationId,
    assistantId: params.assistantId,
    status: 'SUCCESS',
  });
}

/**
 * Log a document upload
 */
export async function logDocumentUpload(params: {
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  organizationName: string;
  documentId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
}): Promise<void> {
  await createAuditLog({
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    organizationId: params.organizationId,
    organizationName: params.organizationName,
    action: 'DOCUMENT_UPLOAD',
    actionDescription: `Uppladdning av ${params.fileName} (${params.fileType}, ${(params.fileSize / 1024).toFixed(0)} KB)`,
    dataResidency: 'EU', // Documents stored in EU
    complianceMode: 'STRICT',
    documentId: params.documentId,
    piiDetected: false, // Would need PII detection on document content
    status: params.status,
    errorMessage: params.errorMessage,
  });
}

/**
 * Log a meeting transcription
 */
export async function logMeetingTranscription(params: {
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  organizationName: string;
  meetingId: string;
  meetingTitle: string;
  duration: number;
  cost: number;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
}): Promise<void> {
  await createAuditLog({
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    organizationId: params.organizationId,
    organizationName: params.organizationName,
    action: 'MEETING_TRANSCRIBE',
    actionDescription: `Transkribering av möte "${params.meetingTitle}" (${Math.round(params.duration / 60)} min)`,
    modelId: 'whisper-1',
    modelName: 'Whisper (OpenAI)',
    dataResidency: 'US_ZDR', // Whisper is US-based but zero data retention
    complianceMode: 'OPEN',
    meetingId: params.meetingId,
    cost: params.cost,
    piiDetected: false, // Would need PII detection on transcript
    status: params.status,
    errorMessage: params.errorMessage,
  });
}

/**
 * Log klarspråk simplification
 */
export async function logKlarsprakSimplify(params: {
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  organizationName: string;
  modelId: string;
  modelName: string;
  dataResidency: DataResidency;
  textLength: number;
  tokens: number;
  cost: number;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
}): Promise<void> {
  await createAuditLog({
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    organizationId: params.organizationId,
    organizationName: params.organizationName,
    action: 'KLARSPRAK_SIMPLIFY',
    actionDescription: `Klarspråk förenkling med ${params.modelName} (${params.textLength} tecken)`,
    modelId: params.modelId,
    modelName: params.modelName,
    dataResidency: params.dataResidency,
    complianceMode: 'STRICT',
    tokens: params.tokens,
    cost: params.cost,
    piiDetected: false,
    status: params.status,
    errorMessage: params.errorMessage,
  });
}

/**
 * Log assistant creation
 */
export async function logAssistantCreate(params: {
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  organizationName: string;
  assistantId: string;
  assistantName: string;
  modelId: string;
  isPublic: boolean;
}): Promise<void> {
  await createAuditLog({
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    organizationId: params.organizationId,
    organizationName: params.organizationName,
    action: 'ASSISTANT_CREATE',
    actionDescription: `Skapade assistent "${params.assistantName}" (${params.isPublic ? 'publik' : 'privat'})`,
    modelId: params.modelId,
    dataResidency: 'EU',
    complianceMode: 'STRICT',
    assistantId: params.assistantId,
    piiDetected: false,
    status: 'SUCCESS',
  });
}

/**
 * Log user invitation
 */
export async function logUserInvite(params: {
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  organizationName: string;
  invitedEmail: string;
  invitedRole: string;
  count: number;
}): Promise<void> {
  await createAuditLog({
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    organizationId: params.organizationId,
    organizationName: params.organizationName,
    action: 'USER_INVITE',
    actionDescription: `Bjöd in ${params.count} användare (inkl. ${params.invitedEmail})`,
    dataResidency: 'EU',
    complianceMode: 'STRICT',
    piiDetected: false,
    status: 'SUCCESS',
  });
}
