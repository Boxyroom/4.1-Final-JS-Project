/* Lantern Hollow game folder — lightweight offline cache */
const CACHE = "lantern-hollow-game-v9";
const PRECACHE = [
  "./",
  "./play.html",
  "./index.html",
  "./manifest.webmanifest",
  "./style.css",
  "./cgi.js",
  "./game.js",
  "./assets/ancient-relic.png",
  "./assets/forest-floor.webp",
  "./assets/forest-floor.png",
  "./assets/weapon-crate.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-512-maskable.png",
  "./assets/icons/icon-180.png",
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
].map((n) => `./assets/sfx/${n}.ogg`);

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
      .then(() => self.clients.claim()),
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
    url.pathname.endsWith("sw.js");

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
        .catch(() => caches.match(req).then((c) => c || caches.match("./play.html"))),
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
