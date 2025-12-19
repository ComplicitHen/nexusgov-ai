'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppHeader } from '@/components/layout/app-header';
import { useAuth } from '@/lib/auth/auth-context';
import { Assistant } from '@/types';
import { AssistantBuilder } from '@/components/assistants/assistant-builder';
import { AssistantList } from '@/components/assistants/assistant-list';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function AssistantsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null);

  useEffect(() => {
    loadAssistants();
  }, [user]);

  const loadAssistants = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/assistants?userId=${user.id}&organizationId=${user.organizationId}&includePublic=true`
      );
      const data = await response.json();
      setAssistants(data.assistants || []);
    } catch (error) {
      console.error('Error loading assistants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingAssistant(null);
    setShowBuilder(true);
    setSelectedAssistant(null);
  };

  const handleEdit = (assistant: Assistant) => {
    setEditingAssistant(assistant);
    setShowBuilder(true);
  };

  const handleDelete = async (assistant: Assistant) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/assistants/${assistant.id}?userId=${user.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadAssistants();
        if (selectedAssistant?.id === assistant.id) {
          setSelectedAssistant(null);
        }
      }
    } catch (error) {
      console.error('Error deleting assistant:', error);
      alert('Ett fel uppstod vid radering');
    }
  };

  const handleSave = async () => {
    setShowBuilder(false);
    setEditingAssistant(null);
    await loadAssistants();
  };

  const handleUseAssistant = (assistant: Assistant) => {
    // Navigate to chat with assistant pre-selected
    router.push(`/?assistant=${assistant.id}`);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <AppHeader />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">AI-Assistenter</h1>
            <p className="mt-2 text-gray-600">
              Skapa anpassade AI-assistenter för olika uppgifter och avdelningar
            </p>
          </div>

          {loading ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
              <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-gray-600">Laddar assistenter...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sidebar */}
              <div className="lg:col-span-1 space-y-4">
                <Button onClick={handleCreateNew} className="w-full">
                  + Skapa ny assistent
                </Button>

                <AssistantList
                  assistants={assistants}
                  onSelect={setSelectedAssistant}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  selectedId={selectedAssistant?.id}
                />
              </div>

              {/* Main Content */}
              <div className="lg:col-span-2">
                {showBuilder ? (
                  <AssistantBuilder
                    onSave={handleSave}
                    onCancel={() => {
                      setShowBuilder(false);
                      setEditingAssistant(null);
                    }}
                    editingAssistant={editingAssistant}
                  />
                ) : selectedAssistant ? (
                  <AssistantDetails
                    assistant={selectedAssistant}
                    onUse={handleUseAssistant}
                    onEdit={handleEdit}
                  />
                ) : (
                  <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
                    <div className="text-6xl mb-4">🤖</div>
                    <h3 className="text-lg font-medium text-gray-900">Välj eller skapa en assistent</h3>
                    <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
                      Anpassade AI-assistenter hjälper dig att automatisera repetitiva uppgifter och ge konsekvent
                      information baserad på dina dokument.
                    </p>
                    <Button onClick={handleCreateNew} className="mt-6">
                      Skapa min första assistent
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Så här använder du assistenter</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <div>
                  <div className="font-medium">Skapa assistent</div>
                  <div className="text-gray-600">Definiera roll, beteende och koppla kunskapsdokument</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <div>
                  <div className="font-medium">Dela med teamet</div>
                  <div className="text-gray-600">Gör assistenten publik så andra kan använda den</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <div>
                  <div className="font-medium">Använd i chatt</div>
                  <div className="text-gray-600">Välj assistenten i chatten för konsekvent experthjälp</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function AssistantDetails({
  assistant,
  onUse,
  onEdit,
}: {
  assistant: Assistant;
  onUse: (assistant: Assistant) => void;
  onEdit: (assistant: Assistant) => void;
}) {
  const { user } = useAuth();
  const isOwner = user?.id === assistant.createdBy;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div
        className="p-6 border-b border-gray-200"
        style={{ backgroundColor: assistant.color + '10' }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center text-4xl flex-shrink-0"
            style={{ backgroundColor: assistant.color + '30' }}
          >
            {assistant.icon}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{assistant.name}</h2>
            {assistant.description && (
              <p className="text-gray-600 mt-1">{assistant.description}</p>
            )}
            <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
              <span>Skapades {assistant.createdAt.toLocaleDateString('sv-SE')}</span>
              <span>•</span>
              <span>{assistant.useCount} användningar</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* System Prompt */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Systemprompt</h3>
          <div className="bg-gray-50 rounded-md p-4 font-mono text-sm text-gray-800 whitespace-pre-wrap">
            {assistant.systemPrompt}
          </div>
        </div>

        {/* Configuration */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Konfiguration</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">AI-Modell</div>
              <div className="text-sm font-medium text-gray-900">{assistant.modelId}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Temperatur</div>
              <div className="text-sm font-medium text-gray-900">{assistant.temperature}</div>
            </div>
          </div>
        </div>

        {/* Attached Documents */}
        {assistant.attachedDocumentIds.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Kopplade dokument ({assistant.attachedDocumentIds.length})
            </h3>
            <div className="text-sm text-gray-600">
              Denna assistent har tillgång till {assistant.attachedDocumentIds.length} kunskapsdokument via RAG.
            </div>
          </div>
        )}

        {/* Visibility */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Synlighet</h3>
          <div className="inline-flex items-center gap-2 text-sm">
            {assistant.isPublic ? (
              <>
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fillRule="evenodd"
                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-green-700 font-medium">Publik - synlig för alla i organisationen</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-gray-700">Privat - endast du kan se denna assistent</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
        {isOwner && (
          <Button variant="outline" onClick={() => onEdit(assistant)}>
            Redigera
          </Button>
        )}
        <Button onClick={() => onUse(assistant)}>
          Använd i chatt
        </Button>
      </div>
    </div>
  );
}
