(function () {
  'use strict';

  // Do not change YouTube's saved volume preference or click its mute toggle.
  // Remember each video separately, including across player replacements.
  var mutedVideos = new Map();
  var enabled = false;

  function isAdPlaying(player) {
    if (player.classList.contains('ad-showing') ||
        player.classList.contains('ad-interrupting')) {
      return true;
    }
    // Some player layouts expose ad controls without either player class.
    return Array.from(player.querySelectorAll(
      '.ytp-ad-text, .ytp-ad-simple-ad-badge, .ytp-ad-preview-container, ' +
      '.ytp-ad-duration-remaining, .ytp-ad-skip-button-container, ' +
      '.ytp-ad-skip-button-modern, .ytp-skip-ad-button'
    )).some(function (element) {
      var style = window.getComputedStyle(element);
      return element.getClientRects().length > 0 &&
        style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  function update() {
    var adVideos = new Set();
    if (enabled) {
      document.querySelectorAll('.html5-video-player')
        .forEach(function (player) {
          if (!isAdPlaying(player)) return;
          player.querySelectorAll('video').forEach(function (video) {
            adVideos.add(video);
            if (!mutedVideos.has(video)) {
              mutedVideos.set(video, video.muted);
            }
            // YouTube can reset this property when switching ad sources.
            if (!video.muted) video.muted = true;
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
    attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'],
    characterData: true,
  });

  // Media property changes do not produce DOM mutations.
  document.addEventListener('volumechange', update, true);
  var timer = window.setInterval(update, 250);

  window.addEventListener('pagehide', function () {
    window.clearInterval(timer);
    timer = null;
    enabled = false;
    update();
  });
  window.addEventListener('pageshow', function () {
    if (timer === null) timer = window.setInterval(update, 250);
    browser.storage.local.get({ muteAds: true }).then(function (settings) {
      enabled = settings.muteAds !== false;
      update();
    }).catch(function (error) {
      console.warn('Ad Auto-skipper: could not load mute preference', error);
    });
  });
})();
