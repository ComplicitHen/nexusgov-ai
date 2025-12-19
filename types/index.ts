// Core domain types for NexusGov AI

/**
 * Data Residency Locations for GDPR Compliance
 */
export type DataResidency = 'EU' | 'US_ZDR' | 'NON_COMPLIANT';

/**
 * GDPR Compliance Mode
 */
export type ComplianceMode = 'STRICT' | 'OPEN';

/**
 * Organization hierarchy levels
 */
export type OrganizationType = 'MUNICIPALITY' | 'SUB_UNIT';

/**
 * User roles within an organization
 */
export type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'UNIT_ADMIN' | 'USER' | 'DPO';

/**
 * PII Detection Actions
 */
export type PIIAction = 'WARN' | 'BLOCK' | 'ANONYMIZE';

/**
 * AI Model Provider
 */
export interface AIModel {
  id: string;
  name: string;
  provider: string; // e.g., 'OpenAI', 'Anthropic', 'Mistral'
  modelId: string; // OpenRouter model ID
  dataResidency: DataResidency;
  hasDPA: boolean; // Data Processing Agreement
  zeroDataRetention: boolean;
  costPerToken: {
    input: number;
    output: number;
  };
  maxTokens: number;
  supportedFeatures: string[]; // e.g., ['chat', 'streaming', 'function-calling']
  isActive: boolean;
}

/**
 * Organization (Municipality or Sub-unit)
 */
export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  parentId?: string; // For sub-units
  createdAt: Date;
  updatedAt: Date;

  // Compliance settings
  complianceMode: ComplianceMode;
  allowedModels: string[]; // Model IDs

  // Budget & cost control
  budget: {
    monthlyLimit: number; // in SEK
    currentSpend: number;
    tokenLimit?: number;
    alertThreshold: number; // percentage (e.g., 80 = alert at 80%)
  };

  // Settings
  settings: {
    enablePIIScreening: boolean;
    piiAction: PIIAction;
    enableAuditLog: boolean;
    defaultLanguage: 'sv' | 'en';
  };
}

/**
 * User Profile
 */
export interface User {
  id: string;
  email: string;
  displayName: string;
  organizationId: string;
  role: UserRole;
  createdAt: Date;
  lastLoginAt: Date;

  // Personal budget (optional, set by admin)
  personalBudget?: {
    monthlyLimit: number;
    currentSpend: number;
  };

  // Preferences
  preferences: {
    defaultModel?: string;
    language: 'sv' | 'en';
    enableCitations: boolean;
  };
}

/**
 * Chat Conversation
 */
export interface Conversation {
  id: string;
  userId: string;
  organizationId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;

  // AI Configuration
  modelId: string;
  systemPrompt?: string;
  temperature: number;

  // RAG Configuration
  ragEnabled: boolean;
  documentIds?: string[]; // Attached documents for RAG

  // Metadata
  totalTokens: number;
  totalCost: number;
  messageCount: number;
}

/**
 * Chat Message
 */
export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;

  // Tokens & cost
  tokens: {
    input: number;
    output: number;
  };
  cost: number;

  // RAG Citations
  citations?: Citation[];

  // PII Detection
  piiDetected: boolean;
  piiWarning?: string;
}

/**
 * Document Citation (for RAG)
 */
export interface Citation {
  documentId: string;
  documentName: string;
  pageNumber?: number;
  excerpt: string;
  relevanceScore: number;
  metadata?: Record<string, any>;
}

/**
 * Uploaded Document (for RAG)
 */
export interface Document {
  id: string;
  organizationId: string;
  uploadedBy: string; // userId
  fileName: string;
  fileType: string; // 'pdf', 'docx', 'xlsx', 'txt'
  fileSize: number;
  uploadedAt: Date;

  // Access control
  visibility: 'GLOBAL' | 'UNIT' | 'PRIVATE';
  allowedUnitIds?: string[];

  // Processing status
  status: 'PROCESSING' | 'READY' | 'FAILED';
  processingError?: string;

  // Vector embeddings
  vectorCount: number;
  embeddingModel: string;

  // Metadata
  metadata: {
    author?: string;
    createdDate?: Date;
    language?: string;
    tags?: string[];
  };
}

/**
 * Custom AI Assistant
 */
export interface Assistant {
  id: string;
  name: string;
  description: string;
  createdBy: string; // userId
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;

  // Configuration
  modelId: string;
  systemPrompt: string;
  temperature: number;

  // RAG
  attachedDocumentIds: string[];

  // Sharing
  isPublic: boolean; // Visible in community marketplace
  useCount: number;
  rating?: number;

  // Icon/Avatar
  icon?: string;
  color?: string;
}

/**
 * Audit Log Entry (for DPO compliance)
 */
export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  organizationId: string;

  // Action details
  action: 'CHAT_MESSAGE' | 'DOCUMENT_UPLOAD' | 'MODEL_SWITCH' | 'SETTINGS_CHANGE';
  modelId?: string;
  dataResidency: DataResidency;

  // Masked content (PII removed)
  maskedQuery?: string;
  maskedResponse?: string;

  // Metadata
  tokens?: number;
  cost?: number;
  piiDetected: boolean;
}

/**
 * Meeting with full lifecycle tracking
 */
export interface Meeting {
  id: string;
  organizationId: string;
  uploadedBy: string;
  title: string;
  fileName: string;
  fileType: string; // 'mp3', 'wav', 'm4a', 'ogg'
  fileSize: number;
  duration?: number; // in seconds (set after transcription)
  uploadedAt: Date;
  status: 'UPLOADING' | 'TRANSCRIBING' | 'PROCESSING' | 'READY' | 'ERROR';
  audioURL: string; // Firebase Storage URL
  transcriptURL?: string;
  transcript?: string;
  processingError?: string;

  // Processing metadata
  transcriptionCost?: number; // in SEK
  processingCost?: number; // in SEK
  totalCost?: number; // transcription + AI processing

  // Optional metadata
  metadata?: {
    participants?: string[];
    meetingDate?: Date;
    location?: string;
    language?: string;
  };
}

/**
 * Meeting Minutes and Analysis
 */
export interface MeetingMinutes {
  meetingId: string;
  summary: string; // Executive summary
  actionItems: ActionItem[];
  decisions: string[];
  topics: string[]; // Key topics discussed
  fullMinutes: string; // Full formatted minutes
  generatedAt: Date;
  generatedBy: string; // model ID used
}

export interface Speaker {
  id: string;
  label: string; // e.g., "Speaker 1", or custom name
  segments: {
    start: number;
    end: number;
    text: string;
  }[];
}

export interface ActionItem {
  id?: string;
  description: string;
  assignee?: string;
  dueDate?: Date;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  completed?: boolean;
}

export interface Decision {
  id: string;
  description: string;
  decidedBy?: string;
  timestamp: number; // seconds into the meeting
}

/**
 * Budget Alert
 */
export interface BudgetAlert {
  id: string;
  organizationId: string;
  type: 'THRESHOLD' | 'LIMIT_REACHED';
  threshold: number; // percentage
  currentSpend: number;
  limit: number;
  createdAt: Date;
  acknowledged: boolean;
}
