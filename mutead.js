(function () {
  'use strict';

  // Track media and player state separately: direct media muting alone does
  // not update YouTube's own volume control.
  var mutedVideos = new Map();
  var mutedPlayers = new Map();
  var enabled = false;
  var updating = false;

  function playerApi(player) {
    // Firefox exposes page-owned player methods through wrappedJSObject.
    return player.wrappedJSObject || player;
  }

  function playerMuted(player, videos) {
    try {
      var api = playerApi(player);
      if (typeof api.isMuted === 'function') return api.isMuted();
    } catch (error) {
      // Fall back to the media state when player methods are unavailable.
    }
    return videos[0].muted;
  }

  function setPlayerMuted(player, muted, videos) {
    try {
      var api = playerApi(player);
      var method = muted ? 'mute' : 'unMute';
      // Explicit setters avoid accidentally toggling an already muted player.
      if (typeof api[method] === 'function') {
        if (typeof api.isMuted !== 'function' || api.isMuted() !== muted) {
          api[method]();
          return true;
        }
        return false;
      }
    } catch (error) {
      // The regular volume button also invokes YouTube's native control.
    }
    var button = player.querySelectorAll('.ytp-mute-button')[0];
    if (button && videos[0].muted !== muted) {
      try {
        button.click();
        return true;
      } catch (error) {
        // Direct media muting below still works if YouTube rejects the click.
      }
    }
    return false;
  }

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
    // Native controls may synchronously emit volumechange while updating.
    if (updating) return;
    updating = true;
    try {
      var adVideos = new Set();
      var adPlayers = new Set();
      if (enabled) {
        document.querySelectorAll('.html5-video-player')
          .forEach(function (player) {
            if (!isAdPlaying(player)) return;
            var videos = Array.from(player.querySelectorAll('video'));
            if (!videos.length) return;
            adPlayers.add(player);
            if (!mutedPlayers.has(player)) {
              mutedPlayers.set(player, {
                wasMuted: playerMuted(player, videos),
                controlled: false,
                videos: videos,
              });
            }
            var state = mutedPlayers.get(player);
            // Capture every media state before the native control changes it.
            videos.forEach(function (video) {
              adVideos.add(video);
              if (!mutedVideos.has(video)) {
                // A replacement can inherit the mute we applied to its player.
                mutedVideos.set(video, state.controlled ? state.wasMuted : video.muted);
              }
            });
            state.videos = videos;
            if (setPlayerMuted(player, true, videos)) state.controlled = true;
            videos.forEach(function (video) {
              // Keep this fallback even when the native control succeeds.
              if (!video.muted) video.muted = true;
            });
          });
      }

      // Restore native controls first, then the individual media states.
      mutedPlayers.forEach(function (state, player) {
        if (adPlayers.has(player)) return;
        // Delete before restoring to avoid re-entering restoration via events.
        mutedPlayers.delete(player);
        if (state.controlled) setPlayerMuted(player, state.wasMuted, state.videos);
      });
      mutedVideos.forEach(function (wasMuted, video) {
        if (adVideos.has(video)) return;
        mutedVideos.delete(video);
        if (video.muted !== wasMuted) video.muted = wasMuted;
      });
    } finally {
      updating = false;
    }
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
