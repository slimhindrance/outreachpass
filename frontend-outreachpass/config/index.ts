export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://outreachpass.base2ml.com',
  },
  cognito: {
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_SXH934qKt',
    clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '256e0chtcc14qf8m4knqmobdg0',
    domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN || 'outreachpass-dev',
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://outreachpassapp.base2ml.com',
  },
} as const;
