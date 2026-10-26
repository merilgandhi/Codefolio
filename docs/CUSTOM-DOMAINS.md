# Pro custom-domain redirect simulation

Implemented and verified locally on 2026-10-25. PDF page 3, Phase 4 permits a simplified redirect instead of CNAME/Host mapping. This implementation stores a unique hostname for a Pro account and resolves a real HTTP redirect to its public portfolio.

## Dashboard workflow

1. Sign in and open **Custom domain** in the dashboard.
2. Pro accounts can enter a hostname such as `yourname.com` or `work.yourname.com`, then click **Save domain**. Case and surrounding whitespace are normalized.
3. **Test saved redirect** opens `/api/domains/<saved-domain>` in a new tab. Express looks up the saved mapping and returns `302 Location: /<username>`. The regular public document handler serves the selected portfolio layout.
4. Editing is a draft until Save. The test link uses the saved hostname. Reload and section/logout navigation protect unsaved edits; stale account versions require explicit reload/discard.
5. **Remove domain** asks for confirmation, deletes the saved hostname and makes the previous test link return 404. Another Pro account can then claim it.

Free accounts see the Pro requirement. Open **Plans**, select Pro and save to enable domain settings in the [user-requested demo plan flow](PRO-ACCESS.md). No payment is required. The operator CLI and **Refresh plan** remain available for administrator changes.

The UI labels this a **Redirect simulation**. It does not configure DNS, verify ownership of a real domain, issue certificates, use incoming Host headers for tenant selection or make `https://yourname.com` serve CodeFolio. Hostnames are simulation identifiers. Real DNS/TLS hosting would be a separate implementation.

## Data and API boundaries

- Optional `User.customDomain`: canonical lowercase ASCII/punycode hostname, at most 253 characters, labels at most 63 characters. URLs, wildcards, ports, paths, credentials, IP addresses and local-only names are rejected. Unicode must be entered in punycode form.
- A unique partial MongoDB index applies only to string-valued mappings, allowing multiple unconfigured accounts. Removal unsets the field. Normal app startup initializes declared indexes; domain mutations await model initialization. The integration helper explicitly adds this index because it disables automatic indexing.
- `GET /api/pro/domain` returns only the signed-in owner's `domain`, account edit `version` and relative `redirectPath`.
- `PUT /api/pro/domain` accepts only `{ domain, version }`; `DELETE` accepts only `{ version }`. Both pass session, request-origin/marker, database and Pro guards. The atomic update also matches the authenticated `_id`, stored `tier: 'pro'` and `__v`, increments the version and validates the hostname.
- Query/account selectors and extra fields return 400. Anonymous requests return 401, Free requests 403, stale writes 409 `EDIT_CONFLICT`, duplicate claims 409 `DOMAIN_IN_USE`. Unsupported settings methods return 405. Responses are not cached.
- `GET /api/domains/:domain` is anonymous. Only a mapping whose owner is currently Pro resolves. Missing/removed/downgraded mappings return 404; invalid input returns 400; unavailable database/lookups return sanitized 503. Redirects use `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow`.
- Destinations are relative paths derived from validated database usernames. Host/Forwarded headers, query parameters and supplied URLs cannot choose an external destination. No outbound domain request or DNS lookup occurs.
- Downgrade preserves the mapping but immediately disables resolution and settings access on subsequent requests. Restoring Pro reactivates it. A downgrade during a write also fails the atomic tier/version condition. A request already resolving before a downgrade may finish.
- Public portfolio JSON/HTML and account-auth responses omit domain settings and private account credentials. Only owner settings return the saved hostname; the public simulation exposes the portfolio destination for a known hostname.

## Verification

- **76 default tests** pass, including hostname attacks, strict write shapes, model validation/privacy, session/write/database guards, safe relative redirects under hostile headers, non-Pro/invalid owners and sanitized outages.
- Two authorized disposable Atlas accounts verified real save/read persistence, unchanged portfolio/account fields, owner isolation, Pro enforcement, stale saves/removal, unique-index rejection, concurrent claims, removal/reuse, public privacy and same-session downgrade/reinstatement. Each redirect reached the corresponding public document.
- Browser checks covered Free restriction, validation/error focus, canonical save, reload persistence, the actual new-tab redirect destination, dirty-section/reload protection, two-tab edit conflict and recovery, cancel/confirm removal, downgrade rejection and recovery after plan refresh.
- Eight measurements cover 320/390/768/1440px in both modes without horizontal overflow. Desktop light and mobile dark screenshots were reviewed. Tailwind theme tokens provide styling; no custom stylesheet was added.
- The production build, three renderer verification groups and Prettier checks pass. Exactly the two generated fixture IDs and their sessions were removed; the QA server stopped. The existing user's plan, portfolio and session were not changed.

Repeat with `npm test`, `npm run build`, `npm run verify:rendering`, and `npm run verify:domains` (requires configured Atlas). `npm run qa:domains` runs the checks and holds the same two fixtures for browser review with isolated cookies and external email disabled. Write `cleanup` to the ignored `.polish-qa-control` file or use Ctrl+C to finish with exact fixture removal.

Deployment and deployed end-to-end checks remain pending. Next milestone: GitHub publication preparation, including setup/documentation and secret exclusions.
