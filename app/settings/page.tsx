'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppHeader } from '@/components/layout/app-header';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { AI_MODELS } from '@/lib/ai/models';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [defaultModel, setDefaultModel] = useState(user?.preferences.defaultModel || '');
  const [language, setLanguage] = useState<'sv' | 'en'>(user?.preferences.language || 'sv');
  const [enableCitations, setEnableCitations] = useState(
    user?.preferences.enableCitations ?? true
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setDefaultModel(user.preferences.defaultModel || '');
      setLanguage(user.preferences.language);
      setEnableCitations(user.preferences.enableCitations);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        displayName,
        'preferences.defaultModel': defaultModel,
        'preferences.language': language,
        'preferences.enableCitations': enableCitations,
      });

      await refreshUser();

      setMessage({
        type: 'success',
        text: 'Inställningar sparade!',
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `Fel vid sparande: ${error.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-gray-50">
        <AppHeader />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Inställningar</h1>
              <p className="mt-2 text-gray-600">Hantera dina personliga inställningar</p>
            </div>

            {message && (
              <div
                className={`mb-6 p-4 rounded-md ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="bg-white rounded-lg shadow">
              {/* Profile Section */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Profil</h2>

                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                      Namn
                    </label>
                    <Input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ditt namn"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      E-post
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      E-postadressen kan inte ändras
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Roll
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700">
                      {user?.role}
                    </div>
                  </div>
                </form>
              </div>

              {/* AI Preferences */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  AI-inställningar
                </h2>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="defaultModel" className="block text-sm font-medium text-gray-700 mb-1">
                      Standardmodell
                    </label>
                    <select
                      id="defaultModel"
                      value={defaultModel}
                      onChange={(e) => setDefaultModel(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">Ingen (använd senast använda)</option>
                      {AI_MODELS.filter((m) => m.isActive).map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} - {model.dataResidency}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Modellen som används som standard vid nya konversationer
                    </p>
                  </div>

                  <div>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={enableCitations}
                        onChange={(e) => setEnableCitations(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          Aktivera citat (RAG)
                        </span>
                        <p className="text-xs text-gray-500">
                          Visa källreferenser när AI använder dokument
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Language & Region */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Språk & region
                </h2>

                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                    Språk
                  </label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'sv' | 'en')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="sv">Svenska</option>
                    <option value="en">English</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Språk för gränssnittet och meddelanden
                  </p>
                </div>
              </div>

              {/* Organization Info */}
              {user?.organizationId && (
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Organisation</h2>
                  <div className="bg-gray-50 rounded-md p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Organisation ID</p>
                        <p className="font-mono text-gray-900">{user.organizationId}</p>
                      </div>
                      {user.personalBudget && (
                        <div>
                          <p className="text-gray-600">Personlig budget</p>
                          <p className="text-gray-900">
                            {user.personalBudget.currentSpend.toFixed(2)} /{' '}
                            {user.personalBudget.monthlyLimit.toFixed(2)} SEK
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="p-6">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Sparar...' : 'Spara inställningar'}
                </Button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Farozon</h3>
              <p className="text-sm text-red-700 mb-4">
                Dessa åtgärder är permanenta och kan inte ångras.
              </p>
              <Button variant="destructive" size="sm">
                Radera konto
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
