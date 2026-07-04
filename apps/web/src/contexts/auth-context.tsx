"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentDocuFlowSession } from '@/lib/auth';
import type { DocuFlowSession } from '@/lib/auth';
import { Hub } from 'aws-amplify/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface AuthContextType {
  session: DocuFlowSession | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<DocuFlowSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const currentSession = await getCurrentDocuFlowSession();
      setSession(currentSession);
    } catch (error) {
      console.error('Error fetching session:', error);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();

    // Listen to Auth events (sign in, sign out)
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
        case 'tokenRefresh':
          fetchSession();
          break;
        case 'signedOut':
          setSession(null);
          break;
      }
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return <div className="flex min-h-svh items-center justify-center bg-[#f3f1e9]"><LoadingSpinner /></div>;
  }

  return (
    <AuthContext.Provider value={{ session, isLoading, refreshSession: fetchSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
