import { ResourcesConfig } from 'aws-amplify';
import { config } from '@/config';

export const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: config.cognito.userPoolId,
      userPoolClientId: config.cognito.clientId,
      loginWith: {
        oauth: {
          domain: `${config.cognito.domain}.auth.${config.cognito.region}.amazoncognito.com`,
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [`${config.app.url}/auth/callback/`],
          redirectSignOut: [`${config.app.url}/`],
          responseType: 'code',
        },
      },
    },
  },
};
