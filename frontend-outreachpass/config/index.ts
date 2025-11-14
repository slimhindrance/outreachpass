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
    userPoolId: getRequiredEnvVar('NEXT_PUBLIC_COGNITO_USER_POOL_ID', 'us-east-1_SXH934qKt'),
    clientId: getRequiredEnvVar('NEXT_PUBLIC_COGNITO_CLIENT_ID', '256e0chtcc14qf8m4knqmobdg0'),
    domain: getRequiredEnvVar('NEXT_PUBLIC_COGNITO_DOMAIN', 'outreachpass-dev.auth.us-east-1.amazoncognito.com'),
    region: getRequiredEnvVar('NEXT_PUBLIC_AWS_REGION', 'us-east-1'),
  },
  app: {
    url: getRequiredEnvVar('NEXT_PUBLIC_APP_URL', 'https://app.outreachpass.base2ml.com'),
  },
} as const;
