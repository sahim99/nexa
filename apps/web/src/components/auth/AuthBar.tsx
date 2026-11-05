'use client';

import React, { useState } from 'react';
import { apiClient, getAccessToken } from '../../lib/api-client';

export function AuthBar() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [tokenPresent, setTokenPresent] = useState(false);
  const [who, setWho] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    const token = getAccessToken();
    setTokenPresent(!!token);
    if (!token) return;
    apiClient
      .me()
      .then((user) => setWho(user.username))
      .catch(() => {
        setWho(null);
        setTokenPresent(false);
      });
  }, []);

  const onLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiClient.login(username, password);
      const user = await apiClient.me();
      setWho(user.username);
      setTokenPresent(true);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    setBusy(true);
    try {
      await apiClient.logout();
    } finally {
      setTokenPresent(false);
      setWho(null);
      setBusy(false);
      window.location.reload();
    }
  };

  return (
    <div className="border-b border-slate-800 bg-[#060c18] px-4 py-3 text-sm text-slate-200">
      {tokenPresent ? (
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <p>
            Signed in{who ? ` as ${who}` : ''}. Requests to the API include a bearer token.
          </p>
          <button
            type="button"
            onClick={onLogout}
            disabled={busy}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
          >
            Log out
          </button>
        </div>
      ) : (
        <form onSubmit={onLogin} className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">API login</span>
          <input
            aria-label="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
          />
          <input
            aria-label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="NEXA_ADMIN_PASS"
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-cyan-500 px-3 py-1 text-xs font-semibold text-slate-950 disabled:opacity-50"
          >
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
          {error && <span className="text-xs text-rose-400">{error}</span>}
        </form>
      )}
    </div>
  );
}
