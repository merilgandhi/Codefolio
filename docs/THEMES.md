# Light and dark appearance

Added as an explicit user requirement, separate from the PDF's portfolio-template themes. This changes application appearance; it does not replace the requirement for two distinct portfolio layouts.

## Behavior

- Header toggle on the homepage, registration, sign-in and dashboard switches light/dark immediately.
- First visit follows `prefers-color-scheme`. Until a manual choice is made, device preference changes are followed automatically.
- Manual choice is stored under `codefolio-theme` in localStorage. Only `light` and `dark` values are accepted; unrecognized values fall back to the device preference.
- Same-origin open tabs synchronize through the storage event. Browser storage is per origin; `localhost` and `127.0.0.1` have independent preferences.
- If storage is blocked, switching remains available in memory. Persistence is not guaranteed in that case.
- A small blocking same-origin `public/theme-init.js` applies the theme before React starts, avoiding a light flash when dark was chosen. It uses no inline script, preserving compatibility with the server's CSP.
- The root color-scheme utility and theme-color metadata match the active appearance. Form controls, panels, text, borders, statuses and focus indicators use shared palette tokens.
- The toggle has a keyboard-operable button, action-specific accessible label, pressed state, tooltip and visible focus treatment. Its text label is hidden on small screens; the icon and accessible name remain.

## Tailwind structure

Light palette: `@theme` color tokens in `src/styles.css`. Dark palette: Tailwind custom-property utilities on the root in `index.html`, controlled by the `.dark` variant. React components use semantic Tailwind utilities; no custom component CSS selectors were introduced.

The current palette uses warm off-white surfaces, muted violet accents and charcoal dark surfaces. It follows the neutral-plus-accent approach illustrated by [Radix Colors](https://www.radix-ui.com/colors); the actual token values are customized for CodeFolio. Theme initialization and browser theme-color metadata use the same canvas values: `#f8f7fa` and `#141218`. The dashboard, authentication pages, homepage and portfolio renderers share these tokens so previews match their public pages.

Use `bg-canvas`, `bg-panel`, `bg-field`, `bg-soft`, `text-ink`, `text-muted`, `text-label`, `border-line`, `bg-action` and `text-action-ink` for future application components. Keep paired foreground/background tokens together for readable buttons and alerts. Screenshot images are not inverted.

References: [Tailwind dark mode](https://tailwindcss.com/docs/dark-mode).

## Verification

On 2026-10-22, production build passed. Browser checks verified light/dark switching on the dashboard, both choices surviving refresh, same-origin tab synchronization, device-default initialization on a separate origin, dark profile field styling, dark homepage/illustration styling, and themed account forms. Registration/sign-in headers and layouts were reviewed at 390px width. No account or portfolio data was changed during this task.

The browser preview verifies local rendering. A deployed production visit and storage-disabled/device-setting-change scenarios were not exercised; their paths are implemented with fallbacks/listeners. No backend logic changed, so existing Atlas verification was not repeated for this appearance-only task.
