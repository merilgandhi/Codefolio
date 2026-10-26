import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export default function ProtectedRoute() {
  const { user, loading, error, retry } = useAuth();
  if (loading)
    return (
      <main id="main-content" tabIndex={-1} className="p-12 focus:outline-none">
        <p role="status" className="text-center text-sm text-muted">
          Checking your session…
        </p>
      </main>
    );
  if (error)
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-md p-10 text-center focus:outline-none"
      >
        <p role="alert">{error}</p>
        <button
          onClick={retry}
          className="mt-5 min-h-11 cursor-pointer rounded-lg bg-action px-5 py-3 text-action-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          Try again
        </button>
      </main>
    );
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ protectedVisit: true }} />;
}
