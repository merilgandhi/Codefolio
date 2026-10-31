# Split-Screen Engineer: second portfolio layout

Implemented on 2026-10-22 following the user's selected layout pair. This is a second presentation component using the same portfolio data contract as Bento Developer.

## Try it

Run `npm run dev` or `pnpm dev`, sign in, then open **Templates**, select **Split-Screen Engineer**, and **Save template**. **Portfolio preview** at `?section=preview` follows the saved choice. The old direct local URL `http://127.0.0.1:5174/dashboard?section=split-preview` remains an explicit preview override.

Both layouts preview saved content. **Refresh preview** explicitly reloads saved data. Selecting a radio option changes the draft layout preview; **Save template** persists the choice. See `TEMPLATE-SELECTION.md` for the API, registry, compatibility and verification details.

## Presentation

- On wide containers, a sticky profile panel sits beside an editorial project list and categorized skills. Container queries make the layout depend on available space, including inside the dashboard.
- The profile panel includes the saved name, username, full biography, section navigation, optional resume, and social links. It has a viewport-height limit and independent scrolling for long content. Keyboard navigation can reach every link. The panel stops at the end of the portfolio.
- Small containers use a single column and normal document scrolling, with no sticky panel or fixed-height restriction.
- Each project displays its title, full description, optional screenshot, technology tags, source link and live-demo link. Missing screenshots are omitted; broken screenshots have an explicit fallback with reserved space.
- Skills retain the Frontend, Backend and DevOps categories and every saved tag. Empty sections have clear states and no invented experience, metrics or project content.
- All styling uses Tailwind utilities, existing light/dark semantic colors, visible keyboard focus and reduced-motion-aware transitions.
- External links use validated HTTP(S) URLs and `noopener noreferrer`, with descriptive labels and an accessible new-tab indication. Private account email is excluded from the template data.

`src/portfolio/templates/SplitScreenEngineer.jsx` contains the layout. `src/portfolio/components/SplitProject.jsx` contains the editorial project entry. Both layouts use `src/dashboard/PortfolioPreview.jsx` for authentication-aware loading, errors and refresh; presentation components do not fetch data or depend on the account context.

## Verification

- Production frontend build passes after temporary visual fixtures are removed.
- Existing signed-in owner's saved name, biography, resume and social link display in both previews. Switching back and forth and loading the second preview directly work. The real account's empty project/skill state renders correctly. No saved account data was edited.
- Clearly labelled, local-only sample data exercises every project field, optional links, all three skill groups, a loaded screenshot, an absent screenshot and a broken screenshot. The same sample renders in both layouts. Sample data was not stored in Atlas; its temporary route, source and SVG were removed after checks.
- Desktop verification at 1280px confirms a sticky panel. After document scrolling, the panel stays at 32px from the viewport top while the work content moves. Long profiles remain reachable by internal scrolling and keyboard focus.
- Mobile verification at 390px confirms single-column, static-panel behavior and no horizontal overflow in light and dark modes. Empty content and maximum lengths (100-character name, 2000-character biography, 3000-character project description, 20 technology tags, all 120 skills and 10 social links) also fit without horizontal overflow. Desktop maximum-length content passes too.
- Section links target existing unique IDs; screenshots load or fall back correctly; outbound-link attributes pass inspection; browser logs show no errors or warnings.
- Backend behavior and the data schema were unchanged. Prior 32-test backend and Atlas preview checks remain recorded in `BENTO-DEVELOPER.md`; they were not rerun for this presentation-only step.

## Scope boundary

This milestone covers the Split-Screen Engineer layout. Template selection, public username URLs, metadata, live preview and remaining internship deliverables are documented in their own implementation notes and in `REQUIREMENTS.md`.
