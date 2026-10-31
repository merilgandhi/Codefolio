# Project editor milestone

## Scope

The Projects dashboard section uses React Hook Form and Tailwind. Each project has title, description, technology array, repository link, live link and screenshot URL. Users can create, edit and delete projects, with confirmation before deletion. Project data is separate from profile editing in the interface and API.

The UI accepts technologies separated by commas and sends an array to the server. Shared validation in `shared/projects.js` requires title/description, limits technologies to 20 distinct nonempty strings, and validates optional HTTP/HTTPS links. Limits match the existing User schema: 50 projects per account; title 120 characters, description 3000, technology 50, URL 2048. These numerical limits are implementation decisions, not numbers specified by the PDF.

Screenshots use public image URLs, lazy loading, fixed aspect ratio, alt text, no-referrer requests and a missing/broken-image fallback. File uploading is not implemented. Production CSP permits HTTP/HTTPS images; browsers may still block an HTTP image on an HTTPS page as mixed content, so HTTPS screenshots are recommended.

## API and ownership

| Endpoint                          | Body                   | Success                          |
| --------------------------------- | ---------------------- | -------------------------------- |
| GET `/api/projects`               | None                   | 200 with `{ projects, version }` |
| POST `/api/projects`              | `{ project, version }` | 201 with saved list/version      |
| PUT `/api/projects/:projectId`    | `{ project, version }` | 200 with saved list/version      |
| DELETE `/api/projects/:projectId` | `{ version }`          | 200 with remaining list/version  |

Account identity always comes from the authenticated session. Update/delete search only the owned account's project array. Foreign and missing project IDs return 404. Query selectors and extra body fields are rejected. Project content cannot modify credentials, tier, template choice, profile or skills. Responses contain only allowlisted project content and the account version; private account information is excluded.

Updates preserve each MongoDB project subdocument ID. Every mutation checks the client version and uses Mongoose's optimistic concurrency protection. Stale or racing saves return 409. The UI retains unsaved form data after failed saves and requires reload on a version conflict. Explicitly reloading the saved list requires discarding unsaved edits first.

The whole User version is shared with profile editing. The dashboard mounts one editor section at a time and reloads saved state when changing sections. Switching with unsaved changes prompts discard/keep; section switching and sign-out are disabled during saves. Browser close/reload uses beforeunload when project edits are dirty. As with the profile editor, not all browser-history or home-link navigation is blocked.

All endpoints require active sessions and use no-store responses. Writes require JSON, the custom request header and permitted Origin policy. Delete is a real database deletion with an explicit UI confirmation, not a soft delete or archive.

## Verification commands

- `pnpm test`: offline validation, serialization and local HTTP middleware tests.
- `pnpm build`: production frontend build.
- `pnpm verify:projects`: opt-in Atlas checks using two temporary accounts. The script is designed to verify full CRUD, stable IDs, cross-account protection, stale/racing edits, protected-field preservation, safe input, logout/login and server-instance persistence, project limits and session expiry. It removes only generated fixture accounts and their sessions.

Do not treat a build or offline test as proof of real Atlas persistence. Record integration/browser results and any connectivity blocker in the requirements tracker.

## Scope boundary

This milestone covers project editing. Categorized skills are implemented separately; see [SKILLS-EDITOR.md](SKILLS-EDITOR.md).

## Current results

The 28 default backend tests and production build pass. The earlier TLS blocker was resolved after the user updated Atlas network access. `node server/scripts/verify-projects.js` then exited successfully: all eight check groups passed, including cleanup. The two-account checks verified all six fields, stable IDs, foreign/missing IDs, stale versions, concurrent writes, preservation of unrelated fields, invalid-input rejection, logout/login and server-instance persistence, deletion through an empty list, the 50-project limit and session expiry.

Browser checks with a separate disposable account passed for full-field creation, validation of duplicate technologies/unsafe URLs, screenshot loading, refresh persistence, editing, broken-image fallback, keep/discard behavior, section-switch confirmation, deletion cancellation and confirmed deletion followed by refresh. Project cards were reviewed at desktop and 390px width. The temporary account, sessions and screenshot asset were removed. The user's existing account and session were preserved.

This completes the project editor milestone. Public portfolio rendering and categorized skills are documented in their own implementation notes.
