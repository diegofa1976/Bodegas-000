
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
    console.log('Service Worker: Intercepting Gemini API call:', url.href);
    
    // Redirect to local proxy
    // Original: https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=...
    // Target: /api-proxy/models/gemini-pro:generateContent
    
    const targetPath = url.pathname.slice(1);
    const proxyUrl = `/api-proxy/${targetPath}${url.search}`;
    
    console.log('Service Worker: Proxying to:', proxyUrl);
    
    event.respondWith((async () => {
      try {
        const body = (event.request.method !== 'GET' && event.request.method !== 'HEAD')
          ? await event.request.clone().arrayBuffer()
          : undefined;

        return await fetch(proxyUrl, {
          method: event.request.method,
          headers: event.request.headers,
          body: body,
          mode: 'same-origin',
          credentials: 'omit'
        });
      } catch (error) {
        console.error('Service Worker: Proxy fetch failed:', error);
        return fetch(event.request); // Fallback to original request if proxy fails
      }
    })());
  }
});
