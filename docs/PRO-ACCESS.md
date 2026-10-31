# Pro badge and premium authorization

Locally verified on 2026-10-25. The existing `User.tier` field is the authority for Free/Pro status. The dashboard, both public layouts and saved/live previews display the Pro badge when the corresponding server-derived plan is Pro. No payment processing is required by the brief.

## What is implemented

- The shared tier helpers accept only the exact stored string `pro`. Missing, unknown or malformed values resolve to Free.
- The public serializer exposes only the boolean `isPro`; it does not expose the private tier field. Both layouts render the badge only when that public flag is exactly `true`.
- The dashboard displays its account plan and provides **Refresh plan**. This reads the authenticated plan endpoint and updates the displayed badge without discarding editor drafts. Saved/live previews refetch when the refreshed plan changes.
- `requireAccount` reads the current account from MongoDB on every authenticated request. `requirePro` then checks that account's stored tier. Request bodies, headers, query parameters and cached browser state do not grant premium access.
- The user-requested demo plan selector lets authenticated owners choose Free or Pro under **Dashboard → Plans**. It is explicitly labelled **Demo mode — no payment required**. Registration still defaults to Free and rejects privileged fields. The trusted operator CLI remains available.

## API behavior

| Request                                                       | Anonymous | Free account                         | Pro account                        |
| ------------------------------------------------------------- | --------- | ------------------------------------ | ---------------------------------- |
| `GET /api/plan`                                               | 401       | Free plan and badge capability false | Pro plan and badge capability true |
| `GET /api/pro/access`                                         | 401       | 403 `PRO_REQUIRED`                   | Authorized badge capability        |
| `PUT /api/plan` with a valid request marker and saved version | 401       | Select own Free/Pro demo plan        | Select own Free/Pro demo plan      |

Responses use `Cache-Control: no-store`. Database downtime returns 503. Account selectors and plan overrides are rejected. Registration now explicitly rejects unknown/privileged fields rather than silently ignoring them; its normal name/username/email/password flow is unchanged.

## Demo plan selection

This additional feature was explicitly requested by the user after the PDF milestones; payment processing remains outside scope. Both plans are available without charges or subscriptions. The UI uses native radio cards, React Hook Form and existing Tailwind light/dark tokens. Choose a plan and click **Save plan** to apply it; an unsaved selection does not change access.

`GET /api/plan` returns `{ plan, version, mode: 'demo' }`. `PUT /api/plan` accepts only `{ planId: 'free' | 'pro', version }`, with no query parameters or ownership selectors. Session/request-origin/JSON guards apply. The server atomically matches the session owner's `_id` and saved `__v`, updates only `tier`, increments `__v` and returns the resulting plan. Each accepted PUT advances the version, including an explicit same-plan PUT. The UI disables unchanged saves. Stale/concurrent writes return 409 and require reload; unsupported methods return 405 and malformed/extra fields return 400.

Saving updates the dashboard badge immediately. Subsequent public reads and premium requests use the stored tier. Free pauses the Pro badge and domain redirect, retaining portfolio content and the saved mapping. Pro restores access. Downgrade consequences appear before saving. Section/logout/page-leave guards protect unsaved choices; **Reload saved plan** requires discard confirmation when dirty.

Locally verified with **77 default tests**, the production build, and two temporary Atlas fixtures. Integration checks cover both directions, read/auth persistence, actual badge/domain access, retained settings/content, peer isolation, stale/concurrent writes, hostile origins and forged account fields. Browser checks cover selection/save, reload persistence, domain activation/restriction, downgrade messaging, dirty guards and conflict recovery. Eight light/dark measurements at 320/390/768/1440px have no horizontal overflow. The exact fixture accounts/sessions were removed; the real user's plan was not changed. Prettier checks pass.

`/api/pro/access` reports badge and custom-domain entitlements. The `/api/pro` router is the shared boundary for [domain settings and the redirect simulation](CUSTOM-DOMAINS.md). Domain writes additionally check stored Pro access in the atomic database mutation.

## Assigning a plan

Run these only from a trusted environment with the local MongoDB URI configured:

```sh
# Read-only preview; no tier or edit-version change.
npm run account:tier -- <username> pro

# Explicitly apply an operator-approved change.
npm run account:tier -- <username> pro --apply
npm run account:tier -- <username> free --apply
```

The command validates its username, tier and flags, resolves that exact account, then performs a version-checked atomic update. Applying a different tier increments `__v`, preserving the existing stale-edit protections. It changes neither portfolio content nor other accounts. Reapplying the current tier is a no-op. Credentials and private email addresses are not logged.

After assignment, use **Refresh plan** or reload/sign in to update the dashboard. Public reads reflect the saved tier on their next request. Upgrades and downgrades affect API authorization in an existing session because account roles are not embedded in the session token. An editor opened before a plan change may require its existing reload/conflict recovery before saving; this prevents it from overwriting a newer account version.

Do not expose this operator command through a public route or accept raw account/tier overrides. The demo selection API uses its own strict plan-ID allowlist and authenticated ownership. Neither mechanism verifies payments.

## Verification evidence

- All **70 default tests** pass. Six plan groups cover strict tier normalization, account/public serializer agreement, badge capability flags, forged client values, authentication/database/cache behavior, registration privilege overrides and malformed operator input.
- The production build and all **three renderer verification groups** pass. Both layouts show a badge only for `isPro === true`, including checks against false, missing, string and numeric flags. Formatting checks pass.
- Two Atlas fixtures, one Free and one Pro, verified authenticated plan reads, the Pro guard, public badge flags, invalid sessions and forged headers/selectors. The subsequent demo selection checks above replace the original read-only HTTP plan rule.
- Real operator subprocesses verified read-only dry-run, upgrade and downgrade. The same session gained and lost premium API access immediately. Public flags and `/api/auth/me` reflected the change. Content, account identity and the peer account were preserved; the edit version increased exactly once per applied change, and an old template save returned 409.
- Seventeen browser measurements cover Free/Pro dashboards, both public layouts, light/dark modes and 320/390px mobile plus desktop widths. Badge counts match the stored tier and measured pages have no horizontal overflow.
- Refreshing after promotion/demotion preserved an unsaved biography. The optional live preview gained and lost its badge alongside the dashboard, and returning to the editor retained the draft. No draft was saved during these checks.
- Exactly the two generated accounts and their sessions were removed by their generated IDs, with zero remaining counts confirmed. The QA server stopped. The existing user's dashboard session and account tier were preserved.

## Repeating the checks

```sh
npm test
npm run verify:rendering
npm run build
npm run verify:plans
```

`verify:plans` uses the configured Atlas database, creates exactly two temporary accounts and their test sessions, runs the integration/CLI checks and removes them. For browser review, `npm run qa:plans` holds those same fixtures and serves the current build with isolated test cookies and external email sending disabled.

The ignored `.polish-qa-control` file accepts `plan-promote-a`, `plan-demote-a`, `plan-promote-b`, `plan-demote-b` and the existing visual-fixture commands. Wait for `PLAN_READY`, then refresh the plan or public page. Finish with `cleanup` so the helper verifies record removal and exits. Ctrl+C also triggers cleanup.

On 2026-10-31, a production smoke check upgraded the signed-in `@meril2203` account from Free to Pro, confirmed the Pro badge and custom-domain settings appeared, then restored Free. No payment was made. The domain redirect was separately tested with a temporary reserved `example.com` hostname and the domain was removed afterward. See [domain workflow and checks](CUSTOM-DOMAINS.md).
