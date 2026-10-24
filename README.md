# YT Ad Auto-skipper — Skip & Mute

Automatic ad skipping, with **optional ad muting and sound restoration** added to [Shreya Dahal’s original Firefox extension](https://github.com/squgeim/yt-ad-autoskipper). Free and open source, like the original.

[Install from Mozilla Add-ons](https://addons.mozilla.org/en-US/firefox/addon/yt-ad-auto-skipper-skip-mute/)

## What this fork adds

- **Mute ads automatically.** Silence ads while they play. Enabled by default; switch it off in the extension’s Preferences.
- **Restore your sound afterward.** Return to your previous audio state when ads end. Videos you had already muted stay muted.
- **Keep YouTube’s mute control in sync.** Use the player’s native mute controls, with direct video muting as a fallback.
- **Handle more ad layouts and audio resets.** Detect visible ad controls, reapply muting if an ad resets the audio, and handle player replacements.

- **Super duper cool new icon.**

The original automatic skipping remains: click YouTube’s Skip Ad button when it becomes available. Ads still load and play; skip countdowns are not bypassed.

## Free and open source

Released under [GNU GPL v3.0](LICENSE.md). No accounts, subscriptions, analytics, or telemetry. Your mute preference stays in local extension storage.

## Install

For normal use, [install from Mozilla Add-ons](https://addons.mozilla.org/en-US/firefox/addon/yt-ad-auto-skipper-skip-mute/). Firefox handles updates to the listed version automatically.

GitHub [Releases](https://github.com/justinluque/yt-ad-autoskipper/releases) may also contain downloadable packages. Check the release notes: the original v0.6.4 XPI is unsigned and intended for temporary testing. Only packages explicitly labeled as Mozilla-signed are signed builds.

For a temporary installation of an unsigned local build:

1. Disable any other copy of the skipper to avoid running two at once.
2. Open `about:debugging#/runtime/this-firefox`.
3. Choose **Load Temporary Add-on** and select the XPI. Alternatively, extract the ZIP and select `manifest.json`.
4. Refresh any open YouTube tabs.

Temporary installations are removed when Firefox restarts. Standard Firefox requires Mozilla signing for permanent installation.

To turn off muting, open the extension’s **Preferences** in Firefox’s Add-ons Manager and uncheck **Mute ads**. Changes apply immediately to open YouTube tabs; automatic skipping remains active.

## Build and test

With Node.js installed, run:

```sh
make test
```

With `make` and `zip` installed, run:

```sh
make build
```

This produces an **unsigned** `build/yt-ad-autoskipper.xpi` and `build/yt-ad-autoskipper.zip` from the same extension files. Normal builds do not require installing dependencies. Mozilla signing is a separate step: a locally rebuilt archive is not a signed release.

The icon source is `logo.svg`. Pre-rendered PNGs are checked in. To regenerate them after editing the vector, install `rsvg-convert` (librsvg) and run `make icons` before building.

The regression suite covers ad detection, native mute controls, media fallback, audio resets, player replacements, preference changes, and audio restoration. YouTube changes its player periodically; please include the affected player layout and Firefox version when reporting a problem.

## Implementation notes

Ad muting invokes YouTube’s native player mute method, or its volume button when the method is unavailable, and also sets the video’s muted property as a fallback. The extension does not replace the speaker icon or its labels.

The extension detects visible ad controls when YouTube’s usual ad classes are absent and continues muting when ad sources reset the audio. It handles player replacements, navigation, and page hide/restore, then restores the previous player and media mute states.

## Attribution and license

The original extension, skip-button automation, and underlying Firefox codebase were created by **Shreya Dahal (squgeim) and the upstream contributors**. Their Git history, including the original icon, is preserved in this fork. The current red skip-symbol icon was created for this fork.

- [Original repository](https://github.com/squgeim/yt-ad-autoskipper)
- [Original Firefox add-on](https://addons.mozilla.org/en-US/firefox/addon/youtube-ad-auto-skipper/)
- [Original Chrome extension](https://chrome.google.com/webstore/detail/youtube-ad-auto-skipper/lokpenepehfdekijkebhpnpcjjpngpnd)
- [Support the original author](https://paypal.me/squgeim)

This fork starts from the legacy Firefox 0.6.0 codebase at upstream commit `3d88e1c` and adds the ad-muting preference, detection and restoration logic, native mute synchronization, regression tests, and packaging/documentation changes. It does not include the newer TypeScript master branch’s subscription features. This is an independent fork, not an official upstream release.

Distributed under the **GNU General Public License v3.0**, as in the original project. See [LICENSE.md](LICENSE.md). Existing author credits and the original license are retained.

## Support this fork

Enjoying Skip & Mute? You can [buy me a coffee](https://buymeacoffee.com/justinluque) to support development and maintenance of this free, open-source fork. Donations are entirely optional.
