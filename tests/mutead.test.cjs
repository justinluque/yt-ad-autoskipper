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
    document: { querySelectorAll: () => players.filter(p => p.ad) },
    MutationObserver: class {
      constructor(callback) { mutation = callback; }
      observe() {}
    },
    window: { addEventListener: (name, callback) => { events[name] = callback; } },
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
  return { ad, querySelectorAll: () => videos };
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
