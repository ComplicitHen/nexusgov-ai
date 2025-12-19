'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppHeader } from '@/components/layout/app-header';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AI_MODELS } from '@/lib/ai/models';

interface SystemStatus {
  service: string;
  status: 'operational' | 'degraded' | 'down';
  responseTime?: number;
  message?: string;
}

export default function SystemStatusPage() {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<SystemStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN';

  useEffect(() => {
    if (isAdmin) {
      checkSystemStatus();
    }
  }, [isAdmin]);

  const checkSystemStatus = async () => {
    setLoading(true);
    const results: SystemStatus[] = [];

    // Check Firebase
    try {
      const startTime = Date.now();
      const { db } = await import('@/lib/firebase/config');
      const { collection, getDocs, limit, query } = await import('firebase/firestore');

      await getDocs(query(collection(db, 'users'), limit(1)));

      results.push({
        service: 'Firebase Firestore',
        status: 'operational',
        responseTime: Date.now() - startTime,
      });
    } catch (error: any) {
      results.push({
        service: 'Firebase Firestore',
        status: 'down',
        message: error.message,
      });
    }

    // Check OpenRouter
    try {
      const startTime = Date.now();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test' }],
          modelId: 'mistral-large-eu',
          enablePIIScreening: false,
        }),
      });

      if (response.ok || response.status === 403) {
        results.push({
          service: 'OpenRouter API',
          status: 'operational',
          responseTime: Date.now() - startTime,
        });
      } else {
        results.push({
          service: 'OpenRouter API',
          status: 'degraded',
          message: `HTTP ${response.status}`,
        });
      }
    } catch (error: any) {
      results.push({
        service: 'OpenRouter API',
        status: 'down',
        message: error.message,
      });
    }

    // Check Firebase Storage
    try {
      const { storage } = await import('@/lib/firebase/config');
      results.push({
        service: 'Firebase Storage',
        status: 'operational',
      });
    } catch (error: any) {
      results.push({
        service: 'Firebase Storage',
        status: 'down',
        message: error.message,
      });
    }

    // Check Qdrant Vector Database
    try {
      const startTime = Date.now();
      const response = await fetch('/api/search/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'health check',
          organizationId: 'test',
          userId: 'test',
          limit: 1,
        }),
      });

      // Even if search returns error (no docs), Qdrant is operational if it responds
      if (response.status === 503) {
        results.push({
          service: 'Qdrant Vector DB',
          status: 'down',
          message: 'Not configured',
        });
      } else {
        results.push({
          service: 'Qdrant Vector DB',
          status: 'operational',
          responseTime: Date.now() - startTime,
        });
      }
    } catch (error: any) {
      results.push({
        service: 'Qdrant Vector DB',
        status: 'down',
        message: error.message,
      });
    }

    setStatuses(results);
    setLastChecked(new Date());
    setLoading(false);
  };

  const getStatusColor = (status: SystemStatus['status']) => {
    switch (status) {
      case 'operational':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'down':
        return 'text-red-600 bg-red-100';
    }
  };

  const getStatusIcon = (status: SystemStatus['status']) => {
    switch (status) {
      case 'operational':
        return '✓';
      case 'degraded':
        return '⚠';
      case 'down':
        return '✗';
    }
  };

  if (!isAdmin) {
    return (
      <ProtectedRoute>
        <AppHeader />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Åtkomst nekad</h2>
            <p className="text-gray-600">
              Du har inte behörighet att komma åt systemstatus.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-gray-50">
        <AppHeader />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Systemstatus</h1>
                <p className="mt-2 text-gray-600">Övervaka systemets hälsa och tillgänglighet</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={checkSystemStatus} disabled={loading}>
                  {loading ? 'Kontrollerar...' : 'Uppdatera'}
                </Button>
                <Link href="/admin">
                  <Button variant="outline">Tillbaka</Button>
                </Link>
              </div>
            </div>

            {/* Last Checked */}
            <div className="mb-6 text-sm text-gray-600">
              Senast kontrollerad: {lastChecked.toLocaleString('sv-SE')}
            </div>

            {/* System Services */}
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Systemtjänster</h2>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Kontrollerar status...</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {statuses.map((item, index) => (
                    <div key={index} className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${getStatusColor(
                            item.status
                          )}`}
                        >
                          {getStatusIcon(item.status)}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{item.service}</h3>
                          {item.message && (
                            <p className="text-sm text-gray-500 mt-1">{item.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.status)}`}>
                          {item.status === 'operational'
                            ? 'Operationell'
                            : item.status === 'degraded'
                            ? 'Försämrad'
                            : 'Nere'}
                        </div>
                        {item.responseTime && (
                          <p className="text-xs text-gray-500 mt-1">{item.responseTime}ms</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Models */}
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">AI-modeller</h2>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {AI_MODELS.filter((m) => m.isActive).map((model) => (
                    <div key={model.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{model.name}</h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            model.dataResidency === 'EU'
                              ? 'bg-green-100 text-green-800'
                              : model.dataResidency === 'US_ZDR'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {model.dataResidency}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Leverantör: {model.provider}</div>
                        <div>Max tokens: {model.maxTokens.toLocaleString()}</div>
                        <div>
                          Kostnad: {model.costPerToken.input.toFixed(4)} SEK/1K in,{' '}
                          {model.costPerToken.output.toFixed(4)} SEK/1K out
                        </div>
                        <div>
                          DPA: {model.hasDPA ? '✓ Ja' : '✗ Nej'} | ZDR:{' '}
                          {model.zeroDataRetention ? '✓ Ja' : '✗ Nej'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Environment Info */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Systeminformation</h2>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Konfiguration</h3>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Node.js version:</dt>
                      <dd className="font-mono text-gray-900">
                        {typeof process !== 'undefined' ? process.version || 'N/A' : 'N/A'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Environment:</dt>
                      <dd className="font-mono text-gray-900">
                        {process.env.NODE_ENV || 'development'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Firebase projekt:</dt>
                      <dd className="font-mono text-gray-900">nexusgov-ai</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Region:</dt>
                      <dd className="font-mono text-gray-900">europe-west1 (EU)</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">API-nycklar</h3>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">OpenRouter:</dt>
                      <dd className="text-gray-900">
                        {process.env.OPENROUTER_API_KEY ? '✓ Konfigurerad' : '✗ Saknas'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Firebase:</dt>
                      <dd className="text-gray-900">
                        {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✓ Konfigurerad' : '✗ Saknas'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Qdrant:</dt>
                      <dd className="text-gray-900">
                        {process.env.QDRANT_URL ? '✓ Konfigurerad' : '⚠ Ej konfigurerad'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
