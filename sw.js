/* Lantern Hollow — lightweight offline cache for phone install / testing */
const CACHE = "lantern-hollow-v13";
const PRECACHE = [
  "./",
  "./lantern.html",
  "./manifest.webmanifest",
  "./game/play.html",
  "./game/index.html",
  "./game/manifest.webmanifest",
  "./game/style.css",
  "./game/cgi.js",
  "./game/game.js",
  "./game/assets/relic-orb.png",
  "./game/assets/ancient-relic.png",
  "./game/assets/forest-floor.webp",
  "./game/assets/forest-floor.png",
  "./game/assets/weapon-crate.png",
  "./game/assets/icons/icon-192.png",
  "./game/assets/icons/icon-512.png",
  "./game/assets/icons/icon-512-maskable.png",
  "./game/assets/icons/icon-180.png",
  "https://unpkg.com/three@0.160.0/build/three.min.js",
];

const SFX_FILES = [
  "shoot",
  "hit",
  "kill",
  "xp",
  "level",
  "hurt",
  "dash",
  "pickup",
  "nuke",
  "nuke2",
  "grenade",
  "boom",
  "boom2",
  "nova",
  "spark",
  "boss",
  "death",
].map((n) => `./game/assets/sfx/${n}.ogg`);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([...PRECACHE, ...SFX_FILES]).catch(() => cache.addAll(PRECACHE)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: "window" }).then((clients) => {
          clients.forEach((c) => c.postMessage({ type: "LANTERN_SW_UPDATED", cache: CACHE }));
        }),
      ),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isThree = url.href.includes("unpkg.com/three@");
  if (url.origin !== self.location.origin && !isThree) return;

  const isHtml =
    req.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/sw.js") ||
    url.pathname.endsWith("sw.js");

  // HTML + SW: network-first so phone layout fixes land without stale cache.
  if (isHtml && !isThree) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("./lantern.html"))),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && (url.origin === self.location.origin || isThree)) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
