import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '../../src/components/PlaceholderScreen';

/** Modal route for a menu item's detail. The real screen is built in a later ticket. */
export default function ItemDetailScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <PlaceholderScreen
      title="Item detail"
      note={`Placeholder for menu item ${id}. The real item screen is built in a later ticket.`}
    />
  );
}
