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

export type ResolvedSessionStatus = Exclude<SessionStatus, 'loading'>;

/**
 * Where SessionProvider gets the session. The app passes the Supabase-backed source
 * (supabase-source.ts). Tests pass fakes.
 */
export interface SessionSource {
  /** The session that exists at start-up. A rejection is treated as signed out. */
  restore: () => Promise<ResolvedSessionStatus>;
  /**
   * Calls `listener` with each change after start-up: sign-in, sign-out, or a session
   * that expired. Returns a function that stops the subscription.
   */
  subscribe: (listener: (status: ResolvedSessionStatus) => void) => () => void;
  /** Signs out and clears what the previous user left on the device. */
  signOut: () => Promise<void>;
}

export interface SessionValue {
  status: SessionStatus;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

interface SessionProviderProps {
  source: SessionSource;
  children: ReactNode;
}

export function SessionProvider({ source, children }: SessionProviderProps): JSX.Element {
  const [status, setStatus] = useState<SessionStatus>('loading');

  useEffect(() => {
    let active = true;
    // A change that arrives before restore settles is newer than the restore result,
    // so the restore result must not overwrite it.
    let changedBeforeRestore = false;

    const unsubscribe = source.subscribe((next) => {
      changedBeforeRestore = true;
      if (active) {
        setStatus(next);
      }
    });

    const restore = async (): Promise<void> => {
      let next: ResolvedSessionStatus = 'signed-out';
      try {
        next = await source.restore();
      } catch (error) {
        console.error('Failed to restore session:', error);
      }
      if (active && !changedBeforeRestore) {
        setStatus(next);
      }
    };

    void restore();

    return () => {
      active = false;
      unsubscribe();
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
