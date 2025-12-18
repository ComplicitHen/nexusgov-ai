'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

export function NavLinks() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (path: string) => pathname === path;

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN';

  return (
    <nav className="flex items-center gap-1">
      <Link
        href="/dashboard"
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive('/dashboard')
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        Dashboard
      </Link>

      <Link
        href="/"
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive('/') && !pathname.startsWith('/dashboard') && !pathname.startsWith('/admin') && !pathname.startsWith('/settings')
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        Chat
      </Link>

      {isAdmin && (
        <Link
          href="/admin"
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive('/admin')
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Admin
        </Link>
      )}
    </nav>
  );
}
