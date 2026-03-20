
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Intercept calls to Gemini API
  if (url.hostname === 'generativelanguage.googleapis.com') {
    // Redirect to local proxy
    const proxyUrl = `/api-proxy${url.pathname}${url.search}`;
    
    event.respondWith((async () => {
      try {
        const body = (event.request.method !== 'GET' && event.request.method !== 'HEAD')
          ? await event.request.clone().arrayBuffer()
          : undefined;

        // Clone headers to ensure we don't lose anything
        const headers = new Headers();
        for (const [key, value] of event.request.headers.entries()) {
          headers.append(key, value);
        }

        // Use a persistent fetch to avoid termination issues
        const response = await fetch(proxyUrl, {
          method: event.request.method,
          headers: headers,
          body: body,
          mode: 'same-origin',
          credentials: 'omit',
          // Ensure the connection stays open for long-running requests
          keepalive: true 
        });

        // If proxy returns 404 (not found) or 500 (server error), attempt direct fallback
        if (response.status === 404 || response.status === 500) {
          console.warn(`Service Worker: Proxy returned ${response.status}, falling back to direct call.`);
          return fetch(event.request);
        }

        return response;
      } catch (error) {
        console.error('Service Worker: Proxy fetch failed:', error);
        // Fallback to original request if proxy fails
        return fetch(event.request);
      }
    })());
  }
});
