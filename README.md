# YouTube Ad Auto-skipper — Firefox fork

A Firefox fork of [YouTube Ad Auto-skipper by Shreya Dahal (squgeim)](https://github.com/squgeim/yt-ad-autoskipper), with automatic ad muting and restoration of the previous audio state. This fork is maintained by [Justin Luque](https://github.com/justinluque) and is not an official upstream release.

It clicks YouTube's Skip Ad button when available and silences ads while they play. It does not block ad requests or bypass YouTube's skip countdown.

## What this fork adds

- Optional ad muting, enabled by default, with changes applied to open tabs immediately.
- YouTube's native player mute control, plus direct media muting as a fallback. The speaker icon and mute state are managed by YouTube; no replacement icon or overlay is used.
- Restoration of the previous player and video mute states. Videos that were already muted stay muted.
- Detection of visible ad controls when YouTube's usual ad classes are absent, and continued muting when ad sources reset the audio.
- Handling of replaced players, navigation, and page hide/restore.
- Automated regression checks for ad detection, mute restoration, native controls, and media fallback.

## Download and try it

Download the ZIP or **unsigned XPI** from [Releases](https://github.com/justinluque/yt-ad-autoskipper/releases).

For a temporary Firefox installation:

1. Disable the original extension if installed, to avoid running two skippers.
2. Open `about:debugging#/runtime/this-firefox`.
3. Choose **Load Temporary Add-on** and select the XPI. Alternatively, extract the ZIP and select `manifest.json`.
4. Refresh any open YouTube tabs.

Temporary installations are removed when Firefox restarts. The XPI published here is unsigned; it is not a Mozilla Add-ons listing or a permanently installable package for standard Firefox.

In the extension's preferences, toggle **Mute ads** to enable or disable ad muting. Automatic skipping remains active.

## Build and test

With Node.js installed, run:

```sh
node --test tests/*.test.cjs
```

With `make` and `zip` installed, run:

```sh
make build
```

This produces `build/yt-ad-autoskipper.zip` and `build/yt-ad-autoskipper.xpi` from the same extension files. No dependencies need to be installed.

Version 0.6.4 passed 18 automated regression tests and was manually confirmed working in Firefox by this fork's maintainer. YouTube changes its player periodically; please include the affected player layout and Firefox version when reporting a problem.

## Privacy

The extension stores the mute preference locally using Firefox extension storage. It contains no analytics or telemetry and does not send browsing data to a separate service. Its content scripts run on YouTube pages to detect ads and operate player controls.

## Credits and license

The original extension, skip-button automation, icon, and underlying Firefox codebase were created by **Shreya Dahal (squgeim) and the upstream contributors**. Their Git history is preserved in this fork. Thank you for making the project available as open source.

- [Original repository](https://github.com/squgeim/yt-ad-autoskipper)
- [Original Firefox add-on](https://addons.mozilla.org/en-US/firefox/addon/youtube-ad-auto-skipper/)
- [Original Chrome extension](https://chrome.google.com/webstore/detail/youtube-ad-auto-skipper/lokpenepehfdekijkebhpnpcjjpngpnd)
- [Support the original author](https://paypal.me/squgeim)

This fork starts from the legacy Firefox 0.6.0 codebase at upstream commit `3d88e1c` and adds the ad-muting preference, detection and restoration logic, native mute synchronization, regression tests, and packaging/documentation changes. It does not include the newer TypeScript master branch's subscription features.

Distributed under the **GNU General Public License v3.0**, as in the original project. See [LICENSE.md](LICENSE.md). Existing author credits and the original license are retained.
