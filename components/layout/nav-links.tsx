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
          isActive('/') && !pathname.startsWith('/dashboard') && !pathname.startsWith('/admin') && !pathname.startsWith('/settings') && !pathname.startsWith('/documents')
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        Chat
      </Link>

      <Link
        href="/documents"
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive('/documents')
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        Dokument
      </Link>

      <Link
        href="/meetings"
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive('/meetings')
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        Möten
      </Link>

      <Link
        href="/assistants"
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive('/assistants')
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        Assistenter
      </Link>

      <Link
        href="/klarsprak"
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive('/klarsprak')
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        Klarspråk
      </Link>

      {isAdmin && (
        <>
          <Link
            href="/admin"
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive('/admin') && !pathname.startsWith('/admin/audit') && !pathname.startsWith('/admin/users')
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Admin
          </Link>

          {(user?.role === 'DPO' || user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN') && (
            <Link
              href="/admin/audit"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith('/admin/audit')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Revision
            </Link>
          )}

          {(user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN') && (
            <>
              <Link
                href="/admin/users/invite"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname.startsWith('/admin/users')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Bjud in
              </Link>

              <Link
                href="/admin/bulk"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname.startsWith('/admin/bulk')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Bulk
              </Link>
            </>
          )}
        </>
      )}
    </nav>
  );
}
