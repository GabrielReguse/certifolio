import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { authClient } from '../lib/auth-client';
import type { Profile, User } from '../types';

type SessionValue = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  profileError: string;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  const refreshProfile = useCallback(async () => {
    if (!session.data?.user) {
      setProfile(null);
      setProfileError('');
      return;
    }
    setProfileLoading(true);
    setProfileError('');
    try {
      const result = await api<{ user: User; profile: Profile }>('/api/me');
      setProfile(result.profile);
    } catch (error) {
      setProfile(null);
      setProfileError(error instanceof Error ? error.message : 'Não foi possível carregar seu perfil.');
    } finally {
      setProfileLoading(false);
    }
  }, [session.data?.user?.id]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const refresh = useCallback(async () => {
    await session.refetch();
    await refreshProfile();
  }, [session, refreshProfile]);

  const signOut = useCallback(async () => {
    try {
      await authClient.signOut();
    } finally {
      setProfile(null);
      window.location.assign('/entrar');
    }
  }, []);

  const value = useMemo<SessionValue>(() => ({
    user: (session.data?.user as User | undefined) ?? null,
    profile,
    loading: session.isPending,
    profileLoading,
    profileError,
    refresh,
    signOut,
  }), [session.data?.user, session.isPending, profile, profileLoading, profileError, refresh, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession precisa estar dentro de SessionProvider.');
  return value;
}
