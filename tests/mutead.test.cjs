const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

async function setup(preference = true, initialPlayers = [], deferred = false) {
  let players = initialPlayers;
  let mutation;
  let changePreference;
  let resolveSettings;
  const events = {};
  const settings = deferred ? new Promise(resolve => { resolveSettings = resolve; }) : Promise.resolve({ muteAds: preference });
  vm.runInNewContext(readFileSync('mutead.js', 'utf8'), {
    document: { querySelectorAll: () => players, addEventListener: (name, callback) => { events[name] = callback; } },
    MutationObserver: class {
      constructor(callback) { mutation = callback; }
      observe() {}
    },
    window: {
      addEventListener: (name, callback) => { events[name] = callback; },
      getComputedStyle: element => element.style,
      setInterval: callback => { events.poll = callback; return 1; },
      clearInterval: () => {},
    },
    browser: { storage: {
      local: { get: () => settings },
      onChanged: { addListener: callback => { changePreference = callback; } },
    } },
    console,
  });
  await Promise.resolve();
  return {
    update: () => mutation(),
    players: value => { players = value; mutation(); },
    preference: value => changePreference({ muteAds: { newValue: value } }, 'local'),
    resolveSettings: value => resolveSettings({ muteAds: value }),
    events,
  };
}
function player(videos, ad = true) {
  const adPlayer = { ad, markers: [], buttons: [],
    classList: { contains: () => adPlayer.ad },
    querySelectorAll: selector => selector === 'video' ? videos :
      selector === '.ytp-mute-button' ? adPlayer.buttons : adPlayer.markers };
  return adPlayer;
}

test('mutes an ad already playing and restores sound when it ends', async () => {
  const video = { muted: false };
  const p = player([video]);
  const app = await setup(true, [p]);
  assert.equal(video.muted, true);
  app.update(); // Repeated mutations and consecutive ads must not overwrite state.
  p.ad = false;
  app.update();
  assert.equal(video.muted, false);
});

test('an already muted video remains muted after an ad', async () => {
  const video = { muted: true };
  const p = player([video]);
  const app = await setup(true, [p]);
  p.ad = false;
  app.update();
  assert.equal(video.muted, true);
});

test('preference changes take effect during an ad and restore sound', async () => {
  const video = { muted: false };
  const app = await setup(false, [player([video])]);
  assert.equal(video.muted, false);
  app.preference(true);
  assert.equal(video.muted, true);
  app.preference(false);
  assert.equal(video.muted, false);
});

test('player and video replacement restore old videos and mute new ads', async () => {
  const first = { muted: false };
  const second = { muted: false };
  const p = player([first]);
  const app = await setup(true, [p]);
  const originalQuery = p.querySelectorAll;
  p.querySelectorAll = selector => selector === 'video' ? [second] : originalQuery(selector);
  app.update();
  assert.equal(first.muted, false);
  assert.equal(second.muted, true);
  const content = { muted: false };
  app.players([player([content], false)]);
  assert.equal(second.muted, false);
  assert.equal(content.muted, false);
});

test('normal content and other players are left alone', async () => {
  const content = { muted: false };
  const ad = { muted: false };
  const app = await setup(true, [player([content], false), player([ad])]);
  assert.equal(content.muted, false);
  assert.equal(ad.muted, true);
  app.events.pagehide();
  assert.equal(ad.muted, false);
});

test('a preference change wins over a stale initial storage read', async () => {
  const video = { muted: false };
  const app = await setup(true, [player([video])], true);
  app.preference(false);
  app.resolveSettings(true);
  await Promise.resolve();
  assert.equal(video.muted, false);
});


test('visible ad badge detects an ad without player ad classes', async () => {
  const video = { muted: false };
  const p = player([video], false);
  p.markers = [{ getClientRects: () => [{}], style: { display: 'block', visibility: 'visible' } }];
  const app = await setup(true, [p]);
  assert.equal(video.muted, true);
  p.markers = [];
  app.update();
  assert.equal(video.muted, false);
});

test('hidden leftover ad controls do not mute normal content', async () => {
  const video = { muted: false };
  const p = player([video], false);
  p.markers = [
    { getClientRects: () => [], style: { display: 'none', visibility: 'visible' } },
    { getClientRects: () => [{}], style: { display: 'block', visibility: 'hidden' } },
  ];
  await setup(true, [p]);
  assert.equal(video.muted, false);
});

test('a YouTube audio reset during an ad is muted again and original state restored', async () => {
  const video = { muted: false };
  const p = player([video]);
  const app = await setup(true, [p]);
  video.muted = false;
  app.events.volumechange();
  assert.equal(video.muted, true);
  video.muted = false;
  app.events.poll();
  assert.equal(video.muted, true);
  p.ad = false;
  app.update();
  assert.equal(video.muted, false);
});

function nativePlayer(videos, initiallyMuted = false, affectMedia = true) {
  const p = player(videos);
  p.nativeMuted = initiallyMuted;
  p.calls = [];
  p.wrappedJSObject = {
    isMuted: () => p.nativeMuted,
    mute() {
      p.calls.push('mute');
      p.nativeMuted = true;
      if (affectMedia) videos.forEach(video => { video.muted = true; });
      if (p.onVolumeChange) p.onVolumeChange();
    },
    unMute() {
      p.calls.push('unMute');
      p.nativeMuted = false;
      if (affectMedia) videos.forEach(video => { video.muted = false; });
      if (p.onVolumeChange) p.onVolumeChange();
    },
  };
  return p;
}

test('native player mute is invoked and both player and media are restored', async () => {
  const video = { muted: false };
  const p = nativePlayer([video]);
  const app = await setup(true, [p]);
  assert.equal(p.nativeMuted, true);
  assert.equal(video.muted, true);
  app.update();
  app.events.poll();
  assert.deepEqual(p.calls, ['mute']);
  p.ad = false;
  app.update();
  assert.equal(p.nativeMuted, false);
  assert.equal(video.muted, false);
  assert.deepEqual(p.calls, ['mute', 'unMute']);
});

test('native player already muted is never toggled or unmuted', async () => {
  const video = { muted: true };
  const p = nativePlayer([video], true);
  const app = await setup(true, [p]);
  app.events.poll();
  p.ad = false;
  app.update();
  assert.equal(video.muted, true);
  assert.equal(p.nativeMuted, true);
  assert.deepEqual(p.calls, []);
});

test('direct media fallback works even when native mute leaves media audible', async () => {
  const video = { muted: false };
  const p = nativePlayer([video], false, false);
  const app = await setup(true, [p]);
  assert.equal(p.nativeMuted, true);
  assert.equal(video.muted, true);
  video.muted = false;
  app.events.volumechange();
  assert.equal(video.muted, true);
  p.nativeMuted = false;
  app.events.poll();
  assert.equal(p.nativeMuted, true);
  assert.deepEqual(p.calls, ['mute', 'mute']);
  app.preference(false);
  assert.equal(p.nativeMuted, false);
  assert.equal(video.muted, false);
});

test('volume button fallback clicks before direct media mute and restores afterward', async () => {
  const video = { muted: false };
  const p = player([video]);
  let clicks = 0;
  p.buttons = [{ click() { clicks++; video.muted = !video.muted; } }];
  const app = await setup(true, [p]);
  assert.equal(clicks, 1);
  assert.equal(video.muted, true);
  app.events.poll();
  assert.equal(clicks, 1);
  p.ad = false;
  app.update();
  assert.equal(clicks, 2);
  assert.equal(video.muted, false);
});

test('late native controls synchronize even after media fallback muted the ad', async () => {
  const video = { muted: false };
  const p = player([video]);
  const app = await setup(true, [p]);
  assert.equal(video.muted, true);
  let muted = false;
  p.wrappedJSObject = {
    isMuted: () => muted,
    mute: () => { muted = true; },
    unMute: () => { muted = false; },
  };
  app.update();
  assert.equal(muted, true);
  app.events.pagehide();
  assert.equal(muted, false);
  assert.equal(video.muted, false);
});

test('native volume events cannot re-enter muting or restoration', async () => {
  const video = { muted: false };
  const p = nativePlayer([video]);
  const app = await setup(false, [p]);
  p.onVolumeChange = app.events.volumechange;
  app.preference(true);
  assert.equal(p.nativeMuted, true);
  app.preference(false);
  assert.equal(p.nativeMuted, false);
  assert.equal(video.muted, false);
  assert.deepEqual(p.calls, ['mute', 'unMute']);
});

test('replacing players restores native state of the old player', async () => {
  const first = { muted: false };
  const second = { muted: false };
  const oldPlayer = nativePlayer([first]);
  const newPlayer = nativePlayer([second]);
  const app = await setup(true, [oldPlayer]);
  app.players([newPlayer]);
  assert.equal(oldPlayer.nativeMuted, false);
  assert.equal(first.muted, false);
  assert.equal(newPlayer.nativeMuted, true);
  assert.equal(second.muted, true);
});

test('a rejected native mute and click still leave direct muting working', async () => {
  const video = { muted: false };
  const p = player([video]);
  p.wrappedJSObject = { mute() { throw new Error('unavailable'); } };
  p.buttons = [{ click() { throw new Error('rejected'); } }];
  const app = await setup(true, [p]);
  assert.equal(video.muted, true);
  p.ad = false;
  app.update();
  assert.equal(video.muted, false);
});

test('replacement media inheriting native ad mute is unmuted after the ad', async () => {
  const first = { muted: false };
  const p = nativePlayer([first]);
  const app = await setup(true, [p]);
  const replacement = { muted: true };
  const originalQuery = p.querySelectorAll;
  p.querySelectorAll = selector => selector === 'video' ? [replacement] : originalQuery(selector);
  app.update();
  assert.equal(replacement.muted, true);
  p.ad = false;
  app.update();
  assert.equal(p.nativeMuted, false);
  assert.equal(replacement.muted, false);
});
