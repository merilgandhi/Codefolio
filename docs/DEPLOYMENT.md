# Production deployment

CodeFolio is configured for one free Render Web Service. Express serves the compiled React app and all `/api` routes from the same HTTPS origin, preserving the existing session, origin and request protections without adding CORS.

Render Free blocks SMTP ports 25, 465 and 587. Production contact and password-reset email therefore use Gmail's HTTPS API and OAuth, which sends over HTTPS. Gmail's API `gmail.send` scope authorizes message sending only. Render Free may sleep after 15 minutes without traffic, so a first visit can take about a minute to wake.

## Deploy from GitHub

1. Sign in to Render and create a Blueprint from `merilgandhi/Codefolio`, branch `master`.
2. Review `render.yaml`; create the `codefolio-meril` Web Service on the Free plan in Singapore.
3. Before the service starts, add the required secrets in the Render service's Environment page as described below.
4. Add the Render service's outbound network access in Atlas and verify Atlas allows the host to connect.
5. Wait for the deploy and open `https://codefolio-meril.onrender.com/api/health`.

The tracked Blueprint sets `pnpm install --frozen-lockfile && pnpm build`, `pnpm start` and `/api/health`. Render supplies `PORT`; the app binds to `0.0.0.0` in production. Render terminates HTTPS and redirects inbound HTTP to HTTPS. `TRUST_PROXY=1` enables the single trusted proxy hop required for secure cookies and client-address limits.

## Secrets and settings

Keep secret values in Render's environment settings, never in the repository or chat.

| Name                  | Value                                  |
| --------------------- | -------------------------------------- |
| `NODE_ENV`            | `production`                           |
| `APP_ORIGIN`          | `https://codefolio-meril.onrender.com` |
| `TRUST_PROXY`         | `1`                                    |
| `MONGODB_URI`         | Atlas connection string, as a secret   |
| `GMAIL_USER`          | `merilgandhi2203@gmail.com`            |
| `GMAIL_CLIENT_ID`     | Google OAuth desktop client ID         |
| `GMAIL_CLIENT_SECRET` | Google OAuth client secret, as secret  |
| `GMAIL_REFRESH_TOKEN` | Gmail OAuth refresh token, as secret   |
| `GMAIL_FROM`          | Optional; must match `GMAIL_USER`      |

Keep OAuth secrets in Render and the ignored local `.env` file, never in Git or chat. Remove the old `SMTP_*` production variables after OAuth is configured; production does not use SMTP. The Google Cloud OAuth app should be set to **In production** before using its refresh token continuously, because External apps left in **Testing** issue refresh tokens that expire after seven days. The `gmail.send` scope is sensitive; for personal use Google allows proceeding without verification for a small known user group, with an unverified-app warning. Public distribution may require verification.

## Atlas access

Add the Render service's outbound address to Atlas Network Access. Render Free does not provide a stable outbound IP, so it cannot be restricted to one fixed IP. A broad `0.0.0.0/0` rule exposes the database endpoint to connection attempts from anywhere; if you choose that for the internship demonstration, use a dedicated least-privilege database user and a strong secret held only in Render. A host with static egress or private networking is the stricter option.

## Deployed acceptance checks

After the HTTPS service is healthy:

1. `/api/health` returns `status: "ok"` and `database: "connected"`.
2. Registration, login, dashboard refresh and logout work with Secure cookies.
3. Profile, project, skill and template edits persist after a fresh login.
4. Both showcase URLs render their intended layouts anonymously.
5. A contact form message reaches the portfolio owner's registered inbox using Gmail OAuth.
6. A password-reset request reaches the registered account inbox; the one-use link updates the password and invalidates existing sessions.
7. Direct visits to `/dashboard`, `/forgot-password`, `/reset-password`, `/:username` and `/user/:username` work.
8. Desktop/mobile layouts and both color modes work.

Only after these checks pass should requirement L01 be marked verified. The two permanent showcase profiles and their public URLs complete L02.

## References

- [Render's first deploy](https://render.com/docs/your-first-deploy)
- [Render Free services and SMTP restrictions](https://render.com/docs/free)
- [Render health checks](https://render.com/docs/health-checks)
- [Gmail API sending guide](https://developers.google.com/workspace/gmail/api/guides/sending)
- [Google OAuth refresh-token behavior](https://developers.google.com/identity/protocols/oauth2)
- [MongoDB Atlas IP access lists](https://www.mongodb.com/docs/atlas/security/ip-access-list/)
