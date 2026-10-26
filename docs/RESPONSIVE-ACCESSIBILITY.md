# Responsive, accessibility and image-loading review

Locally verified on 2026-10-24 against the compiled application, using two temporary Atlas accounts and the in-app Chromium browser. This review completes the current polish milestone and requirement P01. Final deployed verification remains part of the submission review.

## Fixes

- Added a keyboard-visible **Skip to main content** link and a focusable main landmark across the homepage, account forms, dashboard, public pages, route fallbacks and session-loading/error states. The focused link has a visible outline and a 44px minimum height; activating it moves focus to the main content.
- Fixed the skills editor's native fieldset minimum width. Maximum-length tags previously forced the 320px page to scroll horizontally. Tailwind `min-w-0` lets the editor fit its available width.
- Added inherited wrapping for long unbroken text and explicit screenshot dimensions in the dashboard project list. Existing public screenshot frames, alt text, asynchronous decoding, first-image eager loading, later-image lazy loading and broken-image fallbacks are retained.
- Moved the existing Google Fonts stylesheet out of a CSS import into the document head and added font-origin preconnect hints. The font request retains `display=swap`.
- Fixed release builds that inherited `NODE_ENV=development` from the local environment file. The cross-platform Node launcher sets production mode for the Vite child process. Development commands and the backend's environment selection keep their existing behavior.

All appearance changes use Tailwind utilities or shared theme tokens. The original dashboard and optional live-preview behavior remain in place. No existing owner's saved portfolio data was edited.

## Responsive and keyboard checks

The saved browser evidence contains 48 successful measurements, including:

- Complete content in both layouts and both color modes at **320, 390, 768 and 1440 CSS pixels**.
- Long and empty content in both layouts and both modes at 320/1440px, with additional long-content checks at 390/768px. Long fixtures use a 100-character unbroken name, 2,000-character bio, 120-character project titles, 3,000-character descriptions, 20 technology tags, 10 social links and 40 skills per category.
- No horizontal page overflow in the final measured cases. Public pages have one main landmark and one top-level heading. Embedded live preview preserves the dashboard's heading hierarchy.
- Split-Screen's profile is sticky on desktop and stacks normally on mobile. With a long desktop profile, keyboard navigation reaches links inside its scrolling panel; the measured panel was 836px tall with 2,232px of content.
- Keyboard Tab reaches the skip link, its outline is visible, and Enter places focus on `main-content`.
- Account input labels are associated with their fields. Empty sign-in submission announces errors, sets `aria-invalid` and links fields to error descriptions; focus moves to the email field.
- Profile, project, skill and template editors fit the narrow viewport. The optional mobile live preview opens and returns to the mounted editor. The preview remains closed on a fresh dashboard visit.

These checks follow the intent of W3C's [reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) and [bypass-blocks guidance](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html). They are targeted checks, not a complete assistive-technology or cross-browser conformance audit.

## Contrast

The seven semantic text colors (`ink`, `muted`, `quiet`, `label`, `accent`, `success`, `danger`) were checked against five shared surfaces (`canvas`, `panel`, `field`, `soft`, `subtle`) in both palettes, using unrounded ratios for pass/fail. All 70 combinations meet 4.5:1. The minimum ratios round to **4.50:1 light** and **5.69:1 dark**; action-button text is **6.01:1 light** and **7.65:1 dark**. A computed-style sample on the actual dark public page also passed for 40 text pairs.

The threshold comes from W3C's [Contrast (Minimum) guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). User-supplied screenshot contents are not covered by the interface color checks.

## Image checks

- A valid 1200×750 test image renders in both public layouts. A failed URL produces **Screenshot unavailable**; an absent screenshot has the appropriate layout-specific empty state.
- Later images use native lazy loading. One deferred Bento image had zero natural width before it was reached and loaded successfully during keyboard navigation to its project links.
- Images have meaningful alt text, explicit intrinsic dimensions, asynchronous decoding and a no-referrer policy. Existing external links retain their accessible new-tab descriptions and safe `rel` attributes.
- Delayed-image checks measured identical frame dimensions before and after loading: Bento **300×187.5px**, Split-Screen approximately **628.36×353.45px**. This verifies those frames retain their geometry; it is not a page-wide Core Web Vitals score.

The app accepts a single user-provided screenshot URL. It does not generate resized files or responsive `srcset` variants. Source-image compression and reliable external hosting remain the profile owner's responsibility; a future image service would be separate scope.

## Build and regression evidence

- All **52 default tests** and both renderer verification groups pass.
- The production build succeeds without the earlier 500kB chunk warning. Main JavaScript decreased from **513.25kB to 298.85kB**, approximately 42%; gzip decreased from **157.45kB to 95.31kB**.
- An analysis build's source maps confirmed production React and excluded its development runtimes. The final normal build does not emit source maps. Vite documents the distinction between build mode and `NODE_ENV` in its [environment guide](https://vite.dev/guide/env-and-mode).
- Prettier formatting checks pass. Browser screenshots were visually reviewed on desktop and mobile. Final browser error logs were empty.
- Both temporary accounts and their sessions were removed by exact generated IDs, with zero remaining counts. The QA server stopped. The existing owner's authenticated dashboard still opens, with its live preview closed by default.

## Repeating the manual review

Configure the local Atlas URI and build the app, then run:

```sh
npm run build
npm run qa:polish
```

The helper prints two public test URLs and disposable fixture credentials. It uses loopback, serves built assets and isolates its browser session cookie from the normal app session. The ignored `.polish-qa-control` file accepts `complete`, `empty`, `long`, `slow`, `images-ready` and `cleanup`. Wait for the matching `POLISH_READY` message before refreshing. `slow` holds the first screenshot request; `images-ready` releases it. Send `cleanup` when finished so the helper removes only its generated accounts and sessions, checks zero counts and exits. Ctrl+C also triggers cleanup. The helper's local cookies are development cookies; deployed HTTPS cookie behavior needs the later deployment check.

The subsequent [Nodemailer contact milestone](CONTACT-EMAIL.md) and [Pro access/badge milestone](PRO-ACCESS.md) are verified locally. Remaining work: the permitted domain feature, GitHub publication, deployment, permanent showcase profiles and the final PDF/deployed-workflow review.
