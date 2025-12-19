'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth/auth-context';
import { getCompliantModels } from '@/lib/ai/models';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Assistant } from '@/types';

interface AssistantBuilderProps {
  onSave: () => void;
  onCancel: () => void;
  editingAssistant?: Assistant | null;
}

const EMOJI_OPTIONS = ['🤖', '👨‍💼', '👩‍⚕️', '👨‍🏫', '📊', '💼', '📝', '🎯', '💡', '🔧', '📚', '🏛️'];
const COLOR_OPTIONS = [
  { name: 'Blå', value: '#3B82F6' },
  { name: 'Grön', value: '#10B981' },
  { name: 'Lila', value: '#8B5CF6' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Röd', value: '#EF4444' },
  { name: 'Rosa', value: '#EC4899' },
];

export function AssistantBuilder({ onSave, onCancel, editingAssistant }: AssistantBuilderProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [name, setName] = useState(editingAssistant?.name || '');
  const [description, setDescription] = useState(editingAssistant?.description || '');
  const [modelId, setModelId] = useState(editingAssistant?.modelId || '');
  const [systemPrompt, setSystemPrompt] = useState(editingAssistant?.systemPrompt || '');
  const [temperature, setTemperature] = useState(editingAssistant?.temperature || 0.7);
  const [isPublic, setIsPublic] = useState(editingAssistant?.isPublic || false);
  const [icon, setIcon] = useState(editingAssistant?.icon || '🤖');
  const [color, setColor] = useState(editingAssistant?.color || '#3B82F6');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>(editingAssistant?.attachedDocumentIds || []);

  // Available models and documents
  const [models, setModels] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    loadModels();
    loadDocuments();
  }, [user]);

  const loadModels = async () => {
    // Get compliant models for user's org
    const availableModels = await getCompliantModels('OPEN'); // Or get from user's org settings
    setModels(availableModels);
    if (!modelId && availableModels.length > 0) {
      setModelId(availableModels[0].id);
    }
  };

  const loadDocuments = async () => {
    if (!user) return;

    try {
      const q = query(
        collection(db, 'documents'),
        where('organizationId', '==', user.organizationId),
        where('status', '==', 'READY')
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        fileName: doc.data().fileName,
        visibility: doc.data().visibility,
      }));
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validation
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Namn krävs' });
      return;
    }
    if (!systemPrompt.trim()) {
      setMessage({ type: 'error', text: 'Systemprompten krävs' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const assistantData = {
        name: name.trim(),
        description: description.trim(),
        createdBy: user.id,
        organizationId: user.organizationId,
        modelId,
        systemPrompt: systemPrompt.trim(),
        temperature,
        attachedDocumentIds: selectedDocuments,
        isPublic,
        icon,
        color,
      };

      if (editingAssistant) {
        // Update existing
        const response = await fetch(`/api/assistants/${editingAssistant.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...assistantData, userId: user.id }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        setMessage({ type: 'success', text: result.message });
      } else {
        // Create new
        const response = await fetch('/api/assistants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assistantData),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message);

        setMessage({ type: 'success', text: result.message });
      }

      setTimeout(() => {
        onSave();
      }, 1000);
    } catch (error: any) {
      console.error('Error saving assistant:', error);
      setMessage({ type: 'error', text: error.message || 'Ett fel uppstod' });
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4">
        {editingAssistant ? 'Redigera assistent' : 'Skapa ny assistent'}
      </h2>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Namn <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            placeholder="T.ex. HR-assistent, Bygglovsexpert..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Beskrivning
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="Kort beskrivning av assistentens syfte..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
          />
        </div>

        {/* Icon and Color */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ikon</label>
            <div className="flex gap-2 flex-wrap">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setIcon(emoji)}
                  className={`w-10 h-10 text-2xl flex items-center justify-center rounded-md border-2 transition-colors ${
                    icon === emoji ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  disabled={saving}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Färg</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`w-10 h-10 rounded-md border-2 transition-all ${
                    color === c.value ? 'border-gray-800 scale-110' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: c.value }}
                  disabled={saving}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            AI-modell <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            disabled={saving}
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} - {model.provider}
              </option>
            ))}
          </select>
        </div>

        {/* System Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Systemprompt <span className="text-red-500">*</span>
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            rows={8}
            placeholder="Du är en hjälpsam assistent som specialiserar sig på..."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            disabled={saving}
          />
          <p className="text-xs text-gray-500 mt-1">
            Detta är den initiala instruktionen som styr assistentens beteende.
          </p>
        </div>

        {/* Temperature */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Temperatur: {temperature}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full"
            disabled={saving}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Mer fokuserad (0)</span>
            <span>Mer kreativ (1)</span>
          </div>
        </div>

        {/* Attach Documents */}
        {documents.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Koppla kunskapsdokument (RAG)
            </label>
            <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
              {documents.map((doc) => (
                <label key={doc.id} className="flex items-center gap-2 py-1 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDocuments.includes(doc.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDocuments([...selectedDocuments, doc.id]);
                      } else {
                        setSelectedDocuments(selectedDocuments.filter((id) => id !== doc.id));
                      }
                    }}
                    className="h-4 w-4 text-blue-600"
                    disabled={saving}
                  />
                  <span className="text-sm">{doc.fileName}</span>
                  <span className="text-xs text-gray-500">({doc.visibility})</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {selectedDocuments.length} dokument valda - assistenten får automatiskt tillgång till denna kunskap.
            </p>
          </div>
        )}

        {/* Public Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 text-blue-600"
            disabled={saving}
          />
          <label htmlFor="isPublic" className="text-sm text-gray-700">
            Dela med organisationen (andra användare kan se och använda denna assistent)
          </label>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-3 rounded-md text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Avbryt
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Sparar...' : editingAssistant ? 'Uppdatera' : 'Skapa assistent'}
          </Button>
        </div>
      </div>
    </div>
  );
}
