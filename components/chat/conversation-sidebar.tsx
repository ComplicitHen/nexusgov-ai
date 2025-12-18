'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { getUserConversations, deleteConversation } from '@/lib/db/conversations';
import { Conversation } from '@/types';
import { Button } from '@/components/ui/button';

interface ConversationSidebarProps {
  currentConversationId?: string;
  onSelectConversation: (conversationId: string | undefined) => void;
}

export function ConversationSidebar({
  currentConversationId,
  onSelectConversation,
}: ConversationSidebarProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const convs = await getUserConversations(user.id);
      setConversations(convs);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));

      // If we deleted the current conversation, reset
      if (conversationId === currentConversationId) {
        onSelectConversation(undefined);
      }

      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Idag';
    if (days === 1) return 'Igår';
    if (days < 7) return `${days} dagar sedan`;

    return date.toLocaleDateString('sv-SE', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <Button
          onClick={() => onSelectConversation(undefined)}
          className="w-full"
          size="sm"
        >
          + Ny konversation
        </Button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500 text-sm">Laddar...</div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            Inga konversationer än
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`relative group ${
                  currentConversationId === conv.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <button
                  onClick={() => onSelectConversation(conv.id)}
                  className="w-full text-left p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conv.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(conv.updatedAt)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">
                          {conv.messageCount} meddelanden
                        </span>
                        {conv.totalCost > 0 && (
                          <span className="text-xs text-gray-400">
                            • {conv.totalCost.toFixed(2)} SEK
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(conv.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-opacity"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </button>

                {/* Delete confirmation */}
                {showDeleteConfirm === conv.id && (
                  <div className="absolute inset-0 bg-white border border-red-200 p-3 z-10">
                    <p className="text-sm text-gray-900 mb-2">Radera konversation?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(conv.id)}
                        className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Radera
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="flex-1 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Avbryt
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {conversations.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600">
            <div className="flex justify-between mb-1">
              <span>Totalt antal konversationer:</span>
              <span className="font-medium">{conversations.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Total kostnad:</span>
              <span className="font-medium">
                {conversations.reduce((sum, c) => sum + c.totalCost, 0).toFixed(2)} SEK
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
