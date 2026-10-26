import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Brand from '../components/Brand.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import ProfileEditor from './ProfileEditor.jsx';
import ProjectsEditor from './ProjectsEditor.jsx';
import SkillsEditor from './SkillsEditor.jsx';
import PortfolioPreview from './PortfolioPreview.jsx';
import TemplateSelector from './TemplateSelector.jsx';
import LivePortfolioPreview from './LivePortfolioPreview.jsx';
import DomainSettings from './DomainSettings.jsx';
import PlanSelector from './PlanSelector.jsx';
import DashboardHome from './DashboardHome.jsx';
import DashboardSidebar, { DashboardIcon, EDITOR_SECTIONS } from './DashboardSidebar.jsx';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [editorBusy, setEditorBusy] = useState(false);
  const [pendingSection, setPendingSection] = useState(null);
  const [previewDraft, setPreviewDraft] = useState(null);
  const [mobileView, setMobileView] = useState('editor');
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const sectionPromptRef = useRef(null);
  const logoutPromptRef = useRef(null);
  useEffect(() => {
    if (pendingSection) sectionPromptRef.current?.focus();
  }, [pendingSection]);
  useEffect(() => {
    if (confirmLogout) logoutPromptRef.current?.focus();
  }, [confirmLogout]);
  const profilePreview = useCallback((patch) => setPreviewDraft({ section: 'profile', patch }), []);
  const projectsPreview = useCallback(
    (patch) => setPreviewDraft({ section: 'projects', patch }),
    [],
  );
  const skillsPreview = useCallback((patch) => setPreviewDraft({ section: 'skills', patch }), []);
  const templatePreview = useCallback(
    (patch) => setPreviewDraft({ section: 'templates', patch }),
    [],
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get('section');
  const section = [
    'overview',
    'profile',
    'projects',
    'skills',
    'templates',
    'domains',
    'plans',
    'preview',
    'split-preview',
  ].includes(requestedSection)
    ? requestedSection
    : 'overview';
  const changeSection = (target) => {
    setDirty(false);
    setPendingSection(null);
    setPreviewDraft(null);
    setMobileView('editor');
    setMenuOpen(false);
    setSearchParams(target === 'overview' ? {} : { section: target }, { replace: true });
  };
  const navigate = useNavigate();
  const isPreview = section === 'preview' || section === 'split-preview';
  const isOverview = section === 'overview';
  const isSettings = section === 'domains' || section === 'plans' || isOverview;
  const livePreviewEnabled = showLivePreview && !isPreview && !isSettings;
  const sectionDetails = EDITOR_SECTIONS.find(
    (item) => item.id === (isPreview ? 'preview' : section),
  ) || {
    label: 'Plans',
    description: 'Choose Free or Pro for this project demonstration. No payment required.',
  };
  const requestSection = (target) => {
    if (menuOpen) {
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }
    if (target !== section && !(target === 'preview' && isPreview))
      dirty ? setPendingSection(target) : changeSection(target);
  };

  const signOut = async () => {
    setBusy(true);
    setError('');
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-dvh"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) {
          setMenuOpen(false);
          menuButtonRef.current?.focus();
        }
      }}
    >
      <header className="sticky top-0 z-30 border-b border-line-soft bg-panel">
        <div className="mx-auto flex min-h-20 max-w-[1680px] flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <Brand />
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <a
              href={`/${user.username}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open public portfolio (opens in a new tab)"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line px-3 text-xs font-medium text-muted hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
            >
              <span className="hidden sm:inline">Open portfolio</span>
              <DashboardIcon name="arrow" className="size-4" />
            </a>
            <button
              type="button"
              disabled={busy || editorBusy}
              aria-current={section === 'plans' ? 'page' : undefined}
              onClick={() => requestSection('plans')}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-action px-4 text-xs font-semibold text-action-ink hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus disabled:opacity-50"
            >
              <DashboardIcon name="star" className="size-4" />
              {user.tier === 'pro' ? 'Manage plan' : 'Upgrade to Pro'}
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1680px] lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <DashboardSidebar
          user={user}
          section={section}
          disabled={busy || editorBusy}
          busy={busy}
          menuOpen={menuOpen}
          menuButtonRef={menuButtonRef}
          onMenuToggle={() => setMenuOpen((value) => !value)}
          onSectionChange={requestSection}
          onSignOut={() => {
            setMenuOpen(false);
            dirty ? setConfirmLogout(true) : signOut();
          }}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 px-5 pt-8 pb-12 focus:outline-none sm:px-8 lg:px-10 lg:pt-10"
        >
          {error && (
            <p role="alert" className="mb-6 rounded-lg bg-danger-bg p-4 text-sm text-danger">
              {error}
            </p>
          )}
          {confirmLogout && (
            <div
              ref={logoutPromptRef}
              tabIndex={-1}
              role="region"
              aria-labelledby="logout-title"
              className="mb-6 rounded-lg border border-line bg-soft p-4 text-sm focus:outline-2 focus:outline-focus"
            >
              <p id="logout-title">Sign out and discard your unsaved changes?</p>
              <div className="mt-3 flex gap-4">
                <button
                  onClick={signOut}
                  disabled={busy || editorBusy}
                  className="cursor-pointer font-semibold underline"
                >
                  Discard and sign out
                </button>
                <button
                  onClick={() => setConfirmLogout(false)}
                  className="cursor-pointer underline"
                >
                  Keep editing
                </button>
              </div>
            </div>
          )}
          {!isOverview && (
            <>
              <p className="text-[10px] font-bold tracking-[2px] text-quiet">PORTFOLIO WORKSPACE</p>
              <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                {sectionDetails.label}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
                {sectionDetails.description}
              </p>
            </>
          )}
          {pendingSection && (
            <div
              ref={sectionPromptRef}
              tabIndex={-1}
              role="region"
              aria-labelledby="section-change-title"
              className="mt-5 max-w-2xl rounded-lg border border-line bg-soft p-4 text-sm focus:outline-2 focus:outline-focus"
            >
              <p id="section-change-title">Discard unsaved changes and switch sections?</p>
              <div className="mt-3 flex gap-4">
                <button
                  className="cursor-pointer font-semibold underline"
                  onClick={() => changeSection(pendingSection)}
                >
                  Discard and switch
                </button>
                <button
                  className="cursor-pointer underline"
                  onClick={() => setPendingSection(null)}
                >
                  Keep editing
                </button>
              </div>
            </div>
          )}
          {!isPreview && !isSettings && (
            <div className="mt-5">
              <button
                type="button"
                aria-expanded={showLivePreview}
                aria-controls="optional-live-preview"
                onClick={() => {
                  setShowLivePreview((value) => !value);
                  setMobileView('editor');
                }}
                className="min-h-11 cursor-pointer rounded-lg border border-line px-4 py-2.5 text-xs font-medium text-muted hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
              >
                {showLivePreview ? 'Hide live preview' : 'Show live preview'}
              </button>
            </div>
          )}
          {livePreviewEnabled && (
            <div
              role="group"
              aria-label="Workspace view"
              className="mt-5 inline-flex rounded-xl border border-line bg-panel p-1 lg:hidden"
            >
              {[
                ['editor', 'Editor'],
                ['preview', 'Live preview'],
              ].map(([view, label]) => (
                <button
                  key={view}
                  type="button"
                  aria-pressed={mobileView === view}
                  onClick={() => setMobileView(view)}
                  className={`min-h-11 cursor-pointer rounded-lg px-5 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${mobileView === view ? 'bg-action text-action-ink' : 'text-muted hover:bg-soft'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div
            className={
              livePreviewEnabled
                ? 'grid min-w-0 items-start gap-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]'
                : 'min-w-0'
            }
          >
            <div
              className={`@container/editor min-w-0 ${isOverview || isPreview || section === 'templates' || livePreviewEnabled ? '' : 'max-w-3xl'} ${livePreviewEnabled && mobileView === 'preview' ? 'hidden lg:block' : ''}`}
            >
              {isOverview ? (
                <DashboardHome onOpen={requestSection} />
              ) : section === 'plans' ? (
                <PlanSelector onDirtyChange={setDirty} onBusyChange={setEditorBusy} />
              ) : section === 'domains' ? (
                <DomainSettings onDirtyChange={setDirty} onBusyChange={setEditorBusy} />
              ) : section === 'templates' ? (
                <TemplateSelector
                  onDirtyChange={setDirty}
                  onBusyChange={setEditorBusy}
                  onPreviewChange={templatePreview}
                />
              ) : isPreview ? (
                <PortfolioPreview
                  key={`${section}-${user.tier}`}
                  templateId={section === 'split-preview' ? 'split-screen' : undefined}
                />
              ) : section === 'skills' ? (
                <SkillsEditor
                  onDirtyChange={setDirty}
                  onBusyChange={setEditorBusy}
                  onPreviewChange={skillsPreview}
                />
              ) : section === 'projects' ? (
                <ProjectsEditor
                  onDirtyChange={setDirty}
                  onBusyChange={setEditorBusy}
                  onPreviewChange={projectsPreview}
                />
              ) : (
                <ProfileEditor
                  onDirtyChange={setDirty}
                  onBusyChange={setEditorBusy}
                  onPreviewChange={profilePreview}
                />
              )}
            </div>
            {!isPreview && !isSettings && (
              <div
                id="optional-live-preview"
                className={`mt-8 min-w-0 ${!showLivePreview ? 'hidden' : mobileView === 'editor' ? 'hidden lg:block' : ''}`}
              >
                {showLivePreview && (
                  <LivePortfolioPreview
                    key={`${section}-${user.tier}`}
                    patch={previewDraft?.section === section ? previewDraft.patch : null}
                    dirty={dirty}
                  />
                )}
              </div>
            )}
          </div>
          {!isOverview && (
            <p className="mt-5 max-w-2xl text-xs leading-6 text-quiet">
              Your saved profile, projects, skills and layout appear on your public portfolio. Draft
              edits stay in this workspace until you save.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
