# Candice Hong Portfolio

Live site: https://candicehong.cn/

The repository root is the GitHub Pages publishing directory. `source/` contains
the editable Next.js homepage; the independent About and Drawings pages are plain HTML/CSS/JS.
Keep `CNAME`, `.nojekyll`, `images/`, `about/`, `drawings/`, and `assets/` when rebuilding.

## Build the homepage

Use Node.js 22 or newer. Install dependencies in `source/` with `npm install`,
then run `node scripts/build.mjs` from the repository root. This creates a static
Next.js export and copies it into the publishing directory. Existing hashed
chunks remain available for visitors who still have an older page cached.
Do not hand-edit the generated HTML or `_next/` files.

- `source/components/homepage.tsx`: page navigation, work, expertise, contact and project dialogs.
- `source/lib/portfolio-content.ts`: original project content and asset references.
- `source/lib/translations.json`: complete Chinese and English interface copy.
- `source/components/portfolio-experience.tsx`: the original greeting and entry sequence.
- `source/components/spiral-gallery.tsx`: spiral/list views and gallery controls.
- `source/app/language-layout.css`: responsive language controls and Chinese typography.

## Language selection

The homepage and About page share `assets/i18n/locale.js` and `language.css`.
Preference order is the URL's `?lang=zh` / `?lang=en`, the saved choice, then
English. A first visit starts in English regardless of browser language.
A visitor's selection is saved in local storage and
carried into cross-page links, including when storage is unavailable. Changing
language preserves the current section, open project, and About scroll progress.

Project names, software names, and original portfolio images are retained.
Translate interface prose in the catalog; About copy is in `assets/about/about.js`.
Run `node scripts/check-locale.mjs` to verify preference, URL, and storage behavior.

## Interface sounds

`assets/audio/sound-design.js` synthesizes six original sounds: a soft glass
click, opening and closing cues, a warm entry chord, and directional air swipes.
The homepage and About page share `assets/audio/interface-audio.js`; it builds
short Web Audio buffers once after a user gesture, with no audio downloads or
external service. The 1.08-second entry chord fits the existing 1.15-second
transition. Sounds never change the animation timing.

Sound defaults to off. “Enter with sound” and the speaker buttons enable it;
silent entry, Skip and Escape silence the intro. The `candice-sound` preference
is shared between pages, but each new document still needs a user gesture to
unlock audio. Muting stops active sounds immediately. Hidden tabs and page exits
clear voices, and automatic gallery rotation and programmatic scrolling stay
silent. User scroll sounds share a 220ms limit and a four-voice maximum.

Controls can opt into `data-sound="click"`, `"open"`, or `"close"`; use
`data-sound="none"` for controls with their own sound handling. Keep sound
toggles accessible inside dialogs as well as on the page.

Run `node scripts/check-audio.mjs` to verify gesture, mute, lifecycle, scroll,
and browser-fallback behavior. `node scripts/render-sounds.mjs` regenerates the
WAV previews in `assets/audio/previews/`. `interface-sounds.wav` plays click,
open, close, enter, forward swipe and backward swipe in that order. These files
are for auditioning and are not downloaded during ordinary site browsing.

## Independent About page

- `about/index.html`: introduction, education, internship and community experience, and page navigation.
- `assets/about/about.css`: responsive layout and a sticky introduction stage.
- `assets/about/symbols.css`: original folded cursor, connecting touchpoints and pixel bloom.
- `assets/about/about.js`: reversible native-scroll motion and accessible dialog navigation.

Scroll down to advance and up to reverse. A stationary page has a stationary
pose; there is no timed intro playback. Reduced-motion preferences show the
complete text immediately. Wheel, trackpad, touch and keyboard scrolling remain
native. One animation-frame callback batches each scroll update without an
ongoing rendering loop. Switching languages preserves the original SVG nodes.

GitHub Pages serves `/about/` directly, including refresh. The React homepage
handles the transition and redirects legacy `/#about` links. The older
`assets/about/navigation.js` bridge remains available for cached exports but is
not loaded by the rebuilt homepage.

## Drawing gallery

`drawings/index.html` and `assets/drawings/drawings.css` / `drawings.js` implement
the independent `/drawings/` collection, with shared language and sound preferences.
The homepage adds a separate collection entry alongside its four design projects;
it does not treat drawings as an additional design case study.

The gallery displays eight original photographs from `images/drawings/`, ordered
55, 50, 54, 51, 52, 53, 56, 57. Image bytes and proportions are preserved; 57 is
a photograph of two drawings and remains together. No dates, materials or physical
dimensions are inferred. The bilingual presentation titles can be edited in the
gallery's HTML and translation catalog when the artist supplies final titles.

All artworks and links work without JavaScript. JavaScript adds category filters,
an accessible image viewer with previous/next and zoom controls, and optional
interface sounds. The full collection uses a two-column desktop layout with
full-width opening and closing images, then becomes a single column on phones.
