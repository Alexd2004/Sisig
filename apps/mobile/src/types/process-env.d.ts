// The app does not load @types/node, so declare the one environment lookup it uses.
// Expo replaces `process.env.EXPO_PUBLIC_*` at build time; only public values may use that prefix.
declare const process: {
  env: {
    readonly EXPO_PUBLIC_SUPABASE_URL?: string;
    readonly EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
  };
};
