(function () {
  'use strict';

  // Do not change YouTube's saved volume preference or click its mute toggle.
  // Remember each video separately, including across player replacements.
  var mutedVideos = new Map();
  var enabled = false;

  function update() {
    var adVideos = new Set();
    if (enabled) {
      document.querySelectorAll('.html5-video-player.ad-showing, .html5-video-player.ad-interrupting')
        .forEach(function (player) {
          player.querySelectorAll('video').forEach(function (video) {
            adVideos.add(video);
            if (!mutedVideos.has(video)) {
              mutedVideos.set(video, video.muted);
              video.muted = true;
            }
          });
        });
    }

    mutedVideos.forEach(function (wasMuted, video) {
      if (!adVideos.has(video)) {
        video.muted = wasMuted;
        mutedVideos.delete(video);
      }
    });
  }

  // Register before reading storage so a preference change cannot be missed.
  var preferenceChanged = false;
  browser.storage.onChanged.addListener(function (changes, area) {
    if (area === 'local' && changes.muteAds) {
      preferenceChanged = true;
      enabled = changes.muteAds.newValue !== false;
      update();
    }
  });

  browser.storage.local.get({ muteAds: true }).then(function (settings) {
    if (!preferenceChanged) {
      enabled = settings.muteAds !== false;
      update();
    }
  }).catch(function (error) {
    console.warn('Ad Auto-skipper: could not load mute preference', error);
  });

  // Watch the document because YouTube replaces players during SPA navigation.
  var observer = new MutationObserver(update);
  observer.observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });

  window.addEventListener('pagehide', function () {
    enabled = false;
    update();
  });
  window.addEventListener('pageshow', function () {
    browser.storage.local.get({ muteAds: true }).then(function (settings) {
      enabled = settings.muteAds !== false;
      update();
    }).catch(function (error) {
      console.warn('Ad Auto-skipper: could not load mute preference', error);
    });
  });
})();
