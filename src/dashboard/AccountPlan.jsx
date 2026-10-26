import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../lib/api.js';
import { isProTier } from '../../shared/plans.js';
import ProBadge from '../components/ProBadge.jsx';

export default function AccountPlan() {
  const { user, updateTier, sessionExpired } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [refreshed, setRefreshed] = useState(false);
  const refresh = async () => {
    setBusy(true);
    setError('');
    setRefreshed(false);
    try {
      const { plan } = await api('/plan');
      if (!['free', 'pro'].includes(plan?.id)) throw new Error('Could not read your current plan.');
      updateTier(plan.id);
      setRefreshed(true);
    } catch (failure) {
      if (failure.status === 401) sessionExpired();
      else setError(failure.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
      {isProTier(user.tier) ? (
        <ProBadge />
      ) : (
        <span className="rounded-full bg-soft px-3 py-1 text-xs text-accent">Free</span>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={refresh}
        className="min-h-10 cursor-pointer rounded-lg px-2 py-2 text-xs font-medium text-muted hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60"
      >
        {busy ? 'Refreshing…' : 'Refresh plan'}
      </button>
      {error && (
        <p role="alert" className="w-full text-xs text-danger">
          {error}
        </p>
      )}
      {refreshed && (
        <p role="status" className="sr-only">
          Account plan refreshed.
        </p>
      )}
    </div>
  );
}
