"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Hub } from 'aws-amplify/utils';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

function AuthCallbackContent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[AuthCallback] Component mounted');

    async function handleCallback() {
      try {
        console.log('[AuthCallback] Starting OAuth callback handling');
        console.log('[AuthCallback] Current URL:', window.location.href);

        // In Amplify v6 with SSR, we need to explicitly trigger token exchange
        // by calling fetchAuthSession() which processes the OAuth code
        console.log('[AuthCallback] Fetching auth session to process OAuth code...');

        try {
          // This call forces Amplify to exchange the OAuth code for tokens
          const session = await fetchAuthSession({ forceRefresh: true });
          console.log('[AuthCallback] Session fetched successfully:', {
            hasTokens: !!session.tokens,
            hasCredentials: !!session.credentials
          });

          // Verify user is authenticated
          const user = await getCurrentUser();
          console.log('[AuthCallback] User authenticated:', user.username);

          // Success! Redirect to dashboard
          console.log('[AuthCallback] Redirecting to dashboard');
          router.push('/admin/dashboard');
        } catch (e: any) {
          console.error('[AuthCallback] Authentication failed:', {
            error: e,
            message: e.message,
            name: e.name
          });
          setError('Authentication failed. Please try again.');
          setTimeout(() => router.push('/'), 3000);
        }
      } catch (err: any) {
        console.error('[AuthCallback] Fatal error in callback handler:', {
          error: err,
          message: err.message,
          name: err.name
        });
        setError('Authentication failed. Please try again.');
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

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
