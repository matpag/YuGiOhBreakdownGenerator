# Breakdown Generator

- React, TypeScript, Vite and Konva. Deployment branch: `main`; Vite base: `/YuGiOhBreakdownGenerator/`.
- Read the Retroformats handoff in `README.md`. Continue from this repository's current branch, not the portal's temporary `.local/worktrees/` copies.
- Probability Calculator is the interface style reference. Keep `public/retroformats/retroformats.css` and `retroformats-mark.svg` identical to the canonical `design-system/` files in the sibling Retroformats portal workspace. Put app-specific styles in `src/styles.css`.
- Preserve the existing Light/Dark modes. Coral selection overlays apply only in Dark; Light retains its original palette. Interface styling must not change PNG document colors, fonts or chart geometry.
- Preserve `.dhbreakdown` compatibility, embedded assets/fonts and preview/export behavior. The current editor has a 1180px minimum width.
- Verify meaningful code changes with `npm run build` and relevant browser flows. For visual changes compare both themes, keyboard navigation and an exported PNG. Shared kit verification commands and evidence are in the portal's `scripts/README.md` and `docs/visual-alignment-verification.md`.
- Never commit credentials, dependency directories, generated build files or browser evidence.
- The entire interface supports `en`, `it`, `de`, `es`, `fr` via `src/i18n/` and React context. Keep dictionaries complete with matching placeholders; render UI translations through `useI18n`, never by rewriting DOM text after render. Keep user/project data, font names, archive fields and generated PNG content untranslated.
- Shared language contract: valid URL `ui_lang` > valid localStorage `retroformats-ui-language` > first supported `navigator.languages` entry > `en`. Guard storage reads/writes. Manual changes replace only `ui_lang` in the current URL and propagate it through suite links while preserving other query/hash values. Keep `.rf-language-control`, `.rf-language-select` and `data-ui-language-select` on the header selector.
- For i18n changes run `npm run test:i18n`, `npm run build` and browser checks for switching, persistence, dialogs/errors, project/theme preservation and PNG equality. Native browser chrome is outside the app's dictionaries.
