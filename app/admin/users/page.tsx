'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppHeader } from '@/components/layout/app-header';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { User, UserRole } from '@/types';
import Link from 'next/link';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check if user is admin
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN';

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const usersList = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email,
          displayName: data.displayName,
          organizationId: data.organizationId,
          role: data.role,
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
          personalBudget: data.personalBudget,
          preferences: data.preferences || {
            language: 'sv',
            enableCitations: true,
          },
        } as User;
      });

      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
      setMessage({ type: 'error', text: 'Kunde inte ladda användare' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });

      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      setMessage({ type: 'success', text: 'Användarroll uppdaterad' });
      setEditingUser(null);
    } catch (error: any) {
      setMessage({ type: 'error', text: `Fel: ${error.message}` });
    }
  };

  const handleUpdateOrganization = async (userId: string, orgId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { organizationId: orgId });

      setUsers(users.map((u) => (u.id === userId ? { ...u, organizationId: orgId } : u)));
      setMessage({ type: 'success', text: 'Organisation uppdaterad' });
      setEditingUser(null);
    } catch (error: any) {
      setMessage({ type: 'error', text: `Fel: ${error.message}` });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Är du säker på att du vill radera denna användare? Detta kan inte ångras.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(users.filter((u) => u.id !== userId));
      setMessage({ type: 'success', text: 'Användare raderad' });
    } catch (error: any) {
      setMessage({ type: 'error', text: `Fel: ${error.message}` });
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'ORG_ADMIN':
        return 'bg-blue-100 text-blue-800';
      case 'UNIT_ADMIN':
        return 'bg-green-100 text-green-800';
      case 'DPO':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
              Du har inte behörighet att komma åt användarhantering.
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
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Användarhantering</h1>
                <p className="mt-2 text-gray-600">Hantera användare och roller</p>
              </div>
              <Link href="/admin">
                <Button variant="outline">Tillbaka till admin</Button>
              </Link>
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

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Totalt antal användare</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{users.length}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Administratörer</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {users.filter((u) => u.role === 'SUPER_ADMIN' || u.role === 'ORG_ADMIN').length}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Med organisation</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {users.filter((u) => u.organizationId).length}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Utan organisation</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {users.filter((u) => !u.organizationId).length}
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="mb-6">
              <Input
                type="search"
                placeholder="Sök användare (namn eller e-post)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Laddar användare...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchTerm ? 'Inga användare hittades' : 'Inga användare än'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Användare
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Roll
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Organisation
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Senast inloggad
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Åtgärder
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                                {u.displayName.charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {u.displayName}
                                </div>
                                <div className="text-sm text-gray-500">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingUser?.id === u.id ? (
                              <select
                                value={u.role}
                                onChange={(e) => handleUpdateRole(u.id, e.target.value as UserRole)}
                                className="text-sm border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="USER">USER</option>
                                <option value="UNIT_ADMIN">UNIT_ADMIN</option>
                                <option value="ORG_ADMIN">ORG_ADMIN</option>
                                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                                <option value="DPO">DPO</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-1 text-xs font-medium rounded ${getRoleBadgeColor(u.role)}`}>
                                {u.role}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {u.organizationId ? (
                              <span className="font-mono text-xs">{u.organizationId.slice(0, 8)}...</span>
                            ) : (
                              <span className="text-yellow-600">Ingen organisation</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {u.lastLoginAt.toLocaleDateString('sv-SE')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              {editingUser?.id === u.id ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingUser(null)}
                                >
                                  Avbryt
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingUser(u)}
                                  >
                                    Redigera
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteUser(u.id)}
                                  >
                                    Radera
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Roller</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                <li><strong>SUPER_ADMIN</strong>: Full åtkomst till allt</li>
                <li><strong>ORG_ADMIN</strong>: Hantera sin organisation och användare</li>
                <li><strong>UNIT_ADMIN</strong>: Hantera sin enhet</li>
                <li><strong>DPO</strong>: Dataskyddsombud (audit logs)</li>
                <li><strong>USER</strong>: Standardanvändare</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
