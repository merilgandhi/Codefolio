# Portfolio metadata with React Helmet

The public `/:username` page uses the saved profile name for its document title and the saved bio for its meta description. The same metadata is present in the initial Express HTML response and maintained during React Router navigation. Both portfolio layouts share this behavior.

## React 19 compatibility decision

The brief names React Helmet. This project uses **`react-helmet-async@3.0.0`**, the React Helmet fork with React 19 support and the same `<Helmet>` interface. Registry metadata checked on 2026-10-24 showed that `react-helmet@6.1.0` depends on `react-side-effect@2.1.2`, whose React peer range ends at React 18. The selected fork explicitly supports React 19, matching the installed React 19.3.1 without forcing incompatible peers or downgrading React.

In React 19, the fork renders native metadata elements and React moves them into the document head. Its older server-context extraction API is unnecessary for this version. See the [official React 19 compatibility documentation](https://github.com/staylor/react-helmet-async#react-19) and [original React Helmet repository](https://github.com/nfl/react-helmet).

This is the documented resolution of requirement-tracker scope decision 8. React Helmet's metadata component is used on both the server and client; the Express `helmet` package remains a separate HTTP security middleware.

## Metadata rules

| Page or value                           | Behavior                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Public portfolio                        | `<name> \| Developer Portfolio`; saved bio supplies the description; `index, follow`             |
| Empty or whitespace-only bio            | `Explore <name>'s projects, skills and development work.`                                        |
| Missing display name in defensive input | Fall back to username, then `Developer`                                                          |
| Long bio                                | Collapse whitespace and limit the description to 160 Unicode code points, including the ellipsis |
| Long name                               | Limit the name portion of the title to 80 Unicode code points                                    |
| Home                                    | CodeFolio title and generic product description                                                  |
| Dashboard, sign-in and registration     | Route-specific title, generic workspace description and `noindex, nofollow`                      |
| Loading public data                     | Generic loading metadata and `noindex, nofollow`                                                 |
| Missing or unavailable public portfolio | Generic error metadata and `noindex, nofollow`; never retain another user's bio                  |

The 160-character description rule is an application presentation limit, not a guarantee about search-result snippets. The database keeps the full saved bio. The server uses the existing public-data allowlist; private account email, account ID, password hash and sessions are not metadata sources. React escapes text and attribute values, including hostile markup.

## Implementation

- `shared/seo.js` defines the pure metadata rules.
- `shared/MetadataHead.js` is the shared `<Helmet>` component.
- `server/seo.js` renders that component into the trusted frontend document, replacing old title, description and robots tags.
- The explicit public document handler looks up the saved portfolio before constructing its initial head. Production account documents also receive their route metadata.
- `src/main.jsx` removes marked server/static metadata once before mounting React. `SeoProvider` owns one client metadata component, avoiding duplicate tags.
- Public pages publish loaded/error metadata through the provider. Publication is tied to the current pathname and navigation key, preventing late updates from an earlier page from replacing the current page's metadata.
- A matching public-data bootstrap supplies metadata on initial rendering. Client visits without that bootstrap use loading metadata while the public API request completes.

The dashboard's unsaved editor preview does not publish draft metadata. Public metadata changes after a successful save and a fresh public read. No dashboard styling, layout, database schema or saved owner content was changed for this milestone.

## Verification on 2026-10-24

- All **52 default tests** pass. Five SEO groups cover normalization, fallbacks, Unicode truncation, private/error-route rules, escaped Helmet output, replacement without duplicates, idempotent document rendering and independent initial HTML for two profiles.
- `npm run verify:seo -- --browser` passed its three integration groups against real Atlas records. Distinct Bento and Split-Screen profiles returned correct initial metadata through both production Express and the Vite document proxy. Production JavaScript assets loaded. Private account data was absent.
- Actual owner API saves changed the first profile's public metadata, including clearing and restoring its bio. The other profile remained independent. Missing profiles returned 404, simulated database downtime returned 503, and both error documents used non-indexable metadata. Account documents and the canonical alias passed.
- Fifteen browser metadata assertions checked both saved profiles, home, account pages, dashboard, Back/Forward restoration, missing/unavailable pages, recovery after availability returned, and the empty-bio fallback. Each asserted page had exactly one title, description and robots tag. Browser error logs were empty.
- The two temporary SEO accounts and their sessions were removed by their exact generated IDs; cleanup counts were zero. The temporary QA server stopped. The existing user's saved data and session were preserved.
- The production build succeeded at this milestone. Its main-chunk warning was subsequently resolved during [performance polish](RESPONSIVE-ACCESSIBILITY.md) by ensuring release builds use production React.

## Re-run

With the local Atlas URI configured, build the app and keep `npm run dev` running, then execute:

```sh
npm test
npm run build
npm run verify:seo
```

The opt-in integration command creates exactly two temporary accounts and removes them and their sessions afterward. `--browser` keeps those same fixtures and a local production QA server available for manual browser checks. Its console prints public test URLs. The ignored `.seo-qa-control` file accepts `unavailable`, `available`, `empty-bio`, `restore-bio` and `cleanup`; wait for the matching ready message before checking the page. Send `cleanup` when done so the process verifies record removal and exits. Connection strings and credentials are not logged.

## Remaining limits

Portfolio body markup is rendered by the client; the initial document contains the metadata and public-data bootstrap. This milestone does not add full body server rendering, social preview images, sitemap generation or a canonical-domain policy. Metadata does not guarantee search rankings or actual indexing. Deployed HTTPS responses and crawler behavior still need verification after deployment. The subsequent local [responsive, accessibility and image-loading review](RESPONSIVE-ACCESSIBILITY.md) is complete.
