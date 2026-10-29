import { AppState } from 'react-native';
import { createQueryClient, createSupabaseClient } from '@sisig/api';
import { attachSessionLifecycle } from './session-lifecycle';
import { nativeSessionStorage } from './session-storage';

// Inlined at build time. Only public values belong here (see CONTRIBUTING.md, Data Layer).
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set. See CONTRIBUTING.md.'
  );
}

export const supabase = createSupabaseClient(nativeSessionStorage, {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
});

export const queryClient = createQueryClient();

attachSessionLifecycle(supabase, AppState);
