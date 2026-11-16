// Bump this on every deploy that changes a cached file: the fetch handler below is cache-first.
const cacheName = "solar-v2";
const assetsToCache = [
  "/",
  "/styles.css",
  "/script.js",
  "/solar.js",
  "/vendor/astronomy.browser.min.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Install event
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(cacheName).then(cache => {
      // cache: "reload" skips the browser's HTTP cache so we never store stale copies
      return cache.addAll(assetsToCache.map(url => new Request(url, { cache: "reload" })));
    }).then(() => self.skipWaiting())
  );
});

// Activate event: drop caches from older versions, then take control of open pages
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== cacheName).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener("fetch", event => {
  let lookup = event.request;
  // The static host redirects /index.html to /, and a redirected response can't be served for a
  // navigation, so answer /index.html (old start_url of installed apps) from the cached "/".
  if (event.request.mode === "navigate" && new URL(event.request.url).pathname === "/index.html") {
    lookup = "/";
  }
  event.respondWith(
    caches.match(lookup).then(response => {
      return response || fetch(event.request);
    })
  );
});
