import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '../components/LoginForm';
import { SignupForm } from '../components/SignupForm';
import { MagicLinkForm } from '../components/MagicLinkForm';
import { PasswordRecoveryForm } from '../components/PasswordRecoveryForm';
import { AuthProvider } from '../providers/AuthProvider';
import { SessionManager } from '../services/SessionManager';

// Harness: wraps forms in a standalone AuthProvider so useAuth() resolves.
function Harness({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider config={{ baseUrl: 'https://api.example.com', appId: 'app-1' }}>
      {children}
    </AuthProvider>
  );
}

describe('Auth form components', () => {
  beforeEach(() => {
    localStorage.clear();
    // Fetch stub — any auth call returns a synthetic success so forms can submit.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: () => 'application/json' },
        json: async () => ({
          accessToken: 'tok',
          refreshToken: 'rt',
          expiresIn: 3600,
          user: { id: '1', email: 'a@b.com' },
        }),
      })
    );
  });

  afterEach(() => {
    SessionManager.resetAllInstances();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  // ─── LoginForm ───
  describe('LoginForm', () => {
    it('renders title, fields and submit button', () => {
      render(
        <Harness>
          <LoginForm />
        </Harness>
      );
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(document.querySelector('input[name="username"]')).toBeInTheDocument();
      expect(document.querySelector('input[name="password"]')).toBeInTheDocument();
    });

    it('submit button is disabled until both fields are filled', () => {
      render(
        <Harness>
          <LoginForm />
        </Harness>
      );
      const submit = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;
      expect(submit.disabled).toBe(true);

      const usernameInput = document.querySelector('input[name="username"]') as HTMLInputElement;
      const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement;

      fireEvent.change(usernameInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'secret' } });
      expect(submit.disabled).toBe(false);
    });

    it('overrides text via copy prop (i18n)', () => {
      render(
        <Harness>
          <LoginForm copy={{ title: 'Iniciar sesión', submitButton: 'Entrar' }} />
        </Harness>
      );
      expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    });

    it('toggles password visibility via show/hide button', () => {
      render(
        <Harness>
          <LoginForm />
        </Harness>
      );
      const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement;
      const toggle = screen.getByRole('button', { name: /show password/i });

      expect(passwordInput.type).toBe('password');
      fireEvent.click(toggle);
      expect(passwordInput.type).toBe('text');
    });

    it('calls onForgotPassword when link is clicked', () => {
      const onForgotPassword = vi.fn();
      render(
        <Harness>
          <LoginForm onForgotPassword={onForgotPassword} />
        </Harness>
      );
      fireEvent.click(screen.getByText(/forgot your password/i));
      expect(onForgotPassword).toHaveBeenCalled();
    });

    it('hides magic link option when showMagicLinkOption=false', () => {
      render(
        <Harness>
          <LoginForm showMagicLinkOption={false} />
        </Harness>
      );
      expect(screen.queryByText(/magic link/i)).not.toBeInTheDocument();
    });
  });

  // ─── SignupForm ───
  describe('SignupForm', () => {
    it('renders with default user signup mode', () => {
      render(
        <Harness>
          <SignupForm />
        </Harness>
      );
      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    });

    it('switches labels when copy prop is provided', () => {
      render(
        <Harness>
          <SignupForm copy={{ title: 'Registrarse', submitButton: 'Crear cuenta' }} />
        </Harness>
      );
      expect(screen.getByRole('heading', { name: 'Registrarse' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeInTheDocument();
    });
  });

  // ─── MagicLinkForm ───
  describe('MagicLinkForm', () => {
    it('renders title and email input', () => {
      render(
        <Harness>
          <MagicLinkForm />
        </Harness>
      );
      expect(screen.getByRole('heading', { name: /sign in with magic link/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
    });

    it('calls onLoginClick when traditional link is clicked', () => {
      const onLoginClick = vi.fn();
      render(
        <Harness>
          <MagicLinkForm onLoginClick={onLoginClick} />
        </Harness>
      );
      fireEvent.click(screen.getByText(/sign in with password/i));
      expect(onLoginClick).toHaveBeenCalled();
    });
  });

  // ─── PasswordRecoveryForm ───
  describe('PasswordRecoveryForm', () => {
    it('renders request mode by default', () => {
      render(
        <Harness>
          <PasswordRecoveryForm />
        </Harness>
      );
      expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    it('renders reset mode when mode="reset"', () => {
      render(
        <Harness>
          <PasswordRecoveryForm mode="reset" />
        </Harness>
      );
      expect(screen.getByRole('heading', { name: /set new password/i })).toBeInTheDocument();
    });

    it('calls onBackToLogin when the back link is clicked', async () => {
      const onBackToLogin = vi.fn();
      render(
        <Harness>
          <PasswordRecoveryForm onBackToLogin={onBackToLogin} />
        </Harness>
      );
      await waitFor(() => {
        expect(screen.getByText(/back to sign in/i)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText(/back to sign in/i));
      expect(onBackToLogin).toHaveBeenCalled();
    });
  });
});
