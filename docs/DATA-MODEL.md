# User and portfolio data

The `User` MongoDB document embeds profile, projects and categorized skills. A single-user portfolio can be saved atomically, and templates consume one consistent public data shape. `templateId` stays directly on User, as the internship brief requires.

The optional `customDomain` field stores one canonical ASCII/punycode hostname, with a unique partial index for configured string values. Owner-only Pro settings use version-checked atomic updates; removal unsets the field. Public portfolio and authentication serializers omit it. See [custom-domain simulation](CUSTOM-DOMAINS.md) for hostname rules, tier enforcement and redirect behavior.

## Fields

| Field                                    | Storage and constraints                                                                                                                                                                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| username                                 | Required, normalized lowercase, 3–30 characters; letters/numbers with internal hyphens/underscores; reserved app paths blocked; unique database index                                                                                                               |
| email                                    | Required, normalized lowercase, basic syntax validation, unique database index, excluded from default queries and JSON                                                                                                                                              |
| passwordHash                             | Required private hash storage; excluded from default queries and JSON; asynchronous scrypt hashing and verification implemented in server/auth/passwords.js                                                                                                         |
| tier                                     | `free` or `pro`, default `free`; demo selection validates plan ID, session ownership and saved version; raw tier overrides are rejected                                                                                                                             |
| templateId                               | Canonical `bento` or `split-screen`, default `bento`; legacy `minimalist`/`cyberpunk` remain valid in stored records and resolve to the new IDs without read-time writes. Shared rules live in `shared/portfolio.js`; template API saves accept only canonical IDs. |
| profile.name                             | Required, maximum 100 characters                                                                                                                                                                                                                                    |
| profile.bio                              | Optional, maximum 2000 characters                                                                                                                                                                                                                                   |
| profile.socialLinks                      | Up to 10 labeled absolute HTTP/HTTPS links                                                                                                                                                                                                                          |
| profile.resumeUrl                        | Optional absolute HTTP/HTTPS URL                                                                                                                                                                                                                                    |
| projects                                 | Up to 50 embedded projects, each with a stable MongoDB subdocument ID                                                                                                                                                                                               |
| project.title / description              | Required; maximum 120 / 3000 characters                                                                                                                                                                                                                             |
| project.techStack                        | Array of up to 20 distinct, nonempty tags                                                                                                                                                                                                                           |
| project.repoLink / liveLink / screenshot | Optional absolute HTTP/HTTPS URLs                                                                                                                                                                                                                                   |
| skills                                   | Frontend, Backend and DevOps arrays, each up to 40 distinct, nonempty tags                                                                                                                                                                                          |
| createdAt / updatedAt                    | Mongoose timestamps                                                                                                                                                                                                                                                 |

Each tag has a 50-character limit. Links are limited to 2048 characters and reject credentials, executable schemes, relative URLs, spaces and backslashes. These limits are implementation decisions for predictable forms and bounded records, not numeric requirements from the PDF. Optional sections can start empty; supplied projects require meaningful titles and descriptions. Image and resume uploading is outside this milestone; the brief's required URL support is represented.

## Privacy and write boundaries

- All public routes must use `toPublicPortfolio()`, an explicit allowlist supporting documents and lean query results. Never return an entire User record. A user's intentionally supplied public social links/bio are public content; the private account email is never automatically included.
- The serializer exposes `isPro` for the badge without exposing private account fields.
- `select: false` and the JSON transform are additional protections, not replacements for the public allowlist.
- The registration handler hashes passwords before saving using asynchronous scrypt. A length check on passwordHash alone does not establish secure hashing.
- Future update handlers must allowlist editable fields and protect `tier`, email, passwordHash and ownership. Strict schemas alone do not prevent privilege escalation.
- Prefer loading the owned document, assigning allowed values and calling `save()` so nested validation and optimistic concurrency apply. Any query update must explicitly enable validation and account for its limitations.
- Uniqueness requires actual MongoDB indexes. Await model index initialization in setup/integration tests and handle MongoDB duplicate-key errors; `validate()` does not check uniqueness. See [Mongoose validation](https://mongoosejs.com/docs/validation.html).
- Template validation prevents new invalid selections; the future template renderer still needs the brief's default fallback for legacy/unknown data.

## Atlas setup and verification status

The user selected MongoDB Atlas. Copy `.env.example` to `.env` and set `MONGODB_URI` there, never in a chat, frontend environment variable, tracked document or source file. Configure Atlas database-user access and network access for the development machine as needed. Do not commit credentials.

Model tests run without a database. They verify normalization, nested data, validation, defaults, stable IDs across in-memory rehydration, and public serialization. They do **not** prove database persistence, unique-index enforcement, authentication, or endpoint privacy.

Real Atlas checks passed on 2026-10-21: connection/ping, index creation/inspection, complete required-field create/read/update, read in a separate Node process, normalized username/email duplicate rejection, default private-field exclusions, and optimistic concurrency. All temporary records were removed.

Run `pnpm verify:db` to repeat this opt-in integration verification against the database configured in `.env`. It writes temporary test records, adds declared indexes without dropping existing indexes, and removes only IDs allocated by that run. Do not point it at an unrelated database. Credentials and raw driver errors are never printed. The default `pnpm test` suite does not contact Atlas.

The user journey must still demonstrate dashboard save, refresh, logout/login and server restart persistence after authentication/forms exist.
