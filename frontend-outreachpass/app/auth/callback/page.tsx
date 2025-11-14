"use client";

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function AuthCallbackContent() {
  const router = useRouter();

  useEffect(() => {
    console.log('[AuthCallback] Component mounted');
    console.log('[AuthCallback] Current URL:', window.location.href);

    // Amplify v6 handles OAuth code exchange automatically in the background
    // We just need to redirect to the protected route and let middleware verify auth
    console.log('[AuthCallback] Waiting for Amplify to process OAuth code...');

    // Delay to ensure Amplify has processed the OAuth callback and set session cookies
    const timer = setTimeout(() => {
      console.log('[AuthCallback] Redirecting to dashboard...');
      router.push('/admin/dashboard');
    }, 3000);

    return () => clearTimeout(timer);
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
