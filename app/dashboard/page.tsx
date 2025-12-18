'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppHeader } from '@/components/layout/app-header';
import { useAuth } from '@/lib/auth/auth-context';
import { getUserConversations } from '@/lib/db/conversations';
import { getOrganization } from '@/lib/db/organizations';
import { Conversation, Organization } from '@/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [convs, org] = await Promise.all([
        getUserConversations(user.id, 10),
        user.organizationId ? getOrganization(user.organizationId) : Promise.resolve(null),
      ]);

      setConversations(convs);
      setOrganization(org);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalCost = conversations.reduce((sum, conv) => sum + conv.totalCost, 0);
  const totalMessages = conversations.reduce((sum, conv) => sum + conv.messageCount, 0);
  const totalTokens = conversations.reduce((sum, conv) => sum + conv.totalTokens, 0);

  // Calculate budget percentage
  const budgetPercentage = organization
    ? (organization.budget.currentSpend / organization.budget.monthlyLimit) * 100
    : 0;

  const budgetColor =
    budgetPercentage >= 100
      ? 'text-red-600'
      : budgetPercentage >= 80
      ? 'text-yellow-600'
      : 'text-green-600';

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-gray-50">
        <AppHeader />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                Välkommen, {user?.displayName}!
              </h1>
              <p className="mt-2 text-gray-600">
                Här är en överblick av din AI-användning
              </p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Laddar...</p>
              </div>
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {/* Total Conversations */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Konversationer</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                          {conversations.length}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Total Messages */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Meddelanden</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{totalMessages}</p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Total Tokens */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Tokens</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                          {totalTokens.toLocaleString()}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Total Cost */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total kostnad</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                          {totalCost.toFixed(2)} SEK
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-yellow-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Organization Budget */}
                {organization && (
                  <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Organisationsbudget
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">
                            {organization.name} - {organization.complianceMode} läge
                          </span>
                          <span className={`font-medium ${budgetColor}`}>
                            {budgetPercentage.toFixed(1)}% använt
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${
                              budgetPercentage >= 100
                                ? 'bg-red-600'
                                : budgetPercentage >= 80
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>{organization.budget.currentSpend.toFixed(2)} SEK</span>
                          <span>{organization.budget.monthlyLimit.toFixed(2)} SEK</span>
                        </div>
                      </div>

                      {budgetPercentage >= organization.budget.alertThreshold && (
                        <div
                          className={`p-4 rounded-md ${
                            budgetPercentage >= 100
                              ? 'bg-red-50 border border-red-200'
                              : 'bg-yellow-50 border border-yellow-200'
                          }`}
                        >
                          <p
                            className={`text-sm ${
                              budgetPercentage >= 100 ? 'text-red-800' : 'text-yellow-800'
                            }`}
                          >
                            {budgetPercentage >= 100
                              ? '⚠️ Budgeten är uppnådd! Kontakta administratören.'
                              : `⚠️ ${budgetPercentage.toFixed(0)}% av budgeten är använd.`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
                    <h3 className="text-lg font-semibold mb-2">Börja chatta</h3>
                    <p className="text-blue-100 mb-4">
                      Starta en ny konversation med AI-assistenten
                    </p>
                    <Link href="/">
                      <Button variant="secondary">Ny konversation</Button>
                    </Link>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
                    <h3 className="text-lg font-semibold mb-2">Kom igång</h3>
                    <p className="text-purple-100 mb-4">
                      Lär dig hur du använder NexusGov AI effektivt
                    </p>
                    <Button variant="secondary">Se guide</Button>
                  </div>
                </div>

                {/* Recent Conversations */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Senaste konversationer
                    </h2>
                  </div>

                  {conversations.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <p>Inga konversationer än. Börja chatta för att komma igång!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {conversations.slice(0, 5).map((conv) => (
                        <Link
                          key={conv.id}
                          href={`/?conversation=${conv.id}`}
                          className="block p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {conv.title}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-gray-500">
                                  {conv.messageCount} meddelanden
                                </span>
                                <span className="text-xs text-gray-500">
                                  {conv.totalCost.toFixed(2)} SEK
                                </span>
                                <span className="text-xs text-gray-400">
                                  {new Date(conv.updatedAt).toLocaleDateString('sv-SE')}
                                </span>
                              </div>
                            </div>
                            <svg
                              className="w-5 h-5 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
