# Live portfolio preview

Implemented and locally verified on 2026-10-24. Open the dashboard after running `npm run dev`.

## Editing behavior

- The original dashboard is the default: welcome message, account card, section buttons and a full-width editor. The preview starts closed on each dashboard visit, as requested by the user on 2026-10-24.
- **Show live preview** opens an optional preview beside the editor on screens at least 1024px wide. The page scrolls naturally; there is no fixed studio viewport or simulated browser frame. **Hide live preview** returns to the original layout without discarding form values.
- On smaller screens, **Editor** and **Live preview** switch between the panels while the optional preview is open. The editor remains mounted, so switching views preserves form values, validation and pending drafts.
- Display name, bio, résumé and social-link changes update the preview as typed. Invalid or incomplete URLs are omitted from the preview until they are valid; Save still uses the existing full validation.
- Editing a project replaces that project's preview in place. A new project appears as an extra draft card once editing begins. Cancel/Discard restores the saved list. Create/Save/Delete retain the existing explicit database actions.
- Skill additions, removals and category clearing appear immediately. Empty and repeated comma-separated entries are omitted from the rendered draft; save validation still reports invalid input.
- The Templates editor previews either layout immediately. The saved template changes only after **Save template** succeeds.
- **Unsaved preview** identifies drafts. **Saved content** appears when the active form matches its saved values. Existing discard, reload, save-conflict and session-expiry handling remains in place.
- **Refresh saved content** refreshes the preview's saved baseline without discarding current form values. It does not reload or save the editor.
- Changing editor sections retains the existing Save/Discard workflow; unsaved changes are not stored across sections or page reloads.

The separate **Portfolio preview** section remains a full-width view of saved data. The public portfolio also displays saved data only.

## Data flow and privacy

`LivePortfolioPreview` reads the current account's existing authenticated `/api/portfolio/preview` endpoint. Editors use React Hook Form `useWatch` to supply presentation patches. `withPortfolioDraft` overlays only the active section on that public-data snapshot and sends the result to the existing shared `PortfolioRenderer`.

Typing triggers no API writes. Drafts stay in React memory and are not put into public responses, browser storage or a database. The snapshot excludes private account email, account ID, password hash and sessions. Draft adapters allowlist profile fields and filter unsafe links; they are not used to construct save requests. All component styling uses Tailwind utilities and existing semantic color tokens.

The renderer verification script uses a separate Vite dependency cache so running it cannot invalidate the React modules of an already-open development browser.

## Verification evidence

- All 47 tests pass, including four new draft checks covering immutable saved data, identity/private-field protection, unsafe URLs, skill clearing/deduplication, project replace/add/cancel and layout compatibility.
- Production build and both renderer verification groups pass.
- Browser checks against a single disposable Atlas account verified live profile edits, blocked unsafe URL submission, dirty-section confirmation, successful profile saving and visible saved state.
- Project edit/cancel, new draft cards, preview refresh preserving drafts and successful project creation passed.
- Skill updates, clearing, reload/discard, mobile view switching without draft loss and successful saving passed.
- Unsaved Split-Screen selection, stale-version reload recovery and successful template saving passed. Further profile editing used the saved Split-Screen layout.
- Scoped Atlas/public-API checks confirmed unsaved drafts did not change public data, and successful profile, project, skill and template saves did. No existing user account was edited.
- Both color modes were reviewed; desktop 1440px and mobile 390px showed no horizontal page overflow. The preview canvas excluded the private account email. Browser error logs were empty.

Verification ended successfully: the disposable account and its sessions were removed, and the temporary QA server was stopped. Existing user data was unchanged. Deployment, React Helmet SEO and the complete public image/accessibility audit remain separate milestones.

The subsequent visual revision restored the original dashboard layout and made live preview optional. Browser checks confirmed the preview is absent on a fresh visit, Show/Hide preserves a draft, restoring a field disables Save again, reload keeps the original default, and mobile switching works without horizontal overflow. The shared warm neutral/violet palette was reviewed in both modes. No saved portfolio data was changed during these appearance checks.
