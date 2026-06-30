import { Amplify } from 'aws-amplify';

const region = import.meta.env.VITE_COGNITO_REGION || '';
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
const userPoolClientId = import.meta.env.VITE_COGNITO_CLIENT_ID || '';

export function configureAmplify() {
  if (!region || !userPoolId || !userPoolClientId) {
    console.warn('Amplify is not configured because of missing environment variables.');
    return;
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          email: true,
        },
      }
    }
  });
}
