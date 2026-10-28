import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface TabBarIconProps {
  name: IconName;
  color: string;
  size?: number;
}

export function TabBarIcon({ name, color, size = 24 }: TabBarIconProps): JSX.Element {
  return <MaterialCommunityIcons size={size} name={name} color={color} />;
}
