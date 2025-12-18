'use client';

import { useState } from 'react';
import { SignInForm } from './sign-in-form';
import { SignUpForm } from './sign-up-form';

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">NexusGov AI</h1>
          <p className="text-sm text-gray-600">
            GDPR-kompatibel AI-plattform för offentlig sektor
          </p>
        </div>

        {mode === 'signin' ? (
          <SignInForm onToggleMode={() => setMode('signup')} />
        ) : (
          <SignUpForm onToggleMode={() => setMode('signin')} />
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500">
            Genom att använda NexusGov AI godkänner du vår hantering av data i enlighet med GDPR.
            All data lagras i EU (europe-west1).
          </p>
        </div>
      </div>
    </div>
  );
}
