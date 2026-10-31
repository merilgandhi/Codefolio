# Production deployment

CodeFolio is prepared for a single-service Koyeb deployment. Express serves the compiled React application and every `/api` route from the same HTTPS origin, so the existing session, origin and request protections continue to work without CORS changes.

This document contains configuration names only. Keep the MongoDB URI, SMTP password and other credentials in Koyeb Secrets. Never paste them into source files, build commands or deployment logs.

## Why Koyeb

The free Koyeb web instance supports Node.js, GitHub deployments, managed TLS and outbound SMTP on port 587. Render's current free web service blocks SMTP ports, so it cannot run the existing Gmail/Nodemailer delivery path without changing the email provider or using a paid instance.

The free instance can scale to zero after inactivity, so the first visit after a quiet period can take longer. It is appropriate for the internship demonstration, not a high-availability production service.

## Repository settings

Create one Web Service from `merilgandhi/Codefolio` using the `master` branch and the Node.js buildpack.

| Setting       | Value                                                 |
| ------------- | ----------------------------------------------------- |
| Instance      | Free                                                  |
| Region        | Frankfurt or Washington, D.C.                         |
| Build command | `pnpm build`                                          |
| Run command   | Leave blank; the tracked `Procfile` runs `pnpm start` |
| Exposed port  | `8000` using HTTP, routed from `/`                    |
| Health check  | HTTP `GET /api/health`                                |

Koyeb supplies `PORT` from the exposed port. CodeFolio binds to `0.0.0.0` automatically when `NODE_ENV=production`; local development still binds to `127.0.0.1`.

## Environment variables and secrets

Configure these values in the service rather than uploading the local `.env` file:

| Name          | Value or source                                     |
| ------------- | --------------------------------------------------- |
| `NODE_ENV`    | `production`                                        |
| `APP_ORIGIN`  | `https://{{ KOYEB_PUBLIC_DOMAIN }}`                 |
| `TRUST_PROXY` | `1`                                                 |
| `MONGODB_URI` | Koyeb Secret containing the Atlas connection string |
| `SMTP_HOST`   | `smtp.gmail.com`                                    |
| `SMTP_PORT`   | `587`                                               |
| `SMTP_USER`   | Koyeb Secret containing the Gmail address           |
| `SMTP_PASS`   | Koyeb Secret containing the Gmail App Password      |
| `SMTP_FROM`   | Omit unless Gmail has approved a different sender   |

`TRUST_PROXY=1` matches the single Koyeb edge hop used to supply the client address. Koyeb terminates TLS at its edge and gives the app a public `.koyeb.app` HTTPS domain.

## Atlas network access

Koyeb does not publish a static outbound IP for this service. Atlas accepts connections only from its project IP access list, so a free Koyeb deployment cannot be restricted to one stable Koyeb address.

For the internship demonstration, the practical option is an Atlas `0.0.0.0/0` entry paired with a dedicated least-privilege database user and a new strong password used only by this app. MongoDB warns that this CIDR permits connections from anywhere; use the database credentials as Koyeb Secrets and rotate them if they have ever been shared. A paid host with static egress or private networking is the stricter long-term option.

## Deployment acceptance check

After Koyeb reports the deployment healthy, verify the generated HTTPS URL in this order:

1. `/api/health` returns `status: "ok"` and `database: "connected"`.
2. Registration, login, dashboard refresh and logout work with Secure cookies.
3. Profile, project, skill and template edits persist after a fresh login.
4. Both permanent showcase URLs render the intended layouts anonymously.
5. One explicitly approved contact-form message reaches the correct owner inbox.
6. Direct visits to `/dashboard`, `/:username` and `/user/:username` behave correctly.
7. Desktop and mobile views work in both light and dark modes.

Only after these checks pass should requirement L01 be marked verified. The permanent showcase profiles and their two public URLs complete L02 separately.

## References

- [Koyeb Express deployment](https://www.koyeb.com/docs/deploy/express)
- [Koyeb Node.js buildpack](https://www.koyeb.com/docs/build-and-deploy/build-from-git/nodejs)
- [Koyeb environment variables](https://www.koyeb.com/docs/build-and-deploy/environment-variables)
- [Koyeb outbound port policy](https://www.koyeb.com/docs/faqs/general)
- [MongoDB Atlas IP access lists](https://www.mongodb.com/docs/atlas/security/ip-access-list/)
