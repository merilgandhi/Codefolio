# Authentication

## Implemented flow

1. `/register` uses React Hook Form and Tailwind. The server accepts name, username, email and password only. Account tier is assigned as Free and template defaults to Bento Developer, regardless of extra client fields.
2. Registration returns success and directs the visitor to `/login`. It does not silently create a session.
3. `/login` accepts email/password. Passwords are never trimmed; usernames and emails are trimmed and lowercased. Password length is 12–128 characters, capped at 512 UTF-8 bytes server-side.
4. Password hashing uses Node's asynchronous scrypt with random 16-byte salt, N=65536, r=8, p=2 and a 64-byte derived key. The encoded value stores the parameters and salt. Verification compares fixed-length keys using `timingSafeEqual`. Passwords are not stored in plaintext.
5. Successful login creates a random 32-byte session token. The browser receives it in an HTTP-only, SameSite=Lax cookie. MongoDB stores only its SHA-256 digest, the account ID and absolute expiry. Raw session tokens are never returned in JSON or stored in localStorage.
6. Sessions expire after seven days. Every authenticated request queries an unexpired session; MongoDB's asynchronous TTL cleanup is not relied on for access decisions. A deleted account cannot keep an active session.
7. Logging in again replaces the presented session token and revokes that previous session. Other independent sessions are not revoked.
8. `/dashboard` waits for the server's session check. Anonymous visitors go to login; connectivity failures display retry rather than falsely treating the visitor as logged out. Its starting page displays only the current account's identity and offers logout.
9. Logout deletes the presented server-side session and clears the cookie. It can be repeated safely.
10. `/forgot-password` always returns the same confirmation for valid-shaped addresses. Existing accounts receive a reset link through the configured mailer (Gmail HTTPS API in production); unknown addresses do not reveal account status.
11. Reset links contain a cryptographically random token in the URL fragment. MongoDB stores only its SHA-256 digest, with a 30-minute expiry and one active link per account. `/reset-password` accepts the token once, updates the scrypt password hash, removes all sessions, and invalidates any other reset links.

Node API reference: [scrypt and timing-safe comparisons](https://nodejs.org/api/crypto.html).

## API contract

| Endpoint                                | Input                                         | Success                                 | Expected errors                                       |
| --------------------------------------- | --------------------------------------------- | --------------------------------------- | ----------------------------------------------------- |
| POST `/api/auth/register`               | name, username, email, password               | 201 with safe account fields            | 400 invalid fields, 409 duplicate account             |
| POST `/api/auth/login`                  | email, password                               | 200 with safe account fields and cookie | 401 generic invalid credentials                       |
| POST `/api/auth/password-reset/request` | email                                         | 202 generic confirmation                | 400 invalid email, 429 rate limit                     |
| POST `/api/auth/password-reset/confirm` | token, password                               | 200 after one-time reset                | 400 invalid/expired token or password, 429 rate limit |
| GET `/api/auth/me`                      | session cookie                                | 200 with current account                | 401 missing/invalid/expired session                   |
| POST `/api/auth/logout`                 | empty JSON object and optional session cookie | 204                                     | Database/request protection errors                    |

Safe authenticated account fields: id, username, private account email, name, tier, templateId. This is a private account response, not the public portfolio serializer. Password hashes never appear in API responses.

All writes require JSON and `X-Codefolio-Request: 1`. Browser writes from disallowed Origins or marked cross-site are rejected. This custom header requires a cross-origin preflight; the app deliberately does not grant cross-origin CORS permissions. Keep frontend and API on the same origin in production, or explicitly redesign these protections if the deployment architecture changes. Development uses Vite's `/api` proxy.

Registration and login share an IP-based rate limit of 20 requests per 15 minutes. The limiter uses process memory: it resets on API restart and is not shared across replicas. Configure a shared limiter store before deploying multiple instances. Reference: [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit).

Password recovery shares a separate five-request-per-IP limit across requests and confirmations in a 15-minute window. The production Render service is configured with Gmail OAuth (`GMAIL_USER`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` and `GMAIL_REFRESH_TOKEN`); a real password-reset delivery has not yet been verified. Delivery failures are kept out of the public response to avoid disclosing whether an account exists; check server logs and Google OAuth settings if the link does not arrive. The in-memory limit is per process and resets on restart.

If MongoDB is unavailable, account routes return 503 instead of buffering requests. Authentication responses use `Cache-Control: no-store`. Unexpected driver errors use the generic API error response and are not sent raw to clients.

## Environment and deployment

- Local development accepts `http://127.0.0.1:5174` and `http://localhost:5174` unless APP_ORIGIN is supplied.
- Set `APP_ORIGIN` to the actual HTTPS website origin for production. Production startup rejects a missing/non-HTTPS origin.
- The server binds to `0.0.0.0` in production so a hosting proxy can reach it. Development defaults to `127.0.0.1`; `HOST` can override either value.
- Cookies use Secure in production. Therefore production login requires HTTPS; a plain HTTP production preview will not preserve the cookie in a normal browser.
- `TRUST_PROXY=1` supports one trusted reverse proxy. Leave it disabled locally and verify the deployment topology before enabling it. Do not expose the application directly while blindly trusting arbitrary forwarded headers.
- Application startup awaits User, Session and PasswordResetToken indexes when a database is configured. Unique indexes enforce account identity and reset-token ownership; TTL indexes clean up sessions and expired reset links.
- Atlas credentials remain in local `.env`, never frontend code, tracked files or test output.
- The selected Render configuration and deployed acceptance steps are documented in [DEPLOYMENT.md](DEPLOYMENT.md).

## Verification completed

On 2026-10-21:

- All 20 default backend checks passed, including seven authentication tests for hashing, password limits, cookie policy, request protection, rate limiting, registration validation and generic login errors.
- `pnpm verify:auth` passed against Atlas with temporary accounts. It checked registration, password hash storage, ignored privilege injection, duplicate usernames/emails, invalid credentials, token hashing, rotation, current-account separation, server-instance recreation, logout revocation, cross-origin logout rejection and expiry. All fixtures were removed.
- Browser checks passed for blank registration validation, anonymous dashboard redirect, actual login, dashboard refresh session restoration and logout. Registration layout was reviewed at desktop and 390px width.
- The production frontend build passed. Auth and dashboard route code is loaded separately.

Repeat `pnpm verify:auth` only against the intended development database. It creates temporary accounts, creates declared indexes without dropping existing indexes, and removes only its per-run fixtures. It never prints credentials, passwords or session tokens.

## Remaining work

Profile, project, skills, template, plan and domain writes use the authenticated account on the server and have passed ownership or authorization checks. See the respective editor notes. Contact delivery through production Gmail OAuth has been confirmed once; password-reset delivery still needs an end-to-end check.

No real production password-reset email has been verified yet. Signup email verification and multi-factor authentication are not implemented or explicitly requested in the project brief. Account email addresses are syntax-checked, not ownership-verified.
