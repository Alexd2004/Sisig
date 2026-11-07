import type { TextInputProps } from 'react-native';

/**
 * Field presets that set the keyboard, autofill hint and secure entry together
 * so iOS and Android offer the right keyboard and password-manager/SMS-code
 * autofill. Explicit props passed to Input override the preset.
 */
export type InputPreset = 'text' | 'email' | 'password' | 'newPassword' | 'oneTimeCode' | 'phone';

type PresetProps = Pick<
  TextInputProps,
  | 'keyboardType'
  | 'textContentType'
  | 'autoComplete'
  | 'autoCapitalize'
  | 'autoCorrect'
  | 'secureTextEntry'
>;

// autoComplete values are the cross-platform ones (iOS and Android) from the RN TextInput docs.
export const INPUT_PRESETS: Record<InputPreset, PresetProps> = {
  text: {},
  email: {
    keyboardType: 'email-address',
    textContentType: 'emailAddress',
    autoComplete: 'email',
    autoCapitalize: 'none',
    autoCorrect: false,
  },
  password: {
    secureTextEntry: true,
    textContentType: 'password',
    autoComplete: 'current-password',
    autoCapitalize: 'none',
    autoCorrect: false,
  },
  newPassword: {
    secureTextEntry: true,
    textContentType: 'newPassword',
    autoComplete: 'new-password',
    autoCapitalize: 'none',
    autoCorrect: false,
  },
  oneTimeCode: {
    keyboardType: 'number-pad',
    textContentType: 'oneTimeCode',
    autoComplete: 'one-time-code',
    autoCapitalize: 'none',
    autoCorrect: false,
  },
  phone: {
    keyboardType: 'phone-pad',
    textContentType: 'telephoneNumber',
    autoComplete: 'tel',
  },
};
