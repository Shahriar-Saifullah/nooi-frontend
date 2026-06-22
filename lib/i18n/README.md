# i18n — Translation scope notes

## Source

`NOOI_English_Arabic__Translation.docx`, provided by the client, covers 5 pages:
Home (`/`), About (`/about`), Marketplace (`/marketplace`), Home Planner
(`/homeplanner`), Design Studio (`/design-studio`).

**Only the Home page is wired up so far** (`homeTranslations` in `translations.ts`).
The other 4 pages are translated in the source docx but not yet converted into
this dictionary format or connected to their page components.

**Not covered by the client's docx at all:** the authenticated app screens —
`/dashboard`, `/canvas`, the project-creation modal, etc. These remain
English-only. The language toggle exists in the dashboard's profile dropdown
(per the original request) but only affects pages that have translations
available; the dashboard UI itself doesn't change language yet.

## One known gap inside the Home page translation

The client's docx only gave detailed English/Arabic copy for **Step 1** of the
"How it Works" section. Steps 2–4 didn't have client-provided translations, so
`step2`/`step3`/`step4` Arabic strings in `translations.ts` were written by
Claude as placeholders — not verified by the client. These are clearly
reachable as the only entries without a docx source; double check them before
treating this as a finished translation, or send the client these 3 steps to
translate properly.

## Extending to other pages

To add a new page:
1. Pull its section from the docx (`extract-text NOOI_English_Arabic__Translation.docx`)
2. Add a new top-level key to a new `xTranslations` object (or extend this
   file), following the same `{ en: "...", ar: "..." }` leaf-node pattern
3. Import the relevant `useT()` calls (or however the hook ends up being
   structured) into that page's component, replacing hardcoded strings the
   same way it was done in `page.tsx` for Home

## RTL

Per product decision: only text direction/alignment flips for Arabic — the
overall page layout (nav item order, icon positions, etc.) stays left-to-right
structured. This is simpler than a full RTL mirror but means some visual
elements (e.g. arrows pointing right for "next") may look slightly odd in
Arabic mode. Revisit if that becomes a real complaint.