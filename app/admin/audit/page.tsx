'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppHeader } from '@/components/layout/app-header';
import { useAuth } from '@/lib/auth/auth-context';
import { AuditLog } from '@/types';
import { Button } from '@/components/ui/button';

interface AuditSummary {
  totalLogs: number;
  totalCost: number;
  totalTokens: number;
  piiDetectedCount: number;
  failedCount: number;
  blockedCount: number;
  successCount: number;
  actionBreakdown: Record<string, number>;
  dataResidencyBreakdown: Record<string, number>;
}

export default function AuditDashboardPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    startDate: getDefaultStartDate(),
    endDate: new Date().toISOString().split('T')[0],
    action: '',
    userId: '',
    piiOnly: false,
    status: '',
    dataResidency: '',
  });

  useEffect(() => {
    if (user) {
      loadAuditLogs();
    }
  }, [user, filters]);

  const loadAuditLogs = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams({
        organizationId: user.organizationId,
        limit: '500',
      });

      if (filters.startDate) params.append('startDate', new Date(filters.startDate).toISOString());
      if (filters.endDate) params.append('endDate', new Date(filters.endDate + 'T23:59:59').toISOString());
      if (filters.action) params.append('action', filters.action);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.piiOnly) params.append('piiOnly', 'true');
      if (filters.status) params.append('status', filters.status);
      if (filters.dataResidency) params.append('dataResidency', filters.dataResidency);

      const response = await fetch(`/api/audit?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.logs);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!user) return;

    setExporting(true);
    try {
      // Build same query params
      const params = new URLSearchParams({
        organizationId: user.organizationId,
      });

      if (filters.startDate) params.append('startDate', new Date(filters.startDate).toISOString());
      if (filters.endDate) params.append('endDate', new Date(filters.endDate + 'T23:59:59').toISOString());
      if (filters.action) params.append('action', filters.action);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.piiOnly) params.append('piiOnly', 'true');
      if (filters.status) params.append('status', filters.status);
      if (filters.dataResidency) params.append('dataResidency', filters.dataResidency);

      // Trigger download
      window.location.href = `/api/audit/export?${params.toString()}`;
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Ett fel uppstod vid export');
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      startDate: getDefaultStartDate(),
      endDate: new Date().toISOString().split('T')[0],
      action: '',
      userId: '',
      piiOnly: false,
      status: '',
      dataResidency: '',
    });
  };

  // Check if user has access (DPO or Admin)
  const hasAccess = user?.role === 'DPO' || user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN';

  if (!hasAccess) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Åtkomst nekad</h1>
            <p className="text-gray-600">Du har inte behörighet att visa revisionloggen.</p>
            <p className="text-sm text-gray-500 mt-2">Kontakta en DPO eller administratör.</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Revisionlogg (DPO)</h1>
            <p className="mt-2 text-gray-600">
              Fullständig spårbarhet av alla AI-interaktioner för GDPR-efterlevnad
            </p>
          </div>

          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                title="Totalt antal händelser"
                value={summary.totalLogs.toLocaleString()}
                icon="📊"
                color="blue"
              />
              <StatCard
                title="Total kostnad"
                value={`${summary.totalCost.toFixed(2)} SEK`}
                icon="💰"
                color="green"
              />
              <StatCard
                title="PII-upptäckter"
                value={summary.piiDetectedCount.toLocaleString()}
                subtitle={`${((summary.piiDetectedCount / summary.totalLogs) * 100).toFixed(1)}% av händelser`}
                icon="🔒"
                color="orange"
              />
              <StatCard
                title="Fel/Blockerade"
                value={(summary.failedCount + summary.blockedCount).toLocaleString()}
                subtitle={`${summary.failedCount} fel, ${summary.blockedCount} blockerade`}
                icon="⚠️"
                color="red"
              />
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Från datum</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Till datum</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Action Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Händelsetyp</label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Alla</option>
                  <option value="CHAT_MESSAGE">Chattmeddelande</option>
                  <option value="DOCUMENT_UPLOAD">Dokumentuppladdning</option>
                  <option value="MEETING_UPLOAD">Mötesuppladdning</option>
                  <option value="MEETING_TRANSCRIBE">Transkribering</option>
                  <option value="KLARSPRAK_SIMPLIFY">Klarspråk</option>
                  <option value="ASSISTANT_CREATE">Skapa assistent</option>
                  <option value="ASSISTANT_USE">Använd assistent</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Alla</option>
                  <option value="SUCCESS">Lyckades</option>
                  <option value="FAILED">Misslyckades</option>
                  <option value="BLOCKED">Blockerad</option>
                </select>
              </div>

              {/* Data Residency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data residency</label>
                <select
                  value={filters.dataResidency}
                  onChange={(e) => setFilters({ ...filters, dataResidency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Alla</option>
                  <option value="EU">EU</option>
                  <option value="US_ZDR">US (Zero Data Retention)</option>
                  <option value="NON_COMPLIANT">Icke-kompatibel</option>
                </select>
              </div>

              {/* PII Only */}
              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.piiOnly}
                    onChange={(e) => setFilters({ ...filters, piiOnly: e.target.checked })}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Endast PII-upptäckter</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-end gap-2 lg:col-span-2">
                <Button variant="outline" onClick={resetFilters}>
                  Återställ filter
                </Button>
                <Button onClick={handleExport} disabled={exporting}>
                  {exporting ? 'Exporterar...' : '📥 Exportera CSV'}
                </Button>
              </div>
            </div>
          </div>

          {/* Action Breakdown */}
          {summary && summary.actionBreakdown && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Händelser per typ</h3>
                <div className="space-y-2">
                  {Object.entries(summary.actionBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([action, count]) => (
                      <div key={action} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{getActionLabel(action)}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${(count / summary.totalLogs) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Data residency fördelning</h3>
                <div className="space-y-2">
                  {Object.entries(summary.dataResidencyBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([residency, count]) => (
                      <div key={residency} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{getResidencyLabel(residency)}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getResidencyColor(residency)}`}
                              style={{
                                width: `${(count / summary.totalLogs) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Audit Logs Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Revisionshändelser ({logs.length})
              </h2>
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
                <p className="text-gray-600">Laddar revisionshändelser...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-600">Inga händelser hittades för valda filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tidpunkt
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Användare
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Händelse
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Modell
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PII
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kostnad
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(log.timestamp).toLocaleString('sv-SE')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                          <div className="text-xs text-gray-500">{log.userEmail}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{getActionLabel(log.action)}</div>
                          <div className="text-xs text-gray-500">{log.actionDescription}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{log.modelName || log.modelId || '-'}</div>
                          <div className="text-xs text-gray-500">{log.dataResidency}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.piiDetected ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              🔒 Upptäckt
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              log.status
                            )}`}
                          >
                            {getStatusLabel(log.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.cost ? `${log.cost.toFixed(4)} SEK` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* GDPR Compliance Notice */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">📋 GDPR-efterlevnad</h3>
            <p className="text-sm text-blue-800">
              Denna revisionlogg följer GDPR Artikel 30 (Register över behandlingsverksamheter) och Artikel 5
              (Principerna för behandling av personuppgifter). All PII har maskeras innan lagring. Exporterade loggar
              ska hanteras enligt organisationens dataskyddspolicy.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  color: 'blue' | 'green' | 'orange' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    orange: 'bg-orange-50 border-orange-200',
    red: 'bg-red-50 border-red-200',
  };

  return (
    <div className={`rounded-lg p-6 border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30); // Last 30 days
  return date.toISOString().split('T')[0];
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    CHAT_MESSAGE: 'Chattmeddelande',
    DOCUMENT_UPLOAD: 'Dokumentuppladdning',
    DOCUMENT_DELETE: 'Dokumentradering',
    DOCUMENT_DOWNLOAD: 'Dokumentnedladdning',
    MEETING_UPLOAD: 'Mötesuppladdning',
    MEETING_TRANSCRIBE: 'Transkribering',
    MEETING_EXPORT: 'Mötesexport',
    KLARSPRAK_SIMPLIFY: 'Klarspråk förenkling',
    ASSISTANT_CREATE: 'Skapa assistent',
    ASSISTANT_USE: 'Använd assistent',
    MODEL_SWITCH: 'Modellbyte',
    SETTINGS_CHANGE: 'Inställningsändring',
    USER_INVITE: 'Användarinbjudan',
    USER_DELETE: 'Användarradering',
    BULK_OPERATION: 'Bulkoperation',
  };
  return labels[action] || action;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    SUCCESS: '✓ Lyckades',
    FAILED: '✗ Misslyckades',
    BLOCKED: '🚫 Blockerad',
  };
  return labels[status] || status;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    SUCCESS: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
    BLOCKED: 'bg-orange-100 text-orange-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

function getResidencyLabel(residency: string): string {
  const labels: Record<string, string> = {
    EU: '🇪🇺 EU',
    US_ZDR: '🇺🇸 US (Zero Data Retention)',
    NON_COMPLIANT: '⚠️ Icke-kompatibel',
  };
  return labels[residency] || residency;
}

function getResidencyColor(residency: string): string {
  const colors: Record<string, string> = {
    EU: 'bg-green-600',
    US_ZDR: 'bg-blue-600',
    NON_COMPLIANT: 'bg-red-600',
  };
  return colors[residency] || 'bg-gray-600';
}
