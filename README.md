# CodeFolio

A portfolio builder for developers using React + Vite, Tailwind, Express and MongoDB. Edit profiles, projects, skills and layouts in the dashboard, optionally open a live draft preview, then save changes to Atlas and your public `/:username` page. Both Bento Developer and Split-Screen Engineer are supported. The illustrated portfolio on the start page is a design concept, not a saved user profile.

Source repository: [merilgandhi/Codefolio](https://github.com/merilgandhi/Codefolio).

## Styling

Run `npm run format` to format source, configuration and documentation with the project's pinned Prettier version. Run `npm run format:check` to check formatting without changing files. The shared configuration uses two-space indentation, single quotes in JavaScript and LF line endings. Generated files, dependencies, lockfiles and environment files are excluded.

Use Tailwind CSS utility classes in JSX for all component styling. Tailwind is integrated through the official `@tailwindcss/vite` plugin. `src/styles.css` contains imports, the class-based dark variant, and shared font/color theme tokens; do not add custom component CSS selectors.

Light and dark modes are available from the header toggle on the homepage, account forms and dashboard. A first visit follows the device preference; a manual choice is saved in browser localStorage and synchronized across tabs on the same origin. Reuse semantic Tailwind colors such as `bg-panel`, `text-muted`, `border-line` and `bg-action` in new components so both themes work automatically. See [theme implementation and checks](docs/THEMES.md).

## Run locally

Use Node.js 22.12 or newer and pnpm. The committed pnpm lockfile pins dependency resolutions.

```sh
pnpm install --frozen-lockfile
```

Copy `.env.example` to `.env`. Leave `MONGODB_URI` empty to start without a database, or supply your own local/Atlas connection string. Never put this connection string in frontend code or commit `.env`.

```sh
pnpm dev
```

`npm run dev` runs the same development script and starts both the frontend and backend. Run it from the project root after installing dependencies and configuring `.env`.

- Frontend: http://127.0.0.1:5174
- API: http://127.0.0.1:4000/api/health
- Register: http://127.0.0.1:5174/register
- Sign in: http://127.0.0.1:5174/login
- Private workspace: http://127.0.0.1:5174/dashboard
- Template selector: http://127.0.0.1:5174/dashboard?section=templates (sign-in required)
- Saved-layout portfolio preview: http://127.0.0.1:5174/dashboard?section=preview (sign-in required)
- Explicit Split-Screen preview: http://127.0.0.1:5174/dashboard?section=split-preview (preview only)
- Public portfolio: `http://127.0.0.1:5174/<username>` (no sign-in required); `/user/<username>` redirects to this canonical URL.
- Vite proxies `/api` and public portfolio documents to Express. If changing the backend port, update the proxy in `vite.config.js` too.
- Without a URI, the API starts with `database: "not_configured"`; persistence is not available.
- With a URI, startup waits for MongoDB and exits with a safe error if the initial connection fails.

## Check and build

```sh
pnpm test
pnpm build
```

`npm run build` also works. Its Node launcher explicitly selects production mode for the frontend build, even when the local `.env` selects development for Express. This prevents shipping React's development runtime.

For production, set `NODE_ENV=production` and an HTTPS `APP_ORIGIN`, build, then run `pnpm start` behind the configured HTTPS reverse proxy. Production cookies require HTTPS. Express serves `dist` and handles frontend refreshes. It binds to `0.0.0.0` in production and `127.0.0.1` in development unless `HOST` is set explicitly. See the [Render production deployment guide](docs/DEPLOYMENT.md) for the selected host configuration, secrets, Atlas networking and acceptance checks.

To verify the configured Atlas database with temporary records, run `pnpm verify:db`. This checks real writes, reads in a separate process, unique indexes, private-field query exclusions and stale-save rejection, then removes only the generated test records. It is separate from the default tests. See [database verification details](docs/DATA-MODEL.md).

Run `pnpm verify:auth` for opt-in authentication integration checks against Atlas with temporary accounts and sessions. See [authentication flow, protections and verification limits](docs/AUTHENTICATION.md). Test fixtures are removed after checks.

Forgot-password recovery is available from the sign-in page. It sends a one-use link that expires after 30 minutes, stores only a token digest, and revokes existing sessions after a successful reset. Configure the production Gmail OAuth sender before relying on account recovery; see [authentication and recovery details](docs/AUTHENTICATION.md).

Run `pnpm verify:profile` for real profile-saving, ownership isolation and stale-edit checks against Atlas using temporary accounts. See [profile editor details](docs/PROFILE-EDITOR.md).

Run `pnpm verify:projects` for real project CRUD, ownership, concurrency, limits and persistence checks against Atlas. See [project editor details](docs/PROJECT-EDITOR.md). These checks remove their temporary fixture accounts and sessions.

Run `pnpm verify:skills` for categorized skill persistence, ownership, validation and concurrency checks against Atlas. See [skills editor details](docs/SKILLS-EDITOR.md). Temporary fixture accounts and sessions are removed afterward.

Run `pnpm verify:preview` for the private portfolio-preview read endpoint, complete saved content, public-data allowlist, owner isolation, expired sessions and exact fixture cleanup against Atlas. See [Bento Developer and verification limits](docs/BENTO-DEVELOPER.md).

Run `pnpm verify:templates` for two-account Atlas checks of template persistence, ownership, legacy compatibility, invalid/stale/racing writes and fresh-process persistence. It removes its temporary accounts and sessions. Run `pnpm verify:rendering` for the Vite-compiled registry, both layouts and default fallback without database access. See [template selection and checks](docs/TEMPLATE-SELECTION.md).

Both layouts display the same saved profile, project and skill fields. [Split-Screen Engineer details and browser checks](docs/SPLIT-SCREEN-ENGINEER.md) explain its sticky profile panel and mobile behavior. New accounts default to Bento Developer. Existing template IDs resolve compatibly; **Save template** persists a canonical choice.

Run `npm run verify:public` with Atlas configured, the current production build and the development server running to check anonymous public routes using two temporary accounts. Those accounts and their sessions are removed afterward. See [public routing and system design](docs/PUBLIC-PORTFOLIOS.md) for the backend lookup, privacy boundaries, HTTP statuses and current limits.

The Launchpad overview is the default dashboard page. Inside the editors, **Show live preview** optionally opens draft rendering beside the form; smaller screens offer an Editor/Live preview switch that keeps drafts intact. Hiding the preview preserves edits. Public data changes only after a successful explicit save. See [live-preview behavior and verification](docs/LIVE-PREVIEW.md).

Public portfolio titles and descriptions use saved profile data through React Helmet's React 19-compatible `react-helmet-async` package. Metadata appears in the initial HTML and updates during client navigation; private and error pages use non-indexable metadata. Run `npm run verify:seo` with Atlas, the current build and the development server ready for two-account checks and exact cleanup. See [SEO compatibility, behavior and verification](docs/SEO.md).

Both portfolio layouts have completed the local responsive, keyboard, contrast and image-loading review. A skip link provides direct keyboard access to main content, and long skill tags fit the mobile editor. See [polish fixes, browser evidence and review helper](docs/RESPONSIVE-ACCESSIBILITY.md).

Both public layouts share a contact form with private server-side recipient lookup, validation, safe failure states and abuse limits. Nodemailer composes the responsive CodeFolio HTML and plain-text email; in production, Gmail's HTTPS API delivers it with the narrow `gmail.send` OAuth scope, so it works from Render Free without SMTP ports. Run `npm run gmail:oauth` to create a local refresh token after configuring Google OAuth, `npm run verify:mail` to verify OAuth without sending, or `npm run preview:email` for a local design preview. Local development can still use Nodemailer SMTP. See [contact setup, privacy and verification](docs/CONTACT-EMAIL.md).

Use **Upgrade to Pro** or **Manage plan** in the dashboard header to choose Free or Pro, then click **Save plan**. This is clearly labelled **Demo mode — no payment required**. The selection persists in MongoDB; Pro enables the public badge and custom-domain simulation, while Free pauses them without deleting portfolio content or the saved domain. The server checks the session owner, allowed plan and edit version. **Refresh plan** and the operator CLI remain available. Run `npm run verify:plans` for two-account Atlas checks, including selection in both directions, feature access and exact cleanup. See [plan selection, provisioning and verification](docs/PRO-ACCESS.md).

After login, `/dashboard` opens the **Launchpad overview**. Four setup steps use saved profile, project, skill and layout data, with a next-step action and public portfolio link. Editors open only when selected. A default layout counts as ready immediately; saved changes update the overview when you return. See [Launchpad behavior and verification](docs/DASHBOARD-HOME.md).

The left sidebar contains Dashboard, Profile, Projects, Skills, Templates, Portfolio preview and Custom domain. On mobile, **Workspace menu** expands/collapses navigation. Account details and Sign out sit below navigation; Plans is accessed through the header. Unsaved-change prompts apply to both navigation areas. See [sidebar behavior and browser checks](docs/DASHBOARD-NAVIGATION.md).

The dashboard's **Custom domain** section lets Pro accounts save/remove a unique hostname and test a working redirect to their public portfolio. This is the PDF's permitted simulation: actual DNS/TLS configuration is outside its scope. Free accounts cannot mutate settings, and downgrades disable redirects. Run `npm run verify:domains` for two-account Atlas checks and cleanup; see [domain settings, API and verification](docs/CUSTOM-DOMAINS.md).

## Structure

```text
src/                  React application and styles
scripts/              Cross-platform frontend build launcher
server/app.js         Express app and API error handling
server/config.js      Environment validation
server/db.js          MongoDB connection and state
server/index.js       Startup and shutdown
server/models/        User and embedded portfolio schemas
server/validation/    Username, email and link validation
server/serializers/   Explicit public portfolio allowlist
server/tests/         API integration checks
shared/               Template IDs, categories and reserved usernames
```

Dashboard components and reusable portfolio presentation components live separately in `src/dashboard/` and `src/portfolio/`. API routes live under `server/routes/`. See [docs/DATA-MODEL.md](docs/DATA-MODEL.md) for implemented fields, privacy boundaries and Atlas verification status.

## Milestones

The complete PDF requirement matrix, acceptance checks, scope decisions and current verification limits are tracked in [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md). Use that tracker when implementing and reviewing every milestone.

- [x] Frontend/backend foundation and database configuration
- [x] Account and portfolio data models with real Atlas verification
- [x] Registration, login, logout and protected dashboard starting page
- [x] Profile editor with database saving and ownership checks
- [x] Project editor with create/edit/delete, Atlas persistence and ownership checks
- [x] Categorized skills editor and ownership checks
- [x] Dashboard forms and local Atlas persistence verification
- [x] Bento Developer layout and private preview of saved content
- [x] Split-Screen Engineer layout and shared saved-content preview loading
- [x] Template registry, default fallback and saved dashboard selection
- [x] Two portfolio templates and public username routing (locally verified)
- [x] Unsaved live preview for profile, projects, skills and template selection
- [x] React Helmet SEO with server document and client navigation verification
- [x] Local responsive, accessibility and image-loading polish
- [x] Contact email flow and branded templates; production Gmail OAuth setup remains pending
- [x] Pro badge, operator tier assignment and server-enforced premium authorization
- [x] Pro-only domain simulation
- [x] System design note explaining public username routing
- [x] GitHub repository containing application source, tests and setup documentation
- [x] Render Free HTTPS deployment: https://codefolio-meril.onrender.com
- [x] Two permanent showcase profiles using distinct layouts: [Meril Gandhi](https://codefolio-meril.onrender.com/meril2203) and [Nisha Patel](https://codefolio-meril.onrender.com/nisha-patel-dev)
- [ ] Complete production workflow review, including Gmail OAuth email delivery
