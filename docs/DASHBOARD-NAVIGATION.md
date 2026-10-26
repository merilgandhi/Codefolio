# Dashboard sidebar and header

The user-requested navigation update is locally verified on 2026-10-26.

- The desktop sidebar starts with **Dashboard**, opening the [Launchpad overview](DASHBOARD-HOME.md), followed by **Profile**, **Projects**, **Skills**, **Templates**, **Portfolio preview** and **Custom domain**. Icons and current-section states identify the active page. Existing `/dashboard?section=...` links and the legacy `split-preview` route remain supported; `/dashboard` itself now opens the overview.
- Plans is accessed from the header: **Upgrade to Pro** for Free accounts, **Manage plan** for Pro. Both open the existing demo selector and protect unsaved edits before switching. The header retains appearance and public-portfolio controls.
- Account details, current tier, Refresh plan and Sign out appear below the sidebar navigation. The desktop sidebar has its own overflow scrolling on short screens, while the main editor scrolls normally.
- Below 1024px, **Workspace menu** expands navigation in the page. Selecting a section closes it; Escape closes it and returns focus to the toggle. The header plan button remains available with the menu collapsed.
- Existing editor drafts, Save actions and optional live preview are preserved. Navigation/sign-out prompts receive focus; mobile sign-out closes the menu before displaying the prompt. The main editor has a compact heading and description for the selected section.
- Styling uses existing Tailwind utilities and semantic light/dark tokens. No dependency, API, model, plan entitlement or public template was changed.

## Verification

The production build and Prettier check pass. Browser review with authorized disposable Atlas accounts covered all six sidebar destinations, header-to-Plans navigation, Free/Pro header labels, unchanged editor content, dirty sidebar/header/sign-out guards and the optional preview showing an unsaved biography.

Ten measurements cover 320/390/768/1024/1440px widths in both modes, without horizontal overflow. Mobile navigation, automatic collapse after selection, Escape, dirty sign-out focus, and the longer Free Upgrade label at 320px were checked. Desktop light and mobile dark screenshots were reviewed. Test-only plan changes affected only one fixture; exactly the two generated accounts and their sessions were removed, and the helper stopped. The real user's plan, portfolio and session were preserved.

This changes dashboard navigation only. The remaining GitHub, deployment, showcase-profile and final deployed-audit tasks are unchanged.
