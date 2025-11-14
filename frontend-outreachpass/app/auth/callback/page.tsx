"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Hub } from 'aws-amplify/utils';
import { getCurrentUser } from 'aws-amplify/auth';

function AuthCallbackContent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[AuthCallback] Component mounted');
    console.log('[AuthCallback] Current URL:', window.location.href);

    let hubUnsubscribe: (() => void) | null = null;

    async function handleCallback() {
      // Listen for Hub auth events
      hubUnsubscribe = Hub.listen('auth', async ({ payload }) => {
        console.log('[AuthCallback] Hub event received:', payload.event);

        switch (payload.event) {
          case 'signInWithRedirect':
            console.log('[AuthCallback] Sign-in successful via Hub event');
            try {
              const user = await getCurrentUser();
              console.log('[AuthCallback] User authenticated:', user.username);
              router.push('/admin/dashboard');
            } catch (error) {
              console.error('[AuthCallback] Failed to get current user:', error);
              setError('Authentication failed. Please try again.');
              setTimeout(() => router.push('/'), 3000);
            }
            break;

          case 'signInWithRedirect_failure':
            console.error('[AuthCallback] Sign-in failed:', payload.data);
            setError('Authentication failed. Please try again.');
            setTimeout(() => router.push('/'), 3000);
            break;
        }
      });

      // Also try to directly check if user is already authenticated
      // This handles cases where the Hub event doesn't fire
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('[AuthCallback] Checking if user is authenticated...');
      try {
        const user = await getCurrentUser();
        console.log('[AuthCallback] User already authenticated:', user.username);
        router.push('/admin/dashboard');
      } catch (error) {
        console.log('[AuthCallback] User not authenticated yet, waiting for Hub event');
        // Wait for Hub event to fire
      }
    }

    handleCallback();

    // Cleanup
    return () => {
      if (hubUnsubscribe) {
        console.log('[AuthCallback] Cleaning up Hub listener');
        hubUnsubscribe();
      }
    };
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
