import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './auth/AuthContext.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import Home from './Home.jsx';
import { ThemeProvider } from './theme/ThemeContext.jsx';
import SeoProvider from './seo/SeoProvider.jsx';
import SkipLink from './components/SkipLink.jsx';

const AuthPage = lazy(() => import('./auth/AuthPage.jsx'));
const PasswordRecoveryPage = lazy(() => import('./auth/PasswordRecoveryPage.jsx'));
const Dashboard = lazy(() => import('./dashboard/Dashboard.jsx'));
const PublicPortfolioPage = lazy(() => import('./portfolio/PublicPortfolioPage.jsx'));
const PublicPortfolioAlias = lazy(() =>
  import('./portfolio/PublicPortfolioPage.jsx').then((module) => ({
    default: module.PublicPortfolioAlias,
  })),
);

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <SeoProvider>
          <AuthProvider>
            <SkipLink />
            <Suspense
              fallback={
                <main id="main-content" tabIndex={-1} className="p-12 focus:outline-none">
                  <p role="status" className="text-center text-sm text-muted">
                    Opening your workspace…
                  </p>
                </main>
              }
            >
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/register" element={<AuthPage key="register" mode="register" />} />
                <Route path="/login" element={<AuthPage key="login" mode="login" />} />
                <Route path="/forgot-password" element={<PasswordRecoveryPage mode="request" />} />
                <Route path="/reset-password" element={<PasswordRecoveryPage mode="reset" />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                </Route>
                <Route path="/user/:username" element={<PublicPortfolioAlias />} />
                <Route path="/:username" element={<PublicPortfolioPage />} />
                <Route
                  path="*"
                  element={
                    <main
                      id="main-content"
                      tabIndex={-1}
                      className="p-12 text-center focus:outline-none"
                    >
                      <h1 className="font-display text-3xl font-semibold">Page not found</h1>
                      <Link to="/" className="mt-6 inline-block underline">
                        Return home
                      </Link>
                    </main>
                  }
                />
              </Routes>
            </Suspense>
          </AuthProvider>
        </SeoProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
