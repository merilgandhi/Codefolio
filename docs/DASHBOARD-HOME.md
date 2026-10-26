# Launchpad dashboard home

Implemented from the user-selected Launchpad concept and locally verified on 2026-10-26.

## Entry and navigation

`/dashboard` now opens the overview, with **Dashboard** first in the sidebar. No profile, project, skills, template or plan form mounts on the initial screen. Existing explicit `?section=profile`, `projects`, `skills`, `templates`, `preview`, `split-preview`, `domains` and `plans` links retain their behavior. `?section=overview` also opens Launchpad; unrecognized sections fall back to it. Selecting Dashboard clears the section query.

The welcome heading, four setup steps, violet next-step panel, personal identity card and public-address footer follow the selected concept. Styling uses Tailwind utilities and existing light/dark tokens. Plan selection remains in the header; the sidebar keeps its existing mobile menu and dirty-navigation/sign-out protections.

## Real saved progress

The overview uses the existing authenticated `GET /api/portfolio/preview` endpoint, which derives ownership from the session and returns a noncached public-data allowlist. It adds no API, database field or write operation.

The four steps are ready when:

1. **Tell your story:** a saved name and nonblank biography exist.
2. **Add your work:** at least one saved project exists.
3. **Show your toolkit:** at least one saved skill exists across Frontend, Backend and DevOps.
4. **Make it yours:** a usable layout exists. Every account already has a default or saved layout, so this step starts ready; the page explicitly says the saved layout is included. Canonical, legacy and unknown IDs use the shared template rules.

The next-step panel targets the first incomplete step. All four buttons open their corresponding editors, even when already ready. Once all essentials exist, the panel offers **Preview your portfolio**. Completion describes setup essentials, not a portfolio quality score or proof of deployment.

Returning from an editor refetches the saved snapshot. **Refresh dashboard** can reload external changes. Drafts never count as saved progress; returning through an unsaved-change prompt still requires Keep editing or Discard and switch. Loading, retry and expired-session behavior follow the existing API/client patterns. The identity card shows the saved name/bio and the footer uses the account's actual canonical public path.

## Verification

- All **80 default tests** and the production build pass. Three new readiness groups cover a new account, progression/removal of essentials, canonical/legacy/fallback layouts and source immutability.
- Browser checks with exactly two authorized temporary Atlas accounts confirmed login/default entry without editor inputs, initial 1/4 readiness, and real profile/project/skills saves advancing 2/4, 3/4 and 4/4. Reload preserved saved progress.
- A saved template switch updated the displayed layout name, and the preview action opened that layout. Discarded biographies did not appear on the overview. The second account kept its independent empty setup state and different saved layout.
- Ten measurements cover both modes at 320/390/768/1024/1440px without horizontal overflow. Mobile Dashboard navigation closes the menu. Empty and completed states, desktop dark/light and mobile light screenshots were reviewed.
- Prettier checks pass. The two generated accounts and their sessions were removed by exact IDs, and the QA helper stopped. The existing user's content, tier and session were preserved.

Use `npm run qa:polish` for isolated browser review with the built frontend and external email disabled. Its `empty` and `complete` control modes support both setup states; finish with `cleanup` in the ignored `.polish-qa-control` file. GitHub publication, deployment, permanent showcase profiles and final deployed checks remain separate pending tasks.
