'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const SSO_ERRORS: Record<string, string> = {
  sso_denied: 'Microsoft sign-in was cancelled or denied.',
  sso_missing_params: 'Invalid SSO response. Please try again.',
  sso_state_mismatch: 'Security verification failed. Please try again.',
  sso_no_email: 'Could not retrieve your email from Microsoft.',
  sso_user_not_found: 'Your Microsoft account is not registered in this platform. Contact your administrator.',
  sso_account_inactive: 'Your account is not active. Contact your administrator.',
  sso_error: 'An error occurred during sign-in. Please try again.',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [ssoErrorDismissed, setSsoErrorDismissed] = useState(false);

  // Check for SSO error from callback redirect
  const ssoError = searchParams.get('error');
  const rawSsoErrorMessage = ssoError ? SSO_ERRORS[ssoError] || 'An unexpected error occurred.' : '';
  const ssoErrorMessage = ssoErrorDismissed ? '' : rawSsoErrorMessage;

  // Validate redirect path: must be relative, start with '/', not start with '//'
  const rawRedirect = searchParams.get('redirect') || '/';
  const redirectPath = /^\/(?!\/)/.test(rawRedirect) ? rawRedirect : '/';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || 'Invalid email or password.');
        return;
      }

      if (json.data?.mustChangePassword) {
        router.push('/change-password');
      } else {
        router.push(redirectPath);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSSOLogin() {
    const ssoUrl = `/api/auth/sso?redirect=${encodeURIComponent(redirectPath)}`;
    window.location.href = ssoUrl;
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
      {/* Gold accent bar */}
      <div className="h-1" style={{ background: 'linear-gradient(to right, #c8a04a, #d4b96a, #c8a04a)' }} />

      <div className="px-8 py-10">
        {/* Logo - mobile only */}
        <div className="flex flex-col items-center mb-8 lg:hidden">
          <img src="/goldbell-logo.svg" alt="Goldbell" className="w-14 h-14 rounded-xl mb-4" />
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Sign in</h2>
          <p className="text-[15px] font-medium text-neutral-400 mt-1.5">Access the fleet management platform</p>
        </div>

        {/* SSO or password error */}
        {(ssoErrorMessage || error) && (
          <div className="mb-5 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[14px] font-medium text-red-700 flex items-start gap-2.5">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{ssoErrorMessage || error}</span>
          </div>
        )}

        {/* SSO Button */}
        <button
          onClick={handleSSOLogin}
          className="w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-bold text-white bg-charcoal hover:bg-charcoal-light active:bg-charcoal-dark shadow-lg shadow-black/10 transition-all duration-200 uppercase tracking-wider"
        >
          {/* Microsoft logo */}
          <svg className="w-4 h-4" viewBox="0 0 21 21" fill="none">
            <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
            <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
          </svg>
          Sign in with Microsoft
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-neutral-100" />
          <button
            onClick={() => {
            setShowPasswordLogin(!showPasswordLogin);
            setSsoErrorDismissed(true);
          }}
            className="text-[12px] font-medium text-neutral-400 hover:text-neutral-600 transition-colors uppercase tracking-wider"
          >
            {showPasswordLogin ? 'Hide' : 'or use password'}
          </button>
          <div className="flex-1 h-px bg-neutral-100" />
        </div>

        {/* Password login (collapsible) */}
        {showPasswordLogin && (
          <form onSubmit={handleSubmit} noValidate className="space-y-5 animate-fade-in">
            <div>
              <label htmlFor="email" className="block text-[13px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setSsoErrorDismissed(true); }}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/80 px-4 py-3 text-[15px] font-medium text-neutral-900 placeholder-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#c8a04a]/20 focus:border-[#c8a04a]/40 focus:bg-white transition-all duration-200"
                placeholder="you@goldbell.com.sg"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[13px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/80 px-4 py-3 text-[15px] font-medium text-neutral-900 placeholder-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#c8a04a]/20 focus:border-[#c8a04a]/40 focus:bg-white transition-all duration-200"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[15px] font-bold text-charcoal bg-neutral-100 hover:bg-neutral-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? 'Signing in...' : 'Sign in with password'}
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-neutral-100 text-center">
          <p className="text-[12px] font-medium text-neutral-400 tracking-wide">Goldbell Car Rental &middot; Fleet Management System</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 px-8 py-10 flex items-center justify-center min-h-48">
        <div className="animate-spin w-6 h-6 border-2 border-charcoal border-t-transparent rounded-full" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
