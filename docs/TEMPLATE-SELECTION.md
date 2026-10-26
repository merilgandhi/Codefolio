# Template selection, persistence and fallback

Implemented and locally verified on 2026-10-22. The selected layouts are **Bento Developer** and **Split-Screen Engineer**. All component styling uses Tailwind utilities.

## Use it

1. Run `npm run dev` or `pnpm dev` and sign in.
2. Open **Templates** at `http://127.0.0.1:5174/dashboard?section=templates`.
3. Select a layout to preview it with your saved profile, projects and skills. The preview changes immediately; an unsaved selection is clearly marked.
4. Choose **Save template**. The canonical ID is stored directly on your User document in MongoDB.
5. **Portfolio preview**, at `?section=preview`, follows the saved choice. Refresh and signing in again preserve it.

The **Saved** badge identifies the persisted choice, while the radio selection can be a draft. Reloading with a draft asks before discarding it. Dashboard section changes and sign-out use the existing unsaved-change guards; full page unload has the usual browser warning. General browser-history navigation remains subject to the existing dashboard limitations.

Layout selection now uses the shared dashboard live-preview panel. Side-by-side unsaved profile/project/skill previews and public username URLs are also implemented; see [live preview](LIVE-PREVIEW.md) and [public routing](PUBLIC-PORTFOLIOS.md).

## Registry and compatibility

`shared/portfolio.js` is the source of canonical IDs, names, descriptions and compatibility rules:

| Stored value              | Resolved layout       |
| ------------------------- | --------------------- |
| `bento`                   | Bento Developer       |
| `split-screen`            | Split-Screen Engineer |
| `minimalist` (legacy)     | Bento Developer       |
| `cyberpunk` (legacy)      | Split-Screen Engineer |
| Missing or unsupported ID | Bento Developer       |

New users default to `bento`. The model still accepts legacy stored values so ordinary edits to existing accounts remain valid. Auth and public-data serializers normalize legacy IDs in their responses without updating records on reads. Explicit template saves accept only the two canonical IDs and replace the old value. No bulk migration or silent read-time rewrite occurs.

`src/portfolio/templateRegistry.js` imports both components and maps IDs to layouts. `PortfolioRenderer.jsx` selects through this registry and always resolves a default; prototype-like strings such as `constructor` and `__proto__` cannot select object properties. It receives the same explicit public portfolio object for both layouts. A caller can override the saved ID for a draft preview without changing the saved object.

`PortfolioPreview.jsx` now uses this renderer and the saved ID. The old private `?section=split-preview` URL remains an explicit Split-Screen preview, with copy explaining that Templates is where a choice is saved. The old Bento-specific `?section=preview` URL now serves the selected layout.

## API and ownership

`GET /api/template` returns `{ portfolio, version }` from one consistent authenticated User document. Portfolio fields pass through the public-data allowlist; the version is private editing metadata outside that object. `PUT /api/template` accepts only `{ templateId, version }`.

Both endpoints require a valid session and database connection and send `Cache-Control: no-store`. Account identity comes only from the session. Request-body/query account selectors are rejected. Writes require the existing allowed-origin, request-header and JSON protections. Unsupported/obsolete IDs and malformed versions receive 400; stale/racing/cross-section edits receive 409. A template save changes only `templateId`, timestamps and the shared optimistic-concurrency version. Other content, credentials and tier are preserved. A successful save updates the current frontend account state; a 401 returns to sign-in.

## Verification

- **36 backend tests pass**, including canonical/legacy/default resolution, prototype-like input, strict request validation, model compatibility, normalized serializers, authentication, cross-origin protection and database downtime.
- Production build passes after the final frontend changes.
- `npm run verify:rendering` passes both groups against the actual Vite-compiled renderer. Both layouts render every required field; legacy, absent and invalid IDs choose the expected component; explicit preview overrides and embedded headings work.
- `npm run verify:templates` uses two generated Atlas accounts and removes only those accounts and their sessions. The completed check groups cover legacy reads and ordinary profile saves, canonical selection persistence, private-field exclusion, unchanged other content, peer isolation, invalid/privileged inputs, stale/racing/cross-section writes, fresh Node-process reads, logout/login, API recreation, unknown stored IDs and expired sessions.
- For this run, `--browser` retained those same two authorized fixture accounts for browser checks, then cleanup confirmed zero remaining fixture accounts/sessions. No additional browser accounts were created. The default restricted test process failed before creating accounts; the network-authorized run completed.
- Browser checks cover draft previews, keyboard and pointer saves, refresh, saved-layout preview, discard/keep behavior, conflict feedback/reload recovery, unknown/legacy stored IDs, expired-session redirect and restored choice after sign-in. Desktop (1280px) and mobile (390px) checks in light/dark mode show no horizontal overflow. Browser logs show no unexpected errors or warnings.
- The browser checks ran against the built application on an isolated local test address, preserving the real user's existing session and content. That temporary server/source and its test tab were removed/stopped. The fixture control file was removed by cleanup; it contains no credentials and is ignored by Git while a check is active.

For optional interactive checks, `node server/scripts/verify-templates.js --browser` holds the two fixtures after the API checks. It prints disposable login details only in that explicit mode and creates `.template-qa-control`. Write `conflict`, `unknown`, a canonical/legacy ID, or `expire` into that file to affect only the first generated fixture; write `cleanup` to finish and remove both accounts/sessions. Normal `verify:templates` needs no browser/control file and cleans up automatically. Do not interrupt an active fixture run without completing its cleanup.

## Next task

Public `/:username` routing and unsaved live previews are complete locally. React Helmet SEO is the next milestone; the remaining internship deliverables are tracked in `REQUIREMENTS.md`.
