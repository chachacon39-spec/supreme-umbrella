/* Quill & Ledger — service worker.
   Precaches the app shell so the desk opens offline, and serves cached
   assets first. It never touches user data: drafts live in localStorage
   and are not cached or intercepted here. */

var CACHE_NAME = 'quill-ledger-v1';

// Paths are resolved against the service worker's own scope, so this works
// both on GitHub Pages (scope /supreme-umbrella/) and when served from a
// local root (scope /).
var PRECACHE = [
  '',
  'index.html',
  'manifest.webmanifest',
  'assets/css/base.css',
  'assets/css/app.css',
  'assets/js/util.js',
  'assets/js/data/personas.js',
  'assets/js/data/lexicons.js',
  'assets/js/data/resources.js',
  'assets/js/core/store.js',
  'assets/js/core/brief.js',
  'assets/js/core/styles.js',
  'assets/js/core/analyzer.js',
  'assets/js/core/summarize.js',
  'assets/js/core/paraphrase.js',
  'assets/js/core/originality.js',
  'assets/js/core/citations.js',
  'assets/js/core/imagegen.js',
  'assets/js/core/export.js',
  'assets/js/ui/kit.js',
  'assets/js/ui/board.js',
  'assets/js/ui/editor.js',
  'assets/js/ui/tools.js',
  'assets/js/ui/backup.js',
  'assets/js/ui/resources.js',
  'assets/js/app.js',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png'
];

function scopeUrl(path) {
  return new URL(path, self.registration.scope).toString();
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(PRECACHE.map(scopeUrl)); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  // Only handle same-origin GET requests; everything else passes through.
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // App shell: try the network first so updates arrive, fall back to the
    // cached index.html when offline.
    event.respondWith(
      fetch(req).catch(function () { return caches.match(scopeUrl('index.html')); })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        // Cache a copy of successful same-origin responses for next time.
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      });
    })
  );
});
