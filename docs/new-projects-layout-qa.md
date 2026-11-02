# New portfolio entries: layout correction

Date: 2026-11-02

User feedback: the two newly added entries feel visually abrupt.

## Current-site audit

1. Work grid — original four cards retain a staggered two-column rhythm. Desktop Tides was a fifth card with an empty right-hand column. This creates an unfinished final row.
2. Drawings entry — separately placed below the grid with a 100px gap, horizontal composition, large h2, light frame and divider rules. Its hierarchy differs substantially from the existing project cards.
3. Navigation — existing game details, playable game/Windows download and independent drawing gallery all have valid distinct destinations; preserve those behaviors.

Current-run accepted browser evidence:
- /workspace/scratch/candice-new-projects-before-20261102.jpg
- /workspace/scratch/candice-new-projects-layout-before-20261102.jpg

## Correction

Placed Drawings as the sixth card in the existing Work grid. It uses the same image container, numbering, h3, caption, arrow, hover, reveal and pointer interaction as the case studies. Original staggered offsets remain. The collection uses a dark matte and object-fit contain; original image bytes are unchanged. Spiral and list drawing mattes use the same dark neutral. Work index counts six entries; project detail dialogs correctly retain five case studies.

No edits to original project content, game code, download target, gallery page, opening animation or sound engine.

## Verification

- Production build and TypeScript compilation passed.
- Independent source review found valid nesting and intact links/modifier-click behavior.
- Desktop 1363x936: two entries fill the third row and match the earlier cards; full image fitting retained for drawings.
- Responsive frame 390x844 (375px content width with scrollbar): single-column cards all330px wide; document scrollWidth equals clientWidth; Chinese labels and focus visible.
- Desktop collection click opened /drawings/?lang=en.
- Mobile game card opened Chinese details, displayed project05/05, online game and Windows download links; Escape restored focus and #work.
- Console: no app warnings/errors; browser extension metadata messages excluded.
- Font, black/green palette and existing spacing tokens reused; new image color differences reflect original works rather than new UI styles.
- Browser checks cover Chrome responsive widths, not physical iOS/Android devices or full accessibility certification. Game/download internals were not retested because unchanged.

Post-fix evidence:
- /workspace/scratch/candice-new-projects-after-20261102.jpg
- /workspace/scratch/candice-new-projects-mobile-20261102.jpg

Result: passed. No remaining blocking issue within this correction.
