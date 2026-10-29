import { dehydrate, QueryClient } from '@tanstack/react-query';
import { keys } from '@sisig/api';
import { persistOptions } from './query-persistence';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('persistOptions.dehydrateOptions', () => {
  it('dehydrates only allowlisted queries: menu and the rewards catalogue', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(keys.menu.categories(), ['burger']);
    queryClient.setQueryData(keys.menu.list({ category: 'burger' }), []);
    queryClient.setQueryData(keys.loyalty.rewards(), [{ id: 'reward-1' }]);
    queryClient.setQueryData(keys.loyalty.points(), { available_points: 120 });
    queryClient.setQueryData(keys.loyalty.transactions(), []);
    queryClient.setQueryData(keys.profile.me(), { first_name: 'Ana' });
    queryClient.setQueryData(keys.orders.list(), [{ id: 'order-1' }]);

    const persisted = dehydrate(queryClient, persistOptions.dehydrateOptions).queries.map(
      (query) => query.queryKey
    );

    expect(persisted).toHaveLength(3);
    expect(persisted).toEqual(
      expect.arrayContaining([
        keys.menu.categories(),
        keys.menu.list({ category: 'burger' }),
        keys.loyalty.rewards(),
      ])
    );
  });

  it('never dehydrates mutations', () => {
    expect(persistOptions.dehydrateOptions.shouldDehydrateMutation()).toBe(false);
  });
});
