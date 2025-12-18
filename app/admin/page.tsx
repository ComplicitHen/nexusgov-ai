'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppHeader } from '@/components/layout/app-header';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createOrganization } from '@/lib/db/organizations';
import { OrganizationType } from '@/types';

export default function AdminPage() {
  const { user } = useAuth();
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState<OrganizationType>('MUNICIPALITY');
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check if user is admin
  if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'ORG_ADMIN') {
    return (
      <ProtectedRoute>
        <AppHeader />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Åtkomst nekad</h2>
            <p className="text-gray-600">
              Du har inte behörighet att komma åt administrationspanelen.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsCreating(true);

    try {
      const orgId = await createOrganization(orgName, orgType);
      setMessage({
        type: 'success',
        text: `Organisation "${orgName}" skapades! ID: ${orgId}`,
      });
      setOrgName('');
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `Fel vid skapande av organisation: ${error.message}`,
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-gray-50">
        <AppHeader />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Administrationspanel</h1>
              <p className="mt-2 text-gray-600">Hantera organisationer och användare</p>
            </div>

            {/* Create Organization */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Skapa ny organisation
              </h2>

              {message && (
                <div
                  className={`mb-4 p-4 rounded-md ${
                    message.type === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div>
                  <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-1">
                    Organisationsnamn
                  </label>
                  <Input
                    id="orgName"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="t.ex. Stockholms Kommun"
                    required
                    disabled={isCreating}
                  />
                </div>

                <div>
                  <label htmlFor="orgType" className="block text-sm font-medium text-gray-700 mb-1">
                    Typ
                  </label>
                  <select
                    id="orgType"
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value as OrganizationType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    disabled={isCreating}
                  >
                    <option value="MUNICIPALITY">Kommun (Root Organization)</option>
                    <option value="SUB_UNIT">Underenhet (Avdelning/Förvaltning)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Välj "Kommun" för huvudorganisation, "Underenhet" för avdelningar
                  </p>
                </div>

                <Button type="submit" disabled={isCreating || !orgName.trim()}>
                  {isCreating ? 'Skapar...' : 'Skapa organisation'}
                </Button>
              </form>
            </div>

            {/* Quick Start Guide */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                Snabbstartsguide
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                <li>Skapa en huvudorganisation (Kommun)</li>
                <li>Skapa underenheter (Avdelningar) om  behövs</li>
                <li>Tilldela användare till organisationer via Firestore Console</li>
                <li>Konfigurera budget och GDPR-inställningar</li>
                <li>Användare kan nu börja chatta med AI-assistenten</li>
              </ol>
            </div>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Totalt antal användare</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">-</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Aktiva organisationer</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">-</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Total kostnad denna månad</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">- SEK</div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                Nästa steg i utvecklingen
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                <li>Användarlista med roll-hantering</li>
                <li>Budgetöversikt per organisation</li>
                <li>GDPR compliance-inställningar</li>
                <li>Modell-hantering (vilka modeller som är tillåtna)</li>
                <li>Audit log för DPO (dataskyddsombud)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
