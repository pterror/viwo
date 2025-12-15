/// <reference lib="webworker" />

const CACHE_VERSION = "imagegen-v1";
const ASSETS_TO_CACHE = ["/", "/index.html"];

globalThis.addEventListener(
  "install",
  /** @param {ExtendableEvent} event */
  (event) => {
    event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
    globalThis.skipWaiting();
  },
);

globalThis.addEventListener(
  "activate",
  /** @param {ExtendableEvent} event */
  (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) =>
          Promise.all(
            cacheNames
              .filter((cacheName) => cacheName !== CACHE_VERSION)
              .map((cacheName) => caches.delete(cacheName)),
          ),
        ),
    );
    globalThis.clients.claim();
  },
);

globalThis.addEventListener(
  "fetch",
  /** @param {FetchEvent} event */ (event) => {
    // Network-first for WebSocket and API calls
    if (event.request.url.includes("ws://") || event.request.url.includes("/rpc")) {
      return;
    }

    // Cache-first for assets
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      }),
    );
  },
);

// oxlint-disable-next-line require-module-specifiers
export {};
