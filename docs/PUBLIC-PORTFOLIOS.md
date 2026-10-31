# Public portfolios and username routing

Implemented locally on 2026-10-24. Run `npm run dev`, then open `http://127.0.0.1:5174/<username>` or use **Open public portfolio** in the dashboard. Saved profile, projects, skills and layout are public immediately. Production is deployed at `https://codefolio-meril.onrender.com`; the permanent showcase portfolios are `/meril2203` and `/nisha-patel-dev`.

## Request flow and system design

1. A direct anonymous `GET /:username` reaches Express. During development Vite forwards portfolio HTML requests to Express; its own modules, files and app routes stay with Vite. In production Express serves the built assets itself.
2. Express normalizes and validates the route parameter, rejects reserved names, checks database availability, and queries the indexed `User.username` field. The query selects only portfolio fields, with a bounded database execution time. User-controlled query strings do not become database selectors.
3. The explicit public serializer constructs an allowlisted object: username, normalized template ID, Pro flag, profile, project fields and categorized skills. Account email, password hash, account ID, version and session data are excluded. Project subdocument IDs are public stable identifiers.
4. Express serves the frontend document with that object in a non-executable JSON script. JSON HTML delimiters and Unicode line separators are escaped so profile content cannot terminate the script. HTTP status is 200 for a found profile, 404 for missing/invalid names, and 503 when the database or frontend is unavailable. Documents and public JSON use `Cache-Control: no-store`.
5. React Router loads the anonymous public page. It consumes the document's matching public data and passes it into the same `PortfolioRenderer` used by dashboard previews. The registry selects Bento Developer or Split-Screen Engineer and resolves legacy/unknown template IDs with its existing fallback.
6. Client-side navigation and the retry button use anonymous `GET /api/portfolios/:username`. Loading, not-found and unavailable states have visible text and navigation. This route does not require a successful authentication check, issue cookies, or write account data.

The HTML document contains data for client rendering; portfolio body markup is rendered by React. [React Helmet metadata](SEO.md) is now included in the initial server document and maintained during client navigation. The dashboard has a separate [unsaved live preview](LIVE-PREVIEW.md); the public page continues to show saved data only.

## Canonical paths and route precedence

- Canonical path: `/:username`, lowercase, without a trailing slash.
- An existing uppercase/encoded variant or trailing-slash variant redirects with HTTP 308.
- `/user/:username` is the PDF's showcase alias and redirects with HTTP 308 to the canonical path when the account exists. Missing aliases return 404.
- Redirect targets are relative paths built from validated usernames; an incoming Host header cannot choose an external redirect destination. Query strings are retained.
- `/api/*`, real static assets, and `/`, `/login`, `/register`, `/dashboard` take precedence over portfolio lookup. Reserved usernames cannot be registered. Unknown nested routes and missing assets return 404 rather than a successful SPA document.
- A client-side alias also supports navigation inside the React app. Server redirects remain responsible for direct document requests.

In development, Express reads Vite's transformed `/index.html` from the fixed local origin. That path bypasses portfolio proxying, preventing a loop. A fixed-origin base URL with the canonical portfolio path allows both Vite modules and in-page fragment links to resolve correctly, including direct visits on the API port. Vite's development document omits the production script CSP to allow its React refresh preamble. Production uses the compiled document and Helmet CSP.

## Verification

The [Pro custom-domain simulation](CUSTOM-DOMAINS.md) adds `GET /api/domains/:domain`. It resolves a saved hostname owned by a currently Pro account and sends a noncached 302 to the existing canonical `/:username` handler. This route is under the existing `/api` Vite proxy; incoming Host headers cannot choose a tenant or redirect destination. Real DNS/TLS mapping is outside this permitted simulation.

- `npm test`: 43 passing tests, including anonymous public documents/JSON, canonical and alias redirects, true 404s, reserved/invalid names, unavailable responses, route precedence, private-field exclusion and safe bootstrap serialization.
- `npm run build`: production bundle builds successfully.
- `npm run verify:rendering`: both compiled templates, all required fields, legacy/default fallback and embedded headings pass.
- `npm run verify:public`: requires Atlas and a running Vite development server, plus a current build. Creates exactly two uniquely identified temporary accounts and removes those IDs and their sessions in `finally`. Checks production documents/assets, anonymous JSON, Vite forwarding, saved profile/template changes, account isolation, redirects, 404s, unavailability and privacy.

The optional `--browser` argument keeps those same two fixtures alive for browser checks until `.public-qa-control` contains `cleanup`; `unavailable` and `available` simulate API availability only on that temporary server. No credentials are written to the control file. Temporary fixtures are separate from the permanent showcase profiles linked above.

Browser verification covers both public layouts, desktop and 390px widths, light/dark controls, internal section links, direct development visits and aliases. SEO has separate [verification evidence](SEO.md). The subsequent [local responsive, accessibility and image review](RESPONSIVE-ACCESSIBILITY.md) and [Nodemailer contact milestone](CONTACT-EMAIL.md) are complete. Production deployment and premium features are implemented; full deployed workflow verification remains pending.
