# yt-ad-autoskipper

A browser extension that automates skipping ad on YouTube. This is not an ad blocker, it just automates the process of clicking on the "Skip Ad" button on YouTube.

This is useful when you are watching a YouTube video (or a playlist), and an ad starts playing. YouTube allows you to skip the ad after 5 seconds, but if you can't be bothered to click it yourself (or you are AFK), this extension clicks that button for you.

## Download

### Local Firefox build with ad muting

This branch is based on the Firefox `0.6.0_hotfix` release. Ads are muted by
default; the video's previous mute state is restored when ads finish. Videos
that were already muted stay muted. Change **Mute ads** in the extension's
preferences; changes apply to open YouTube tabs immediately.

Run `make build` to create `build/yt-ad-autoskipper.zip`. For a temporary install,
open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**,
and select `manifest.json` in this directory. Disable the store version first
to avoid running two skippers. Temporary add-ons are removed on Firefox restart;
permanent installation in standard Firefox requires Mozilla signing.

Run the regression checks with `node --test tests/*.test.cjs`.

### Chrome

[Get it from Chrome Web Store](https://chrome.google.com/webstore/detail/youtube-ad-auto-skipper/lokpenepehfdekijkebhpnpcjjpngpnd)

### Firefox

[Get it from Firefox Addon Marketplace](https://addons.mozilla.org/en-US/firefox/addon/youtube-ad-auto-skipper/)

### Safari

There is a port available:
[ohanedan](https://github.com/ohanedan)/**[yt-ad-autoskipper-safari](https://github.com/ohanedan/yt-ad-autoskipper-safari)**

---

If you think this extension has made your YouTube experience better, would you care to buy me a cup of coffee? [You can donate whatever you want.](https://paypal.me/squgeim)
