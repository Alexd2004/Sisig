import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppStateStatus } from 'react-native';
import { attachSessionLifecycle, type AppStateSource } from './session-lifecycle';

function makeClient() {
  return {
    auth: {
      startAutoRefresh: jest.fn(async () => undefined),
      stopAutoRefresh: jest.fn(async () => undefined),
    },
  };
}

function makeAppState(initial: AppStateStatus) {
  let listener: ((status: AppStateStatus) => void) | undefined;
  const remove = jest.fn();
  const source: AppStateSource = {
    currentState: initial,
    addEventListener: jest.fn((_type, next) => {
      listener = next;
      return { remove };
    }),
  };
  return {
    source,
    remove,
    emit: (status: AppStateStatus) => listener?.(status),
  };
}

describe('attachSessionLifecycle', () => {
  it('starts auto-refresh immediately when the app launches in the foreground', () => {
    const client = makeClient();
    attachSessionLifecycle(client as unknown as SupabaseClient, makeAppState('active').source);

    expect(client.auth.startAutoRefresh).toHaveBeenCalledTimes(1);
    expect(client.auth.stopAutoRefresh).not.toHaveBeenCalled();
  });

  it('does not start auto-refresh when the app launches in the background', () => {
    const client = makeClient();
    attachSessionLifecycle(client as unknown as SupabaseClient, makeAppState('background').source);

    expect(client.auth.startAutoRefresh).not.toHaveBeenCalled();
    expect(client.auth.stopAutoRefresh).toHaveBeenCalledTimes(1);
  });

  it('pauses refresh in the background and resumes it on foreground', () => {
    const client = makeClient();
    const app = makeAppState('active');
    attachSessionLifecycle(client as unknown as SupabaseClient, app.source);

    app.emit('background');
    expect(client.auth.stopAutoRefresh).toHaveBeenCalledTimes(1);

    app.emit('inactive');
    expect(client.auth.stopAutoRefresh).toHaveBeenCalledTimes(2);

    app.emit('active');
    expect(client.auth.startAutoRefresh).toHaveBeenCalledTimes(2);
  });

  it('removes the AppState listener and stops refresh on cleanup', () => {
    const client = makeClient();
    const app = makeAppState('active');
    const detach = attachSessionLifecycle(client as unknown as SupabaseClient, app.source);

    detach();

    expect(app.remove).toHaveBeenCalledTimes(1);
    expect(client.auth.stopAutoRefresh).toHaveBeenCalledTimes(1);
  });
});
