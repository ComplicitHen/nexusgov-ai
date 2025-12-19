'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppHeader } from '@/components/layout/app-header';
import { useAuth } from '@/lib/auth/auth-context';
import { Document, Meeting } from '@/types';
import { Button } from '@/components/ui/button';

type OperationType = 'reprocess_documents' | 'transcribe_meetings' | 'delete_items';

export default function BulkOperationsPage() {
  const { user } = useAuth();
  const [operationType, setOperationType] = useState<OperationType>('reprocess_documents');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, operationType]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (operationType === 'reprocess_documents' || operationType === 'delete_items') {
        const response = await fetch(`/api/documents?organizationId=${user.organizationId}`);
        const data = await response.json();
        setDocuments(data.documents || []);
      } else if (operationType === 'transcribe_meetings') {
        const response = await fetch(`/api/meetings?organizationId=${user.organizationId}`);
        const data = await response.json();
        setMeetings(data.meetings || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    if (operationType === 'reprocess_documents' || operationType === 'delete_items') {
      setSelectedItems(new Set(documents.map((d) => d.id)));
    } else {
      setSelectedItems(new Set(meetings.map((m) => m.id)));
    }
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const handleBulkOperation = async () => {
    if (selectedItems.size === 0) {
      alert('Välj minst ett objekt');
      return;
    }

    if (!confirm(`Är du säker på att du vill ${getOperationLabel(operationType)} för ${selectedItems.size} objekt?`)) {
      return;
    }

    setProcessing(true);
    setProgress({ current: 0, total: selectedItems.size, status: 'Startar...' });

    try {
      const items = Array.from(selectedItems);
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < items.length; i++) {
        const itemId = items[i];
        setProgress({
          current: i + 1,
          total: items.length,
          status: `Bearbetar ${i + 1} av ${items.length}...`,
        });

        try {
          if (operationType === 'reprocess_documents') {
            // Re-trigger document processing
            await fetch(`/api/documents/process`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ documentId: itemId }),
            });
            successCount++;
          } else if (operationType === 'transcribe_meetings') {
            // Re-trigger meeting transcription
            await fetch(`/api/meetings/transcribe`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ meetingId: itemId }),
            });
            successCount++;
          } else if (operationType === 'delete_items') {
            // Delete item
            const endpoint = documents.find((d) => d.id === itemId)
              ? `/api/documents/${itemId}?userId=${user?.id}`
              : `/api/meetings/${itemId}?userId=${user?.id}`;
            await fetch(endpoint, { method: 'DELETE' });
            successCount++;
          }

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to process item ${itemId}:`, error);
          failCount++;
        }
      }

      alert(`Klar!\n${successCount} lyckades\n${failCount} misslyckades`);

      // Reload data
      await loadData();
      clearSelection();
    } catch (error: any) {
      alert(`Fel: ${error.message}`);
    } finally {
      setProcessing(false);
      setProgress({ current: 0, total: 0, status: '' });
    }
  };

  const hasAccess = user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN';

  if (!hasAccess) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Åtkomst nekad</h1>
            <p className="text-gray-600">Du har inte behörighet att använda bulkoperationer.</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const items = operationType === 'transcribe_meetings' ? meetings : documents;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <AppHeader />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Bulkoperationer</h1>
            <p className="mt-2 text-gray-600">
              Bearbeta flera dokument, möten eller texter samtidigt
            </p>
          </div>

          {/* Operation Type Selector */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Välj operation</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => {
                  setOperationType('reprocess_documents');
                  clearSelection();
                }}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  operationType === 'reprocess_documents'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-2xl mb-2">📄</div>
                <div className="font-semibold text-gray-900">Återbearbeta dokument</div>
                <div className="text-sm text-gray-600 mt-1">
                  Generera nya embeddings för dokument
                </div>
              </button>

              <button
                onClick={() => {
                  setOperationType('transcribe_meetings');
                  clearSelection();
                }}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  operationType === 'transcribe_meetings'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-2xl mb-2">🎙️</div>
                <div className="font-semibold text-gray-900">Transkribera möten</div>
                <div className="text-sm text-gray-600 mt-1">
                  Transkribera flera möten samtidigt
                </div>
              </button>

              <button
                onClick={() => {
                  setOperationType('delete_items');
                  clearSelection();
                }}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  operationType === 'delete_items'
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-2xl mb-2">🗑️</div>
                <div className="font-semibold text-gray-900">Radera objekt</div>
                <div className="text-sm text-gray-600 mt-1">
                  Ta bort flera dokument/möten samtidigt
                </div>
              </button>
            </div>
          </div>

          {/* Item Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Välj objekt ({selectedItems.size} valda)
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Välj alla
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Rensa val
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <p className="text-gray-600">Laddar...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center text-gray-500">Inga objekt hittades</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {items.map((item: any) => (
                  <label
                    key={item.id}
                    className="flex items-center px-6 py-4 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                      className="mr-4 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {item.fileName || item.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.fileType && `${item.fileType.toUpperCase()} • `}
                        {item.status} • Uppladdad {new Date(item.uploadedAt).toLocaleDateString('sv-SE')}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {items.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {selectedItems.size} av {items.length} objekt valda
                </div>
                <Button
                  onClick={handleBulkOperation}
                  disabled={processing || selectedItems.size === 0}
                  variant={operationType === 'delete_items' ? 'outline' : 'default'}
                >
                  {processing
                    ? `${progress.status} (${progress.current}/${progress.total})`
                    : getOperationButtonLabel(operationType)}
                </Button>
              </div>
            )}
          </div>

          {/* Warning for delete */}
          {operationType === 'delete_items' && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h4 className="text-sm font-semibold text-red-900">Varning: Permanent radering</h4>
                  <p className="text-sm text-red-800 mt-1">
                    Denna operation tar bort objekt permanent. Ångra är inte möjligt. Alla relaterade data (embeddings,
                    metadata, etc.) kommer också att raderas.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

function getOperationLabel(type: OperationType): string {
  const labels: Record<OperationType, string> = {
    reprocess_documents: 'återbearbeta dokument',
    transcribe_meetings: 'transkribera möten',
    delete_items: 'radera objekt',
  };
  return labels[type];
}

function getOperationButtonLabel(type: OperationType): string {
  const labels: Record<OperationType, string> = {
    reprocess_documents: '🔄 Återbearbeta valda',
    transcribe_meetings: '🎙️ Transkribera valda',
    delete_items: '🗑️ Radera valda',
  };
  return labels[type];
}
