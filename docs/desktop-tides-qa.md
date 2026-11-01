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

## Local time and downloadable build — 2026-11-01

- Original game 58 checks and portable game 47 checks passed, including local
  06:00/18:00 boundaries, Tokyo/Los Angeles timezones, hidden-page resume,
  invalid preferences, manual overrides and timer disposal.
- Browser verified default automatic night at the device's current late-evening
  hour, manual day surviving reload, and immediate return to automatic night.
- During fishing, Escape closed only the light menu; arrow + Space selected
  manual day while the same fishing round remained active.
- The portfolio's actual Download link saved the ZIP; its hash matched the build.
  Standard ZIP extraction produced exactly Desktop-Tides.html and README.txt.
- The offline build embeds 13 images plus all script/styles; its inline classic
  script parses, resource assertions pass, and CSP forbids network requests.
  Two unchanged builds produced identical bytes. ZIP size: 1,472,526 bytes.
- Direct file-protocol browser playback could not be tested: the preview browser
  rejected local-file URLs. This is an explicit verification limit; no native
  Windows or macOS launch claim is made.
