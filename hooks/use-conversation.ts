import { useState, useEffect } from 'react';
import { Conversation, Message } from '@/types';
import {
  createConversation,
  getConversation,
  getConversationMessages,
  addMessage,
  updateConversationTitle,
  generateConversationTitle,
} from '@/lib/db/conversations';
import { useAuth } from '@/lib/auth/auth-context';

export function useConversation(conversationId?: string) {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load conversation and messages
  useEffect(() => {
    if (!conversationId) {
      setConversation(null);
      setMessages([]);
      return;
    }

    const loadConversation = async () => {
      setLoading(true);
      setError(null);

      try {
        const [conv, msgs] = await Promise.all([
          getConversation(conversationId),
          getConversationMessages(conversationId),
        ]);

        setConversation(conv);
        setMessages(msgs);
      } catch (err: any) {
        console.error('Error loading conversation:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [conversationId]);

  // Create new conversation
  const createNewConversation = async (modelId: string, title?: string): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const newConversationId = await createConversation(
        user.id,
        user.organizationId,
        modelId,
        title
      );

      return newConversationId;
    } catch (err: any) {
      console.error('Error creating conversation:', err);
      throw err;
    }
  };

  // Add message to conversation
  const addMessageToConversation = async (
    convId: string,
    messageData: Omit<Message, 'id' | 'createdAt' | 'conversationId'>
  ): Promise<void> => {
    try {
      const messageId = await addMessage(convId, {
        ...messageData,
        conversationId: convId,
      });

      // Add to local state
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          conversationId: convId,
          ...messageData,
          createdAt: new Date(),
        } as Message,
      ]);

      // Update conversation title if it's the first user message
      if (
        conversation &&
        conversation.title === 'Ny konversation' &&
        messageData.role === 'user'
      ) {
        const newTitle = generateConversationTitle(messageData.content);
        await updateConversationTitle(convId, newTitle);
        setConversation((prev) => (prev ? { ...prev, title: newTitle } : null));
      }
    } catch (err: any) {
      console.error('Error adding message:', err);
      throw err;
    }
  };

  // Update conversation title
  const updateTitle = async (newTitle: string): Promise<void> => {
    if (!conversationId) return;

    try {
      await updateConversationTitle(conversationId, newTitle);
      setConversation((prev) => (prev ? { ...prev, title: newTitle } : null));
    } catch (err: any) {
      console.error('Error updating title:', err);
      throw err;
    }
  };

  return {
    conversation,
    messages,
    loading,
    error,
    createNewConversation,
    addMessageToConversation,
    updateTitle,
    setMessages, // For local updates
  };
}
