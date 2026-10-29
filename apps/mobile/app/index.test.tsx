import { render } from '@testing-library/react-native';
import IndexRedirect from './index';

const mockRedirect = jest.fn((_props: { href: string }) => null);

jest.mock('expo-router', () => ({
  Redirect: (props: { href: string }) => mockRedirect(props),
}));

describe('IndexRedirect', () => {
  it('sends cold start to the Home tab', () => {
    render(<IndexRedirect />);
    expect(mockRedirect).toHaveBeenCalled();
    expect(mockRedirect.mock.calls[0][0]).toEqual(expect.objectContaining({ href: '/home' }));
  });
});
