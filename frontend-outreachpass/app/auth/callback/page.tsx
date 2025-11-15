"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function AuthCallbackContent() {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    console.log('[AuthCallback] Component mounted');
    console.log('[AuthCallback] Current URL:', window.location.href);

    // Amplify v6 handles OAuth code exchange automatically in the background
    // We need to wait for the session cookies to be set before redirecting
    console.log('[AuthCallback] Waiting for Amplify to process OAuth code...');

    // Poll for auth cookies (Amplify sets these after OAuth code exchange)
    const checkAuthReady = () => {
      const cookies = document.cookie;
      const hasAuthCookies = cookies.includes('CognitoIdentityServiceProvider');

      console.log(`[AuthCallback] Check ${attempts + 1}: Auth cookies ${hasAuthCookies ? 'found' : 'not found yet'}`);

      if (hasAuthCookies) {
        console.log('[AuthCallback] Authentication ready, redirecting to dashboard...');
        router.push('/admin/dashboard');
        return true;
      }

      return false;
    };

    // Try immediately
    if (checkAuthReady()) return;

    // Poll every 500ms for up to 10 seconds
    const pollInterval = setInterval(() => {
      setAttempts(prev => prev + 1);

      if (checkAuthReady()) {
        clearInterval(pollInterval);
      } else if (attempts >= 20) {
        console.error('[AuthCallback] Timeout waiting for authentication');
        clearInterval(pollInterval);
        // Redirect anyway after 10 seconds, middleware will handle it
        router.push('/admin/dashboard');
      }
    }, 500);

    return () => clearInterval(pollInterval);
  }, [router, attempts]);

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
