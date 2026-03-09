const CACHE_NAME = "imperial-v2";
const STATIC_ASSETS = [
  "/",
  "/login",
  "/deliveries",
  "/history",
  "/route",
  "/profile",
  "/manifest.webmanifest",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

// Instalar: cachear assets estaticos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activar: limpiar caches antiguos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: estrategia diferenciada
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Solo cachear requests HTTP/HTTPS (ignorar chrome-extension, etc.)
  if (!url.protocol.startsWith("http")) return;

  // No cachear requests a Supabase, APIs ni Server Actions
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("supabase") ||
    event.request.headers.get("Next-Action")
  ) {
    return;
  }

  // Assets estaticos (_next/static): cache first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Paginas y otros recursos: network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Fallback para paginas de navegacion
          if (event.request.mode === "navigate") {
            return caches.match("/deliveries");
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});
