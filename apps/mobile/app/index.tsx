import { Redirect } from 'expo-router';

/** Cold start lands on Home. Home is browsable as a guest, so no session check is needed here. */
export default function IndexRedirect(): JSX.Element {
  return <Redirect href="/home" />;
}
