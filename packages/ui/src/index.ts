// Typography
export { Text } from './Text';
export type { TextProps, TextTone, TextVariant } from './Text';
export { Heading } from './components/Heading';
export type { HeadingLevel, HeadingProps } from './components/Heading';

// Layout
export { Screen } from './components/Screen';
export type { ScreenProps } from './components/Screen';
export { Card } from './components/Card';
export type { CardProps, CardVariant } from './components/Card';
export { ListItem } from './components/ListItem';
export type { ListItemProps } from './components/ListItem';
export { Divider } from './components/Divider';
export type { DividerProps } from './components/Divider';
export { SectionHeader } from './components/SectionHeader';
export type { SectionHeaderProps } from './components/SectionHeader';

// Actions
export { Button } from './Button';
export type { ButtonProps, ButtonVariant } from './Button';
export { IconButton } from './components/IconButton';
export type { IconButtonProps, IconButtonVariant } from './components/IconButton';
export type { PressHandler } from './usePressGuard';

// Badges, points and price
export { Badge, Chip } from './components/Badge';
export type { BadgeProps, BadgeTone, ChipProps } from './components/Badge';
export { Points } from './components/Points';
export type { PointsProps } from './components/Points';
export type { AmountSize } from './components/amount';
export { Price } from './components/Price';
export type { PriceProps } from './components/Price';
export { formatPoints, formatPointsSpoken, formatPointsValue, formatPrice } from './format/format';

// Forms
export { TextInput } from './TextInput';
export { Input } from './forms/Input';
export type { InputProps } from './forms/Input';
export { INPUT_PRESETS } from './forms/inputPresets';
export type { InputPreset } from './forms/inputPresets';
export { TextArea } from './forms/TextArea';
export type { TextAreaProps } from './forms/TextArea';
export { FormField } from './forms/FormField';
export type { FormFieldControlProps, FormFieldProps } from './forms/FormField';
export { Switch } from './forms/Switch';
export type { SwitchProps } from './forms/Switch';
export { Checkbox } from './forms/Checkbox';
export type { CheckboxProps } from './forms/Checkbox';

// Accessibility and haptics
export { hitSlopFor, MIN_TOUCH_TARGET } from './a11y';
export { HapticsProvider, useHaptics } from './haptics/HapticsProvider';
export type { Haptics } from './haptics/HapticsProvider';

// Theme
export { useAppColors, useThemedStyles } from './theme/hooks';
export type { AppColors } from './theme/hooks';
export { brandFonts, darkTheme, FONT_SCALE_CAP, lightTheme } from './theme/brand';
export { tamaguiConfig } from './tamagui.config';
export { TamaguiProvider, Theme } from '@tamagui/core';
