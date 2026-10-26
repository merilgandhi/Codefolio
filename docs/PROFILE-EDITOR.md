# Profile editor milestone

Implemented fields: display name, bio, social links (label + URL), and resume URL. Forms use React Hook Form with `useFieldArray` for social links and Tailwind for styling. Up to ten links can be added or removed. Shared validation rules live in `shared/profile.js` and are also enforced on the server.

## API

- `GET /api/profile` returns `{ profile, version }` for the signed-in account only.
- `PUT /api/profile` accepts `{ profile, version }`. It replaces the profile section and returns normalized saved data and the new version.
- The server determines the owner from the session. No target account ID or username is accepted. Query selectors and extra body fields, including account tier, password, email and template choices, are rejected. Other profile paths have no editing handler.
- Reads and writes require an active session. Writes share the JSON, custom-header and Origin protections used by authentication. Responses use `Cache-Control: no-store`.
- A mismatched client version or concurrent Mongoose save returns 409. The editor keeps unsaved edits and requires loading saved data before another save. Version checking covers the whole User document; later editors must account for changes in other sections.
- Successful profile saves do not modify projects, skills, template selection or account credentials. The display-name change is reflected in the account header.

Profile fields are a full section replacement: omitted optional bio/resume/link values become empty. Display name is required. Social links require both label and URL. Validation rejects incorrect input types, oversized fields, executable/relative URLs and URL credentials. React renders user text as text rather than injecting HTML.

## User experience

The dashboard loads the saved profile, shows loading/error/retry states, marks unsaved changes, and disables editing while a save is pending. Saving resets the form to the server's normalized values. Failed saves preserve edits. An expired session redirects to sign-in. Reload and logout offer explicit discard/keep choices when edits are unsaved; a browser reload/close uses the standard beforeunload protection. These protections do not currently block all client-side navigation, such as using the home link or browser history.

The editor stores profile data; it does not publish a public portfolio yet. Resume support is a URL input, not file uploading. Avoid entering private information in fields intended for future public rendering.

## Verification

On 2026-10-21:

- All 24 default backend tests passed, including shared profile validation and anonymous/cross-site protection checks.
- `pnpm verify:profile` passed against Atlas with two temporary accounts. It verified all required fields, normalization, API reload, display-name updates, stale versions, rejection of target-user selectors and privilege injection, peer-account isolation, preservation of projects/skills/credentials, invalid-input rejection, removal of optional content, logout/login persistence and expired-session write rejection. Temporary records and sessions were removed.
- Browser checks with a separate disposable account verified unsafe-link feedback, saving every field, refresh persistence, adding/removing a social link, and keep/discard behavior when reloading saved data. Layout was reviewed at desktop and 390px width. The existing user's account was not edited; the browser fixture and sessions were removed afterward.
- Production frontend build passed.

Run `pnpm verify:profile` only against the intended development database. It creates two uniquely identified temporary accounts, adds declared indexes without dropping existing indexes, and removes only its generated account IDs and sessions. Passwords, Atlas credentials and raw driver errors are not printed.

## Next task

Project editor: title, description, technology array, repository link, live link and screenshot URL, with create/edit/delete, Atlas persistence and ownership checks. This is not implemented by the profile milestone.
