/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Docker/ECS deployment
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://outreachpass.base2ml.com/api/v1',
    NEXT_PUBLIC_COGNITO_USER_POOL_ID: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_SXH934qKt',
    NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '256e0chtcc14qf8m4knqmobdg0',
    NEXT_PUBLIC_COGNITO_DOMAIN: process.env.NEXT_PUBLIC_COGNITO_DOMAIN || 'outreachpass-dev.auth.us-east-1.amazoncognito.com',
    NEXT_PUBLIC_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://app.outreachpass.base2ml.com',
  },
}

module.exports = nextConfig
