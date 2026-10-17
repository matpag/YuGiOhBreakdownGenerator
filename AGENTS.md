# Breakdown Generator

- React, TypeScript, Vite and Konva. Deployment branch: `main`; Vite base: `/YuGiOhBreakdownGenerator/`.
- Read the Retroformats handoff in `README.md`. Continue from this repository's current branch, not the portal's temporary `.local/worktrees/` copies.
- Probability Calculator is the interface style reference. Keep `public/retroformats/retroformats.css` and `retroformats-mark.svg` identical to the canonical `design-system/` files in the sibling Retroformats portal workspace. Put app-specific styles in `src/styles.css`.
- Preserve the existing Light/Dark modes. Coral selection overlays apply only in Dark; Light retains its original palette. Interface styling must not change PNG document colors, fonts or chart geometry.
- Preserve `.dhbreakdown` compatibility, embedded assets/fonts and preview/export behavior. The current editor has a 1180px minimum width.
- Verify meaningful code changes with `npm run build` and relevant browser flows. For visual changes compare both themes, keyboard navigation and an exported PNG. Shared kit verification commands and evidence are in the portal's `scripts/README.md` and `docs/visual-alignment-verification.md`.
- Never commit credentials, dependency directories, generated build files or browser evidence.
