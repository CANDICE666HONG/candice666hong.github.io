# Desktop Tides integration verification — 2026-11-01

The deployed source is the GitHub Pages repository, not the earlier Sites copy.
Existing design projects, About, Drawings, shared language/audio assets, CNAME,
and older cached Next.js chunks are retained.

- Production homepage export and TypeScript build passed.
- Existing locale and audio checks passed.
- Original game: 50 checks passed. Portable game: 39 model checks passed.
- Browser at 1280×720: Chinese/English project detail, cover, Play link, and
  return to the same project all worked without console errors.
- Browser at 390×844: project dialog fit the viewport without horizontal overflow;
  Play and close controls remained visible and reachable.
- Actual pointer input verified random placement, dragged water, day/night,
  an escaped fishing round, and a successful blind catch (mullet).
- Successful catch revealed its WebP artwork, name and weight; the collection
  retained its discovery after refresh. Tests used a separate local preview origin.
- The game remained an 800×600 centered canvas at desktop size. All runtime
  images loaded from the nested project path. The complete game release is
  approximately 1.63 MB, with no private paths, user saves or sourcemaps.

The game interface intentionally remains Chinese. The portfolio description
states this next to Play in English. Mouse input is the intended play mode.
