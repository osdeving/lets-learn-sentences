const BASE = new URL("./", self.location.href).pathname;
const local = path => BASE + path;
const PREFIX = "ouvir-ingles@" + BASE + ":";
const CACHE = PREFIX + "ouvir-ingles-listening-v5";
const MANIFEST = local("offline-manifest.json");

async function manifest() {
  const response = await fetch(MANIFEST, { cache: "no-store" });
  if (!response.ok) throw new Error("Manifesto offline indisponível");
  return response.json();
}

async function audioMatches(response, file) {
  if (!response || response.status !== 200 || !file.sha256) return false;
  const bytes = await response.clone().arrayBuffer();
  if (bytes.byteLength !== file.bytes) return false;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  return hash === file.sha256;
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const data = await manifest();
    const cache = await caches.open(CACHE);
    await cache.addAll(data.files.filter(file => !file.audio).map(file => file.url));
    // Keep previously downloaded recordings when only the app changes. Verify
    // actual bytes, including upgrades from older manifests without file hashes.
    const oldKeys = (await caches.keys()).filter(key => (key.startsWith(PREFIX) || (BASE === "/" && key.startsWith("ouvir-ingles-") && !key.includes("/"))) && key !== CACHE);
    for (const file of data.files.filter(file => file.audio)) {
      if (await cache.match(file.url)) continue;
      for (const key of oldKeys) {
        const previous = await (await caches.open(key)).match(file.url);
        if (await audioMatches(previous, file)) {
          await cache.put(file.url, previous);
          break;
        }
      }
    }
    await cache.put(MANIFEST, new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } }));
    await cache.put(BASE, await cache.match(local("index.html")));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => (key.startsWith(PREFIX) || (BASE === "/" && key.startsWith("ouvir-ingles-") && !key.includes("/"))) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

// A cached full file must still answer native HTMLAudioElement range requests.
async function rangedResponse(response, range) {
  const buffer = await response.arrayBuffer();
  const length = buffer.byteLength;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${length}` } });
  const start = match[1] ? Number(match[1]) : Math.max(0, length - Number(match[2]));
  const end = match[1] ? (match[2] ? Math.min(Number(match[2]), length - 1) : length - 1) : length - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= length) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${length}` } });
  const headers = new Headers(response.headers);
  headers.delete("Content-Encoding");
  headers.set("Content-Range", `bytes ${start}-${end}/${length}`);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Length", String(end - start + 1));
  return new Response(buffer.slice(start, end + 1), { status: 206, headers });
}
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin || !new URL(request.url).pathname.startsWith(BASE)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request.url);
    const path = new URL(request.url).pathname;
    const range = request.headers.get("Range");
    if (cached && range) return rangedResponse(cached, range);
    if (cached && (path.startsWith(local("audio/")) || path.startsWith(local("assets/")))) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && response.status === 200) await cache.put(request, response.clone());
      return response;
    } catch {
      if (cached) return cached;
      if (request.mode === "navigate") {
        const shell = await cache.match(local("index.html"));
        if (shell) return shell;
      }
      return new Response("Arquivo ainda não preparado para uso offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type !== "PREPARE_OFFLINE") return;
  const port = event.ports[0];
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      const existing = await cache.match(MANIFEST);
      const data = existing ? await existing.json() : await manifest();
      let cursor = 0, done = 0;
      const errors = [];
      const worker = async () => {
        while (cursor < data.files.length) {
          const file = data.files[cursor++];
          try {
            if (!(await cache.match(file.url))) {
              const response = await fetch(file.url, { cache: "reload" });
              if (!response.ok || response.status !== 200) throw new Error(`Falha em ${file.url}`);
              await cache.put(file.url, response);
            }
            done++;
            port?.postMessage({ type: "progress", done, total: data.files.length });
          } catch { errors.push(file.url); }
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      if (errors.length) throw new Error(`${errors.length} arquivos faltaram. Tente novamente para completar o modo offline.`);
      port?.postMessage({ type: "complete" });
    } catch (error) { port?.postMessage({ type: "error", message: error.message }); }
    finally { port?.close(); }
  })());
});
