'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppHeader } from '@/components/layout/app-header';
import { useAuth } from '@/lib/auth/auth-context';
import { UserRole, UserInvitation } from '@/types';
import { Button } from '@/components/ui/button';

interface InvitationRow {
  email: string;
  organizationId: string;
  organizationName: string;
  role: UserRole;
  tokenLimit: string; // Input as string, convert to number
  budgetLimit: string; // Input as string, convert to number
}

export default function BulkInvitePage() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<InvitationRow[]>([
    createEmptyRow(user?.organizationId || '', user?.organizationId || ''),
  ]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [existingInvitations, setExistingInvitations] = useState<UserInvitation[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(true);

  useEffect(() => {
    if (user) {
      loadExistingInvitations();
    }
  }, [user]);

  const loadExistingInvitations = async () => {
    if (!user) return;

    setLoadingExisting(true);
    try {
      const response = await fetch(`/api/users/bulk-invite?organizationId=${user.organizationId}`);
      const data = await response.json();
      if (data.success) {
        setExistingInvitations(data.invitations);
      }
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoadingExisting(false);
    }
  };

  const addRow = () => {
    setInvitations([...invitations, createEmptyRow(user?.organizationId || '', user?.organizationId || '')]);
  };

  const removeRow = (index: number) => {
    setInvitations(invitations.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof InvitationRow, value: string) => {
    const updated = [...invitations];
    updated[index] = { ...updated[index], [field]: value };
    setInvitations(updated);
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = parseCsv(text);

        if (rows.length === 0) {
          setCsvError('CSV-filen är tom');
          return;
        }

        setInvitations(rows);
        setCsvError(null);
      } catch (error: any) {
        setCsvError(error.message);
      }
    };

    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validate
    const validInvitations = invitations.filter((inv) => inv.email.trim() !== '');

    if (validInvitations.length === 0) {
      alert('Lägg till minst en användare med e-postadress');
      return;
    }

    // Confirm
    if (
      !confirm(
        `Är du säker på att du vill skicka ${validInvitations.length} inbjudan(ar)?`
      )
    ) {
      return;
    }

    setProcessing(true);
    setResults(null);

    try {
      // Convert string limits to numbers
      const processedInvitations = validInvitations.map((inv) => ({
        email: inv.email.trim(),
        organizationId: inv.organizationId,
        organizationName: inv.organizationName || user.organizationId,
        role: inv.role,
        tokenLimit: inv.tokenLimit ? parseInt(inv.tokenLimit) : undefined,
        budgetLimit: inv.budgetLimit ? parseFloat(inv.budgetLimit) : undefined,
      }));

      const response = await fetch('/api/users/bulk-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitations: processedInvitations,
          invitedBy: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details?.join('\n') || data.error || 'Ett fel uppstod');
      }

      setResults(data);

      // Reload existing invitations
      await loadExistingInvitations();

      // Reset form
      setInvitations([createEmptyRow(user.organizationId, user.organizationId)]);
    } catch (error: any) {
      alert(`Fel: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const csv = [
      'email,organizationId,organizationName,role,tokenLimit,budgetLimit',
      'user@example.com,org-123,Kommun Stockholm,USER,100000,500',
      'admin@example.com,org-123,Kommun Stockholm,ORG_ADMIN,500000,2000',
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-invite-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasAccess = user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN';

  if (!hasAccess) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Åtkomst nekad</h1>
            <p className="text-gray-600">Du har inte behörighet att bjuda in användare.</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <AppHeader />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Bjud in användare (Bulk)</h1>
            <p className="mt-2 text-gray-600">
              Bjud in flera användare samtidigt och ställ in organisation, roll och tokengränser
            </p>
          </div>

          {/* Results */}
          {results && (
            <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-3">✓ Inbjudningar skapade</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-sm text-green-700">Totalt</div>
                  <div className="text-2xl font-bold text-green-900">{results.summary.total}</div>
                </div>
                <div>
                  <div className="text-sm text-green-700">Skapade</div>
                  <div className="text-2xl font-bold text-green-900">{results.summary.created}</div>
                </div>
                <div>
                  <div className="text-sm text-red-700">Misslyckades</div>
                  <div className="text-2xl font-bold text-red-900">{results.summary.failed}</div>
                </div>
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer text-green-800 font-medium mb-2">Visa detaljer</summary>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {results.results.map((r: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1 border-t border-green-200">
                      <span className="text-green-800">{r.email}</span>
                      {r.status === 'created' ? (
                        <span className="text-xs text-green-600">✓ Skapad</span>
                      ) : (
                        <span className="text-xs text-red-600">✗ {r.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}

          {/* CSV Upload */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Importera från CSV</h2>

            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={downloadTemplate}>
                📥 Ladda ner mall
              </Button>

              <label className="cursor-pointer">
                <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                <span className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  📤 Ladda upp CSV
                </span>
              </label>

              {csvError && <span className="text-sm text-red-600">{csvError}</span>}
            </div>

            <p className="mt-3 text-sm text-gray-500">
              CSV-filen ska ha kolumnerna: email, organizationId, organizationName, role, tokenLimit, budgetLimit
            </p>
          </div>

          {/* Manual Entry */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Manuell inmatning</h2>
              <Button variant="outline" size="sm" onClick={addRow}>
                + Lägg till rad
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">E-post *</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Organisations-ID *</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Organisations namn</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Roll *</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                      Token-gräns (månad)
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Budget (SEK/månad)</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="px-3 py-2">
                        <input
                          type="email"
                          value={inv.email}
                          onChange={(e) => updateRow(index, 'email', e.target.value)}
                          placeholder="user@example.com"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={inv.organizationId}
                          onChange={(e) => updateRow(index, 'organizationId', e.target.value)}
                          placeholder="org-123"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={inv.organizationName}
                          onChange={(e) => updateRow(index, 'organizationName', e.target.value)}
                          placeholder="Kommun Stockholm"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={inv.role}
                          onChange={(e) => updateRow(index, 'role', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="USER">Användare</option>
                          <option value="UNIT_ADMIN">Enhetadmin</option>
                          <option value="ORG_ADMIN">Organisationsadmin</option>
                          <option value="DPO">DPO</option>
                          <option value="SUPER_ADMIN">Superadmin</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={inv.tokenLimit}
                          onChange={(e) => updateRow(index, 'tokenLimit', e.target.value)}
                          placeholder="100000"
                          className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={inv.budgetLimit}
                          onChange={(e) => updateRow(index, 'budgetLimit', e.target.value)}
                          placeholder="500"
                          className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        {invitations.length > 1 && (
                          <button
                            onClick={() => removeRow(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSubmit} disabled={processing}>
                {processing ? 'Skickar inbjudningar...' : `Skicka ${invitations.filter(i => i.email.trim()).length} inbjudan(ar)`}
              </Button>
            </div>
          </div>

          {/* Existing Invitations */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Befintliga inbjudningar ({existingInvitations.length})
            </h2>

            {loadingExisting ? (
              <div className="text-center py-8 text-gray-500">Laddar...</div>
            ) : existingInvitations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Inga inbjudningar ännu</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">E-post</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Organisation</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Roll</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Gränser</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Skapad</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {existingInvitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{inv.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{inv.organizationName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{getRoleLabel(inv.role)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {inv.tokenLimit && <div>Tokens: {inv.tokenLimit.toLocaleString()}</div>}
                          {inv.budgetLimit && <div>Budget: {inv.budgetLimit} SEK</div>}
                          {!inv.tokenLimit && !inv.budgetLimit && '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(inv.status)}`}>
                            {getStatusLabel(inv.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(inv.invitedAt).toLocaleDateString('sv-SE')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function createEmptyRow(orgId: string, orgName: string): InvitationRow {
  return {
    email: '',
    organizationId: orgId,
    organizationName: orgName,
    role: 'USER',
    tokenLimit: '',
    budgetLimit: '',
  };
}

function parseCsv(text: string): InvitationRow[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV måste ha header och minst en rad');

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());

  // Validate required columns
  const requiredColumns = ['email', 'organizationid', 'role'];
  for (const col of requiredColumns) {
    if (!header.includes(col)) {
      throw new Error(`Saknar kolumn: ${col}`);
    }
  }

  const rows: InvitationRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const row: any = {};

    header.forEach((col, index) => {
      row[col] = values[index] || '';
    });

    rows.push({
      email: row.email || '',
      organizationId: row.organizationid || '',
      organizationName: row.organizationname || '',
      role: (row.role || 'USER').toUpperCase() as UserRole,
      tokenLimit: row.tokenlimit || '',
      budgetLimit: row.budgetlimit || '',
    });
  }

  return rows;
}

function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    SUPER_ADMIN: 'Superadmin',
    ORG_ADMIN: 'Organisationsadmin',
    UNIT_ADMIN: 'Enhetadmin',
    USER: 'Användare',
    DPO: 'DPO',
  };
  return labels[role] || role;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Väntande',
    SENT: 'Skickad',
    ACCEPTED: 'Accepterad',
    EXPIRED: 'Utgången',
    REVOKED: 'Återkallad',
  };
  return labels[status] || status;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    SENT: 'bg-blue-100 text-blue-800',
    ACCEPTED: 'bg-green-100 text-green-800',
    EXPIRED: 'bg-gray-100 text-gray-800',
    REVOKED: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
