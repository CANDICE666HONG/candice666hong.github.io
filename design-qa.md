# Drawing gallery implementation QA

Date: 2026-10-28

## Findings and comparison history

- Resolved P1 — Fullscreen artwork fit: an implicit grid row used the image’s intrinsic height and overflowed the available viewer stage. Changed `.viewer-image-frame` to flex centering. Post-fix browser measurement: image 971 × 727 CSS px, no stage overflow; mobile image 366 × 274.2 with all toolbar controls visible. Evidence: `/workspace/scratch/candice-drawings-viewer-fixed.jpg`.
- Resolved P2 — Zoomed arrow keys: gallery pagination intercepted horizontal panning. Arrow keys now retain native scrolling while the zoomed image stage has focus. Browser recheck kept the same artwork and zoom state; next/previous controls still cycle within the selected category.
- Resolved P2 — Desktop header/title rhythm: first comparison showed an 84 px header, undersized display title, and artwork starting at y=372.6 rather than approximately 273 in the mock. Tuned desktop-only header, title, intro and image insets. Recheck at the same 941 px frame measured header 61 px, title x=213.7/y=103.5, and artwork y=274.1. Before: `/workspace/scratch/candice-drawings-comparison.jpg`. After: `/workspace/scratch/candice-drawings-comparison-fixed.jpg`.

No actionable P0/P1/P2 findings remain.

## Source and rendered evidence

Source visual truth: `/workspace/scratch/1d989a05034c/generated_images/exec-04158208-83a7-4fc0-8985-7790907903c0.png` (941 × 1672 pixels).

Implementation: `http://terminal.local:4173/drawings/?lang=en`, rendered by the managed Chrome browser. Desktop comparison captured through a 941 × 850 CSS px iframe. Native browser screenshot is 1363 × 936 pixels at device density 1. The iframe has a 15 px desktop scrollbar (926 px content area). Source and implementation top 850 px were placed together in one comparison page at 0.64 scale, excluding surrounding staging canvas from the compared content. Minor scrollbar-width mismatch is expected, not a typography/layout defect.

Rendered screenshots:
- `/workspace/scratch/candice-drawings-desktop-qa.jpg` (before desktop rhythm correction).
- `/workspace/scratch/candice-drawings-desktop-fixed.jpg` (after correction).
- `/workspace/scratch/candice-drawings-comparison-fixed.jpg` (same-input side-by-side comparison).
- `/workspace/scratch/candice-drawings-viewer-fixed.jpg` (fitted image viewer).
- `/workspace/scratch/candice-drawings-mobile-320.jpg` (Chinese narrow viewport).

Additional live viewports: 1363 × 936 desktop; 390 × 844 and 320 × 844 responsive iframe layouts. Content widths 375 and 305 respectively equaled scroll widths: no horizontal overflow. These are responsive browser checks, not physical-device tests.

State: dark theme, English/All for visual comparison, sound off. Chinese, filtered and viewer states checked separately. Full overview comparison and readable header/title/filter details were visible in the same combined input; a second enlarged crop was unnecessary. Below-fold portrait pair and final two-drawing photograph were additionally inspected in the browser, and all 8 original images loaded successfully.

## Required fidelity surfaces

- Fonts/typography: neutral Helvetica Neue/Arial sans-serif display and controls, system CJK fallbacks, monospace eyebrow/subtitle/captions. Display size and left alignment now follow the approved hierarchy; no heading or control truncation at checked widths. Exact source font is not embedded in the generated mock, so existing-site system font stack is retained.
- Spacing/layout: compact desktop header, offset introduction, full-width lead artwork, two-column paired grid, final full-width artwork; single column on mobile. Card insets and intro start were corrected in the second visual iteration. Large original photographs deliberately determine card height.
- Colors/tokens: near-black `#0a0a0a`, warm white `#f5f2e9`, green `#bcf77b`, subtle grid/borders. Green active filters and language state remain distinct; native focus is accented green.
- Image quality: all 8 original JPEG files copied byte-for-byte. No cropping, stretching, generated redrawing or altered paper detail. The mock altered/cleaned the artwork and used a wider lead crop; those image changes are intentionally not reproduced. The resulting first card is taller. Existing site orb identity is reused rather than replacing it with a new logo.
- Copy/content: bilingual titles, captions, categories, UI labels and descriptive alt text. Presentation titles avoid invented dates, media or physical dimensions. File 57 remains one complete photograph labeled “Two drawings”. Existing project and CV content preserved.

## Interactions and validation

- All/5 Figures & Symbols/3 Imagined Nature filters; count and selected state; reset to All.
- Viewer open/close, fit, native-resolution zoom, filtered previous/next wrap, keyboard arrows, Escape and focus restoration.
- Mobile viewer image, close, navigation and original/download controls remain available.
- English/Chinese switch updates document and UI and carries language into navigation.
- Menu open/close, localized About/Work/Drawings/Expertise/Contact links; sound toggle on/off.
- Homepage list collection link navigates through transition to standalone Drawings; About footer link also navigates correctly.
- Back to Work shows all four original projects and new collection entry; Buzzing detail opens with its original cover and four-project numbering.
- All eight image URLs loaded in browser. Static original/download hrefs point to those verified files.
- Console warnings/errors checked: no application errors; unrelated Chrome extension metadata warnings excluded.
- Build, audio check, locale check, TypeScript and diff validation passed. Static build preserves the independent drawings directory.
- Reduced-motion CSS, native dialog semantics, descriptive labels and no-JS original anchors inspected in source.

## Remaining limits and checklist

- iOS/Android hardware and Safari have not been exercised; original-file downloads were checked by href/resource rather than performing a browser download.
- Original photo backgrounds/shadows and physical perspective remain as supplied. Further photo cleanup would require a separate image-editing decision.
- [x] Fix desktop visual proportions and recapture.
- [x] Verify original image fidelity and complete gallery.
- [x] Verify mobile, languages, navigation and viewer.
- [x] Check for application console errors and build regressions.
- [ ] Publish and verify the production deployment.

final result: passed
