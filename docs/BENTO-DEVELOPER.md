# Bento Developer: first portfolio layout

The user selected **Bento Developer** and **Split-Screen Engineer** on 2026-10-22, replacing the provisional Minimalist/Cyberpunk presentation choices. Both layouts and persisted template selection are now implemented; see `SPLIT-SCREEN-ENGINEER.md` and `TEMPLATE-SELECTION.md`.

## Try it

Run `npm run dev` (or `pnpm dev`), sign in, open **Templates**, choose **Bento Developer**, then **Save template**. **Portfolio preview** at `http://127.0.0.1:5174/dashboard?section=preview` follows the saved choice.

Save edits in Profile, Projects, or Skills before opening the saved-content preview. It loads fresh saved content on entry; **Refresh preview** reloads it explicitly. The optional live preview can also render unsaved profile, project, skill, and layout drafts beside the editor.

## Layout

- Developer name, biography, initials derived from the name, work navigation, and optional resume link.
- Social-links card with optional resume link. Missing links are handled without inventing content.
- Projects with every required saved field: title, complete description, technologies, screenshot, repository and live-demo links. The first saved project is featured. Later projects use a responsive grid, with a wide final card when needed to avoid an orphaned column.
- Frontend, Backend, and DevOps skill groups, preserving all saved entries. Empty groups are omitted; a fully empty collection has an explanatory state.
- Footer attribution, responsive container queries, light/dark semantic colors, keyboard focus indicators, descriptive link names, and reduced-motion support. All component styling uses Tailwind utilities.
- Screenshots have reserved dimensions, descriptive alt text, asynchronous decoding, a missing/broken-image fallback, and lazy loading after the first project. External links are restricted to validated HTTP(S) URLs and use `noopener noreferrer` with an accessible new-tab indication.

`src/portfolio/templates/BentoDeveloper.jsx` is a presentation component, independent of authentication and data fetching. It receives an explicit public portfolio object and can later be reused on the public username route. Shared project/link/icon components live in `src/portfolio/components/`; both dashboard previews use the adapter in `src/dashboard/PortfolioPreview.jsx`.

## Data boundary

`GET /api/portfolio/preview` requires a valid, unexpired account session and a connected database. It serializes one consistent saved User document through the existing public-data allowlist. It never accepts a username or account ID selector and sends `Cache-Control: no-store`. Private email, password hash, account IDs, session tokens, and document versions are excluded from its response. The private account-details section elsewhere in the dashboard continues to show the owner's email.

The endpoint is read-only. The existing editor section-switch confirmation also guards moving to the preview with unsaved edits.

## Verification on 2026-10-22

- All **32 backend tests** pass, including preview authentication, no-cache behavior and database downtime.
- Production frontend build passes.
- `node server/scripts/verify-preview.js` passes against Atlas: two owners receive their own complete persisted data; public allowlist; no private-field leakage; anonymous/expired-session rejection; account-selector and mutation rejection; unchanged account records; exact fixture cleanup. All four reported groups pass. Run it with `npm run verify:preview` or `pnpm verify:preview` when explicitly checking Atlas.
- Browser checks cover desktop (1280px), mobile (390px), light/dark mode, project navigation, screenshot loading/failure, outbound-link attributes, empty content, and maximum field lengths including all 120 skills. No horizontal overflow was observed. A clearly labelled, local-only sample page was used for visual edge cases and removed after checks. The live dashboard also displayed the existing signed-in owner's actual saved profile, with empty project/skill states, without changing their saved content.
- Atlas initially rejected TLS connections. Checks passed after the user updated network access. All integration fixtures were removed. Additional browser-account creation was declined and was not executed; browser sample data was never stored in Atlas.

## Remaining work

Both layouts, the shared registry/default fallback and persisted dashboard selector are implemented. Canonical IDs are `bento` and `split-screen`; old values resolve compatibly without forced record updates. Public username routing, React Helmet metadata, live preview, contact email, Pro badge, domain simulation and deployment status are tracked in `REQUIREMENTS.md`.
