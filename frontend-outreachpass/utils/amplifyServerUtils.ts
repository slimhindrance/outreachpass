import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/api';
import { cookies } from 'next/headers';
import { config } from '@/config';

// Convert config to Amplify outputs format
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: config.cognito.userPoolId,
      userPoolClientId: config.cognito.clientId,
      loginWith: {
        oauth: {
          domain: config.cognito.domain,
          scopes: ['email', 'profile', 'openid'],
          redirectSignIn: [`${config.app.url}/auth/callback`],
          redirectSignOut: [config.app.url],
          responseType: 'code' as const,
        },
      },
    },
  },
};

export const { runWithAmplifyServerContext } = createServerRunner({
  config: amplifyConfig,
});

export const cookiesClient = generateServerClientUsingCookies({
  config: amplifyConfig,
  cookies,
});
