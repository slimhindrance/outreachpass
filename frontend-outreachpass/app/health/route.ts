import { NextResponse } from 'next/server';

export async function GET() {
  // Basic health check
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  };

  return NextResponse.json(healthCheck, { status: 200 });
}
