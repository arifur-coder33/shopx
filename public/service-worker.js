// public/service-worker.js
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installed");
  event.waitUntil(
    caches.open("static-cache").then((cache) => {
      return cache.addAll([
        "/",
        "/favicon.ico",
        "/manifest.json",
        // Add other assets here
      ]);
    })
  );
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activated");
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== "static-cache") {
            console.log("Service Worker: Clearing Old Cache");
            return caches.delete(cache);
          }
        })
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  console.log("Service Worker: Fetching", event.request.url);
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
