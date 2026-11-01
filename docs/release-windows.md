# Windows release

The Windows application is built from `source-games/desktop-tides` and `desktop-app`, separately from the portfolio's static pages. The source stays in this repository; the portable EXE is a GitHub Release asset, not a large file in Git history or the Pages output.

## First release

`.github/workflows/release-desktop-tides.yml` runs on relevant changes to `main`, or through **Actions → Desktop Tides Windows → Run workflow** on `main`.

A read-only version check skips desktop packaging when that version is already published. The read-only Windows build job installs Node 24.22.1 and pnpm 11.25.0, runs the game tests, and executes `node scripts/build-desktop.mjs`. It records the source commit and SHA-256 checksum alongside the EXE. The separate release job has `contents: write`, verifies the transferred artifact, uploads a draft release, and publishes only after both files are uploaded. No repository secrets or personal token are required.

Initial public download:

`https://github.com/CANDICE666HONG/candice666hong.github.io/releases/download/desktop-tides-v1.0.0/Desktop-Tides-Windows.exe`

The accompanying checksum is the same URL with `.sha256` appended. A successful workflow run is required before this URL is available. Download the public file and check its hash before describing a release as live.

## Subsequent versions

1. Increase `desktop-app/package.json`'s version before publishing another desktop build.
2. Update the portfolio and game download links to the new `desktop-tides-vX.Y.Z` tag.
3. Build and verify the local game and native window before pushing the changes.
4. Wait for the Windows workflow, then verify the public download.

Published releases are never overwritten. Later changes to web navigation or game source with the same desktop version skip packaging and leave its public download unchanged. To ship a changed game as a new EXE, increase the desktop package version. If an earlier upload left an incomplete release or draft, the workflow stops for review. Do not delete a working release just to reuse its version number.

The desktop dependency lockfile and tool versions are fixed. The game currently fixes direct package versions but has no lockfile; a clean install can resolve newer compatible transitive dependencies. A repeat build is therefore reproducible from source and the documented tooling, but is not promised to be byte-for-byte identical. Compare a download with the checksum shipped with that release, not with a separate local build.

## Runtime and distribution

The package includes the game artwork and desktop runtime. Players do not install Node, pnpm, or a browser to use it. This release targets Windows 10/11 x64; it is not a macOS application. The current prototype is unsigned. The native build and local launch are separate checks from CI compilation; see `windows-play.md` for the build and save locations.

References: [GitHub token permissions](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token), [GitHub CLI release creation](https://cli.github.com/manual/gh_release_create), [release API](https://docs.github.com/en/rest/releases/releases).
