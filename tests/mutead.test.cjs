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
  const adPlayer = { ad, markers: [], classList: { contains: () => adPlayer.ad },
    querySelectorAll: selector => selector === 'video' ? videos : adPlayer.markers };
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
  p.querySelectorAll = () => [second];
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
