"use client";

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function AuthCallbackContent() {
  const router = useRouter();

  useEffect(() => {
    console.log('[AuthCallback] Component mounted');
    console.log('[AuthCallback] Current URL:', window.location.href);

    async function handleOAuthCallback() {
      try {
        console.log('[AuthCallback] Processing OAuth code exchange...');

        // Import Amplify auth dynamically
        const { signInWithRedirect, getCurrentUser } = await import('aws-amplify/auth');

        // Check if user is already authenticated
        try {
          const user = await getCurrentUser();
          console.log('[AuthCallback] User already authenticated:', user.username);
          router.push('/admin/dashboard');
          return;
        } catch (error) {
          // User not authenticated yet, continue with OAuth flow
          console.log('[AuthCallback] User not authenticated, processing OAuth code...');
        }

        // Call signInWithRedirect() to complete the OAuth flow
        // This processes the code parameter and exchanges it for tokens
        await signInWithRedirect();

        // After successful code exchange, redirect to dashboard
        console.log('[AuthCallback] OAuth code exchange successful, redirecting...');
        router.push('/admin/dashboard');
      } catch (error) {
        console.error('[AuthCallback] OAuth callback error:', error);
        // On error, redirect home
        router.push('/?error=auth_failed');
      }
    }

    handleOAuthCallback();
  }, [router]);

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
