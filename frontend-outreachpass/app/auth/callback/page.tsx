"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Amplify } from 'aws-amplify';
import { config } from '@/config';

// Ensure Amplify is configured for OAuth callback
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: config.cognito.userPoolId,
      userPoolClientId: config.cognito.clientId,
      loginWith: {
        oauth: {
          domain: config.cognito.domain,
          scopes: ['email', 'profile', 'openid'],
          redirectSignIn: [config.app.url],
          redirectSignOut: [config.app.url],
          responseType: 'code',
        },
      },
    },
  },
}, {
  ssr: true,
});

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        // Amplify automatically processes the OAuth callback
        // Wait a moment for the session to be established
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Redirect to admin dashboard after successful auth
        router.push('/admin/dashboard');
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Authentication failed. Please try again.');
        // Redirect to home page after error
        setTimeout(() => router.push('/'), 3000);
      }
    }

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4 text-xl">⚠️</div>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-500 mt-2">Redirecting to home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Signing you in...</p>
      </div>
    </div>
  );
}
