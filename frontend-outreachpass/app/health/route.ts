import { NextResponse } from 'next/server';

// Note: dynamic = 'force-dynamic' removed for static export compatibility
// This health check route will be statically generated

export async function GET() {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: 0, // Will be 0 in static export
    environment: 'production',
  };

  return NextResponse.json(healthCheck, { status: 200 });
}
