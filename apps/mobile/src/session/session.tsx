import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type SessionStatus = 'loading' | 'signed-in' | 'signed-out';

type ResolvedSessionStatus = Exclude<SessionStatus, 'loading'>;

/**
 * Seam for PLAT-03 (data layer). PLAT-03 supplies the real source: restore the
 * Supabase session from secure storage on launch, and sign out through the
 * Supabase client. Until then the default source reports a signed-out session.
 */
export interface SessionSource {
  restore: () => Promise<ResolvedSessionStatus>;
  signOut: () => Promise<void>;
}

export const signedOutSessionSource: SessionSource = {
  restore: () => Promise.resolve('signed-out'),
  signOut: () => Promise.resolve(),
};

export interface SessionValue {
  status: SessionStatus;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

interface SessionProviderProps {
  source?: SessionSource;
  children: ReactNode;
}

export function SessionProvider({
  source = signedOutSessionSource,
  children,
}: SessionProviderProps): JSX.Element {
  const [status, setStatus] = useState<SessionStatus>('loading');

  useEffect(() => {
    let active = true;

    const restore = async (): Promise<void> => {
      let next: ResolvedSessionStatus = 'signed-out';
      try {
        next = await source.restore();
      } catch (error) {
        console.error('Failed to restore session:', error);
      }
      if (active) {
        setStatus(next);
      }
    };

    void restore();

    return () => {
      active = false;
    };
  }, [source]);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await source.signOut();
    } finally {
      setStatus('signed-out');
    }
  }, [source]);

  const value = useMemo(() => ({ status, signOut }), [status, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (value === null) {
    throw new Error('useSession must be used inside SessionProvider');
  }
  return value;
}
