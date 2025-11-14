"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { signIn as amplifySignIn, signOut as amplifySignOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { config } from '@/config';

// Configure Amplify with Cognito settings
Amplify.configure({
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
          responseType: 'code',
        },
      },
    },
  },
}, {
  ssr: true,
});

interface AuthUser {
  username: string;
  email?: string;
  groups?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | undefined>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser({
        username: currentUser.username,
        email: currentUser.signInDetails?.loginId,
      });
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function signIn() {
    try {
      // Use Amplify's signInWithRedirect for Cognito Hosted UI
      // No provider param means default redirect to Cognito HostedUI
      const { signInWithRedirect } = await import('aws-amplify/auth');
      await signInWithRedirect();
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async function signOut() {
    try {
      await amplifySignOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  async function getToken(): Promise<string | undefined> {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString();
    } catch (error) {
      console.error('Get token error:', error);
      return undefined;
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signOut,
    getToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
