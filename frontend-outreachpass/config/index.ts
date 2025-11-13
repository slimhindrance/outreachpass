// Environment variable validation helper
function getRequiredEnvVar(key: string, fallback?: string): string {
  const value = process.env[key];
  if (!value && !fallback) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || fallback!;
}

export const config = {
  api: {
    baseUrl: getRequiredEnvVar('NEXT_PUBLIC_API_URL', 'https://outreachpass.base2ml.com/api/v1'),
  },
  cognito: {
    // SECURITY: These must be set via environment variables
    // Remove hardcoded fallbacks to prevent credential exposure
    userPoolId: getRequiredEnvVar('NEXT_PUBLIC_COGNITO_USER_POOL_ID'),
    clientId: getRequiredEnvVar('NEXT_PUBLIC_COGNITO_CLIENT_ID'),
    domain: getRequiredEnvVar('NEXT_PUBLIC_COGNITO_DOMAIN'),
    region: getRequiredEnvVar('NEXT_PUBLIC_AWS_REGION', 'us-east-1'),
  },
  app: {
    url: getRequiredEnvVar('NEXT_PUBLIC_APP_URL', 'https://outreachpassapp.base2ml.com'),
  },
} as const;
