"use client";

// TEMPORARY: Authentication disabled for testing
// TODO: Re-enable authentication before production deployment

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Bypass all authentication checks for now
  return <>{children}</>;
}
