'use client';

import { useState } from 'react';
import { ChatInterface } from '@/components/chat/chat-interface';
import { ConversationSidebar } from '@/components/chat/conversation-sidebar';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppHeader } from '@/components/layout/app-header';

export default function Home() {
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen">
        <AppHeader />
        <div className="flex flex-1 overflow-hidden">
          <ConversationSidebar
            currentConversationId={currentConversationId}
            onSelectConversation={setCurrentConversationId}
          />
          <ChatInterface
            conversationId={currentConversationId}
            onConversationCreated={setCurrentConversationId}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
