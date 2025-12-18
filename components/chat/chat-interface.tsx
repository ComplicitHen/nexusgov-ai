'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AI_MODELS, getModelById, getResidencyColor, getResidencyLabel } from '@/lib/ai/models';
import { detectPII, anonymizePII, getPIIWarningMessage } from '@/lib/utils/pii-detector';
import { useConversation } from '@/hooks/use-conversation';
import { useAuth } from '@/lib/auth/auth-context';
import { Message } from '@/types';

interface ChatInterfaceProps {
  conversationId?: string;
  onConversationCreated?: (id: string) => void;
}

export function ChatInterface({ conversationId, onConversationCreated }: ChatInterfaceProps) {
  const { user } = useAuth();
  const { messages, addMessageToConversation, createNewConversation, setMessages } =
    useConversation(conversationId);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('mistral-large-eu');
  const [enablePIIScreening, setEnablePIIScreening] = useState(true);
  const [piiWarning, setPIIWarning] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          conversationId: '',
          role: 'system',
          content: 'Välkommen till NexusGov AI! Jag är din AI-assistent. Hur kan jag hjälpa dig idag?',
          createdAt: new Date(),
          piiDetected: false,
        } as Message,
      ]);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check for PII when input changes
  useEffect(() => {
    if (enablePIIScreening && input.trim()) {
      const detection = detectPII(input);
      if (detection.hasPII) {
        setPIIWarning(getPIIWarningMessage(detection, 'sv'));
      } else {
        setPIIWarning(null);
      }
    } else {
      setPIIWarning(null);
    }
  }, [input, enablePIIScreening]);

  const handleAnonymize = () => {
    if (input.trim()) {
      const detection = detectPII(input);
      if (detection.hasPII) {
        const anonymized = anonymizePII(input, detection);
        setInput(anonymized);
        setPIIWarning(null);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMessageContent = input;
    setInput('');
    setIsLoading(true);
    setPIIWarning(null);

    try {
      // Create conversation if needed
      let convId = conversationId;
      if (!convId) {
        convId = await createNewConversation(selectedModel);
        onConversationCreated?.(convId);
      }

      // Add user message to UI immediately
      const tempUserMessage: Message = {
        id: `temp-user-${Date.now()}`,
        conversationId: convId,
        role: 'user',
        content: userMessageContent,
        createdAt: new Date(),
        piiDetected: false,
      };
      setMessages((prev) => [...prev, tempUserMessage]);

      // Save user message to Firestore
      await addMessageToConversation(convId, {
        role: 'user',
        content: userMessageContent,
        piiDetected: false,
      });

      // Call AI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, tempUserMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          modelId: selectedModel,
          enablePIIScreening,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'PII_DETECTED') {
          const systemMessage: Message = {
            id: `system-${Date.now()}`,
            conversationId: convId,
            role: 'system',
            content: `⚠️ ${data.message}\n\n${data.suggestion}`,
            createdAt: new Date(),
            piiDetected: true,
          };
          setMessages((prev) => [...prev, systemMessage]);
        } else {
          throw new Error(data.message || 'Failed to send message');
        }
      } else {
        // Save assistant message to Firestore
        await addMessageToConversation(convId, {
          role: 'assistant',
          content: data.message.content,
          tokens: {
            input: data.usage.prompt_tokens,
            output: data.usage.completion_tokens,
          },
          cost: data.cost,
          piiDetected: data.piiDetection?.hasPII || false,
          piiWarning: data.piiWarning,
        });
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        conversationId: conversationId || '',
        role: 'system',
        content: `Error: ${error.message}`,
        createdAt: new Date(),
        piiDetected: false,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const model = getModelById(selectedModel);
  const residencyColor = model ? getResidencyColor(model.dataResidency) : 'gray';

  return (
    <div className="flex flex-col flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">NexusGov AI</h1>
            <p className="text-sm text-gray-600">GDPR-kompatibel AI-assistent</p>
          </div>

          {/* Model Selector */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Modell:</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {AI_MODELS.filter((m) => m.isActive).map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>

              {/* Data Residency Indicator */}
              {model && (
                <div
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    residencyColor === 'green'
                      ? 'bg-green-100 text-green-800'
                      : residencyColor === 'yellow'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {getResidencyLabel(model.dataResidency, 'sv')}
                </div>
              )}
            </div>

            {/* PII Screening Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enablePIIScreening}
                onChange={(e) => setEnablePIIScreening(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">PII-kontroll</span>
            </label>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.role === 'system'
                    ? 'bg-yellow-100 text-yellow-900 border border-yellow-300'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>

                {message.role === 'assistant' && message.cost !== undefined && (
                  <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                    Tokens: {message.tokens?.input || 0} in, {message.tokens?.output || 0} out
                    | Kostnad: {(message.cost || 0).toFixed(4)} SEK
                  </div>
                )}

                {message.piiWarning && (
                  <div className="mt-2 pt-2 border-t border-gray-200 text-xs">
                    {message.piiWarning}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* PII Warning */}
      {piiWarning && (
        <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-sm text-yellow-800">{piiWarning}</p>
            <Button size="sm" variant="outline" onClick={handleAnonymize}>
              Anonymisera
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Skriv ditt meddelande..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
            {isLoading ? 'Skickar...' : 'Skicka'}
          </Button>
        </div>
      </div>
    </div>
  );
}
