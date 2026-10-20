'use strict';

var checkbox = document.getElementById('mute-ads');
var status = document.getElementById('status');

browser.storage.local.get({ muteAds: true }).then(function (settings) {
  checkbox.checked = settings.muteAds !== false;
  checkbox.disabled = false;
}).catch(function () {
  status.textContent = 'Could not load preferences. Please reopen this page.';
});

checkbox.addEventListener('change', function () {
  checkbox.disabled = true;
  browser.storage.local.set({ muteAds: checkbox.checked }).then(function () {
    status.textContent = 'Saved.';
    checkbox.disabled = false;
  }).catch(function () {
    checkbox.checked = !checkbox.checked;
    checkbox.disabled = false;
    status.textContent = 'Could not save your preference. Please try again.';
  });
});
