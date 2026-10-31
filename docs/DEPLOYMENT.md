# Production deployment

CodeFolio is configured for one free Render Web Service. Express serves the compiled React app and all `/api` routes from the same HTTPS origin, preserving the existing session, origin and request protections without adding CORS.

Render Free blocks SMTP ports 25, 465 and 587. The contact form keeps Nodemailer and uses Resend SMTP on STARTTLS port 2587, which is not among Render's blocked ports. Resend Free currently includes 3,000 transactional emails per month with a 100-email daily limit. Render Free may sleep after 15 minutes without traffic, so a first visit can take about a minute to wake.

## Deploy from GitHub

1. Sign in to Render and create a Blueprint from `merilgandhi/Codefolio`, branch `master`.
2. Review `render.yaml`; create the `codefolio-meril` Web Service on the Free plan in Singapore.
3. Before the service starts, add the required secrets in the Render service's Environment page as described below.
4. Add the Render service's outbound network access in Atlas and verify Atlas allows the host to connect.
5. Wait for the deploy and open `https://codefolio-meril.onrender.com/api/health`.

The tracked Blueprint sets `pnpm install --frozen-lockfile && pnpm build`, `pnpm start` and `/api/health`. Render supplies `PORT`; the app binds to `0.0.0.0` in production. Render terminates HTTPS and redirects inbound HTTP to HTTPS. `TRUST_PROXY=1` enables the single trusted proxy hop required for secure cookies and client-address limits.

## Secrets and settings

Keep secret values in Render's environment settings, never in the repository or chat.

| Name          | Value                                          |
| ------------- | ---------------------------------------------- |
| `NODE_ENV`    | `production`                                   |
| `APP_ORIGIN`  | `https://codefolio-meril.onrender.com`         |
| `TRUST_PROXY` | `1`                                            |
| `MONGODB_URI` | Atlas connection string, as a secret           |
| `SMTP_HOST`   | `smtp.resend.com`                              |
| `SMTP_PORT`   | `2587`                                         |
| `SMTP_USER`   | `resend`                                       |
| `SMTP_PASS`   | Resend API key, as a secret                    |
| `SMTP_FROM`   | A sender address allowed by the Resend account |

Resend requires sender verification for general delivery. Its onboarding sender is restricted to the verified account recipient; to receive messages at an arbitrary portfolio owner's address, verify a domain and set `SMTP_FROM` to an address on it. Do not send real portfolio contact messages until the sender and intended inbox have been checked.

## Atlas access

Add the Render service's outbound address to Atlas Network Access. Render Free does not provide a stable outbound IP, so it cannot be restricted to one fixed IP. A broad `0.0.0.0/0` rule exposes the database endpoint to connection attempts from anywhere; if you choose that for the internship demonstration, use a dedicated least-privilege database user and a strong secret held only in Render. A host with static egress or private networking is the stricter option.

## Deployed acceptance checks

After the HTTPS service is healthy:

1. `/api/health` returns `status: "ok"` and `database: "connected"`.
2. Registration, login, dashboard refresh and logout work with Secure cookies.
3. Profile, project, skill and template edits persist after a fresh login.
4. Both showcase URLs render their intended layouts anonymously.
5. A contact form message reaches the verified owner inbox using Resend SMTP.
6. A password-reset request reaches the registered account inbox; the one-use link updates the password and invalidates existing sessions.
7. Direct visits to `/dashboard`, `/forgot-password`, `/reset-password`, `/:username` and `/user/:username` work.
8. Desktop/mobile layouts and both color modes work.

Only after these checks pass should requirement L01 be marked verified. The two permanent showcase profiles and their public URLs complete L02.

## References

- [Render's first deploy](https://render.com/docs/your-first-deploy)
- [Render Free services and SMTP restrictions](https://render.com/docs/free)
- [Render health checks](https://render.com/docs/health-checks)
- [Resend SMTP configuration](https://resend.com/changelog/smtp-service)
- [Resend plans and free limits](https://resend.com/pricing)
- [MongoDB Atlas IP access lists](https://www.mongodb.com/docs/atlas/security/ip-access-list/)
