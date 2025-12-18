import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Conversation, Message } from '@/types';

/**
 * Create a new conversation
 */
export async function createConversation(
  userId: string,
  organizationId: string,
  modelId: string,
  title?: string
): Promise<string> {
  const conversationData = {
    userId,
    organizationId,
    title: title || 'Ny konversation',
    modelId,
    systemPrompt: '',
    temperature: 0.7,
    ragEnabled: false,
    totalTokens: 0,
    totalCost: 0,
    messageCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'conversations'), conversationData);
  return docRef.id;
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(
  userId: string,
  limitCount: number = 50
): Promise<Conversation[]> {
  const q = query(
    collection(db, 'conversations'),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      organizationId: data.organizationId,
      title: data.title,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      modelId: data.modelId,
      systemPrompt: data.systemPrompt || '',
      temperature: data.temperature || 0.7,
      ragEnabled: data.ragEnabled || false,
      documentIds: data.documentIds || [],
      totalTokens: data.totalTokens || 0,
      totalCost: data.totalCost || 0,
      messageCount: data.messageCount || 0,
    } as Conversation;
  });
}

/**
 * Get a single conversation
 */
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const docRef = doc(db, 'conversations', conversationId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    id: docSnap.id,
    userId: data.userId,
    organizationId: data.organizationId,
    title: data.title,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    modelId: data.modelId,
    systemPrompt: data.systemPrompt || '',
    temperature: data.temperature || 0.7,
    ragEnabled: data.ragEnabled || false,
    documentIds: data.documentIds || [],
    totalTokens: data.totalTokens || 0,
    totalCost: data.totalCost || 0,
    messageCount: data.messageCount || 0,
  } as Conversation;
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  const docRef = doc(db, 'conversations', conversationId);
  await updateDoc(docRef, {
    title,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  // Delete all messages in the conversation
  const messagesQuery = query(
    collection(db, 'conversations', conversationId, 'messages')
  );
  const messagesSnapshot = await getDocs(messagesQuery);

  const deletePromises = messagesSnapshot.docs.map((doc) => deleteDoc(doc.ref));
  await Promise.all(deletePromises);

  // Delete the conversation
  await deleteDoc(doc(db, 'conversations', conversationId));
}

/**
 * Add a message to a conversation
 */
export async function addMessage(
  conversationId: string,
  message: Omit<Message, 'id' | 'createdAt'>
): Promise<string> {
  const messageData = {
    ...message,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, 'conversations', conversationId, 'messages'),
    messageData
  );

  // Update conversation metadata
  const conversationRef = doc(db, 'conversations', conversationId);
  const conversationSnap = await getDoc(conversationRef);

  if (conversationSnap.exists()) {
    const data = conversationSnap.data();
    await updateDoc(conversationRef, {
      totalTokens: (data.totalTokens || 0) + (message.tokens?.input || 0) + (message.tokens?.output || 0),
      totalCost: (data.totalCost || 0) + (message.cost || 0),
      messageCount: (data.messageCount || 0) + 1,
      updatedAt: serverTimestamp(),
    });
  }

  return docRef.id;
}

/**
 * Get all messages in a conversation
 */
export async function getConversationMessages(
  conversationId: string
): Promise<Message[]> {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      conversationId,
      role: data.role,
      content: data.content,
      createdAt: data.createdAt?.toDate() || new Date(),
      tokens: data.tokens,
      cost: data.cost,
      citations: data.citations || [],
      piiDetected: data.piiDetected || false,
      piiWarning: data.piiWarning,
    } as Message;
  });
}

/**
 * Generate a conversation title from the first message
 */
export function generateConversationTitle(firstMessage: string, maxLength: number = 50): string {
  // Clean the message
  const cleaned = firstMessage.trim().replace(/\s+/g, ' ');

  // If it's short enough, use it as-is
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // Truncate at word boundary
  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength / 2) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}
