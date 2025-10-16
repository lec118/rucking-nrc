import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import AuthProvider, { useAuth } from '../AuthContext.jsx';

const mockLogin = vi.fn();
const mockRefresh = vi.fn();
const mockLogout = vi.fn();
const mockCsrf = vi.fn();

vi.mock('../../services/auth', () => ({
  authAPI: {
    login: (...args: unknown[]) => mockLogin(...args),
    refreshToken: (...args: unknown[]) => mockRefresh(...args),
    logout: (...args: unknown[]) => mockLogout(...args),
    csrfToken: (...args: unknown[]) => mockCsrf(...args)
  }
}));

function AuthHarness() {
  const { accessToken, user, csrfToken, login, silentRefresh } = useAuth();

  return (
    <div>
      <button type="button" onClick={() => login({ email: 'user@example.com', password: 'secret' })}>
        login
      </button>
      <button type="button" onClick={() => silentRefresh()}>
        refresh
      </button>
      <span data-testid="token">{accessToken ?? ''}</span>
      <span data-testid="user">{user?.email ?? ''}</span>
      <span data-testid="csrf">{csrfToken ?? ''}</span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockLogin.mockReset();
    mockRefresh.mockReset();
    mockLogout.mockReset();
    mockCsrf.mockReset();

    mockCsrf.mockResolvedValue({ csrfToken: 'csrf-value' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores tokens on login and schedules silent refresh', async () => {
    mockLogin.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 120,
      user: { id: 1, email: 'user@example.com' }
    });
    mockRefresh.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'refresh-token',
      expiresIn: 120,
      user: { id: 1, email: 'user@example.com' }
    });

    const user = userEvent.setup({ advanceTimers: vi.runOnlyPendingTimers });

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'login' }));
    });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
      expect(screen.getByTestId('token').textContent).toBe('access-token');
      expect(screen.getByTestId('user').textContent).toBe('user@example.com');
      expect(mockCsrf).toHaveBeenCalled();
      expect(screen.getByTestId('csrf').textContent).toBe('csrf-value');
    });

    await act(async () => {
      vi.advanceTimersByTime(60 * 1000);
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledWith('refresh-token');
    });
  });

  it('resets session when silent refresh fails', async () => {
    mockLogin.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 60,
      user: { id: 1, email: 'user@example.com' }
    });
    mockRefresh.mockRejectedValue(new Error('token expired'));

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await act(async () => {
      await screen.getByRole('button', { name: 'login' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('token').textContent).toBe('access-token');
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'refresh' }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('token').textContent).toBe('');
      expect(screen.getByTestId('user').textContent).toBe('');
    });
  });
});
