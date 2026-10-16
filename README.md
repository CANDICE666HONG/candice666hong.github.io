# Candice Hong Portfolio

Live site: https://candicehong.cn/

This repository is the static GitHub Pages publishing directory. The existing
homepage is a Next.js export; its compiled `_next/` files and project assets are
retained unchanged.

## Independent About page

- `about/index.html`: introduction, biography, education and page navigation.
- `assets/about/about.css`: responsive layout and a sticky introduction stage.
- `assets/about/symbols.css`: original folded cursor, connecting touchpoints and
  pixel bloom; inline SVG definitions are in the About HTML.
- `assets/about/about.js`: reversible scroll-driven text and symbol motion, plus
  accessible native dialog navigation. Scroll down to advance and up to reverse;
  a stationary page has a stationary pose. There is no timed intro playback.
- `assets/about/navigation.js` and `navigation.css`: connect the exported
  homepage to `/about/`, redirect legacy `/#about` links, and provide the exit
  transition. The old biography is excluded from the works layout.

The About page is buildless and requires no third-party libraries. Content and
links remain readable without JavaScript. Reduced-motion preferences show the
complete text immediately without animation or an extended scroll section.
The introduction uses native scrolling (wheel, trackpad, touch, keyboard and
scrollbar); no wheel or touch gestures are intercepted. One animation-frame
callback batches each scroll update, without an ongoing rendering loop.

GitHub Pages serves `about/index.html` directly at `/about/` (including refresh).
Keep `CNAME` and `.nojekyll`. When replacing the homepage with a new framework
export, retain these two tags in its `<head>` until equivalent routing is added
to the framework source:

```html
<link rel="stylesheet" href="/assets/about/navigation.css">
<script src="/assets/about/navigation.js" defer></script>
```

The current repository contains exported homepage files, not the original
framework source. Do not hand-edit the generated `_next/` bundles.
