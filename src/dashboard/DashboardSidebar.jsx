import AccountPlan from './AccountPlan.jsx';

export const EDITOR_SECTIONS = [
  { id: 'overview', label: 'Dashboard', description: 'Your portfolio launchpad.' },
  {
    id: 'profile',
    label: 'Profile',
    description: 'Introduce yourself and connect your professional profiles.',
  },
  {
    id: 'projects',
    label: 'Projects',
    description: 'Show the work you are proud of and the ideas behind it.',
  },
  {
    id: 'skills',
    label: 'Skills',
    description: 'Organize the technologies and tools you work with.',
  },
  {
    id: 'templates',
    label: 'Templates',
    description: 'Choose the layout that best represents your work.',
  },
  {
    id: 'preview',
    label: 'Portfolio preview',
    description: 'See how your saved portfolio looks before sharing it.',
  },
  {
    id: 'domains',
    label: 'Custom domain',
    description: 'Give your portfolio a personal address with the Pro redirect simulation.',
  },
];

const iconPaths = {
  overview: ['m3 10 9-7 9 7', 'M5 9v12h14V9', 'M9 21v-8h6v8'],
  check: ['m5 12 4 4L19 6'],
  'arrow-right': ['M4 12h16', 'm14 6 6 6-6 6'],
  refresh: ['M20 7v5h-5', 'M4 17v-5h5', 'M6 7a7 7 0 0 1 12-1l2 3', 'M18 17a7 7 0 0 1-12 1l-2-3'],
  profile: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z'],
  projects: [
    'M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z',
    'M3 11h18',
  ],
  skills: ['m8 6-6 6 6 6', 'm16 6 6 6-6 6', 'm14 3-4 18'],
  templates: ['M3 3h7v7H3Z', 'M14 3h7v7h-7Z', 'M3 14h7v7H3Z', 'M14 14h7v7h-7Z'],
  preview: [
    'M4 3h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z',
    'M8 21h8',
    'M12 17v4',
    'M3 7h18',
  ],
  domains: [
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    'M3 12h18',
    'M12 3a17 17 0 0 1 0 18 17 17 0 0 1 0-18Z',
  ],
  arrow: ['M7 17 17 7', 'M7 7h10v10'],
  star: ['m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  close: ['m6 6 12 12', 'M6 18 18 6'],
  logout: ['M9 5H5v14h4', 'M9 12h12', 'm17 8 4 4-4 4'],
};

export function DashboardIcon({ name, className = 'size-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {(iconPaths[name] || iconPaths.profile).map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

export default function DashboardSidebar({
  user,
  section,
  disabled,
  busy,
  menuOpen,
  menuButtonRef,
  onMenuToggle,
  onSectionChange,
  onSignOut,
}) {
  const activeLabel =
    EDITOR_SECTIONS.find((item) => item.id === (section === 'split-preview' ? 'preview' : section))
      ?.label || 'Plans';
  return (
    <aside
      aria-label="Dashboard sidebar"
      className="border-b border-line-soft bg-panel lg:sticky lg:top-[81px] lg:h-[calc(100dvh-81px)] lg:self-start lg:overflow-y-auto lg:border-r lg:border-b-0"
    >
      <button
        ref={menuButtonRef}
        type="button"
        aria-expanded={menuOpen}
        aria-controls="dashboard-sidebar-content"
        onClick={onMenuToggle}
        className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-5 text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-focus lg:hidden"
      >
        <DashboardIcon name={menuOpen ? 'close' : 'menu'} />
        <span>Workspace menu</span>
        <span className="ml-auto text-xs text-muted">{activeLabel}</span>
      </button>
      <div
        id="dashboard-sidebar-content"
        className={`${menuOpen ? 'flex' : 'hidden'} flex-col lg:flex lg:min-h-full`}
      >
        <div className="px-4 pt-6 pb-5 lg:pt-8">
          <p className="px-3 text-[10px] font-bold tracking-[2px] text-quiet">YOUR WORKSPACE</p>
          <nav aria-label="Portfolio editor sections" className="mt-5 flex flex-col gap-1.5">
            {EDITOR_SECTIONS.map(({ id, label }) => {
              const active = section === id || (id === 'preview' && section === 'split-preview');
              return (
                <button
                  key={id}
                  type="button"
                  disabled={disabled}
                  aria-label={label}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => onSectionChange(id)}
                  className={`flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50 ${active ? 'bg-soft text-accent' : 'text-muted hover:bg-soft hover:text-ink'}`}
                >
                  <DashboardIcon name={id} />
                  <span>{label}</span>
                  {id === 'domains' && (
                    <span
                      className="ml-auto rounded border border-line-accent px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-accent"
                      aria-label="Pro feature"
                    >
                      PRO
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
        <section
          aria-labelledby="account-title"
          className="mx-4 mt-auto border-t border-line-soft px-1 pt-5 pb-6"
        >
          <h2 id="account-title" className="text-[10px] font-bold tracking-[1.5px] text-quiet">
            ACCOUNT DETAILS
          </h2>
          <p className="mt-4 truncate text-sm font-semibold" title={user.name}>
            {user.name}
          </p>
          <dl className="mt-1 text-xs leading-6 text-muted">
            <div>
              <dt className="sr-only">Username</dt>
              <dd className="break-all">@{user.username}</dd>
            </div>
            <div>
              <dt className="sr-only">Private account email</dt>
              <dd className="break-all">{user.email}</dd>
            </div>
          </dl>
          <div className="mt-4 flex justify-start">
            <AccountPlan />
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={onSignOut}
            className="mt-4 flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-2 text-xs font-medium text-muted hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
          >
            <DashboardIcon name="logout" className="size-4" />
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </section>
      </div>
    </aside>
  );
}
