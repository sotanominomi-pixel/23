const CACHE_NAME = 'nclock-v3';
const URLS = ['/', '/index.html', '/app.js', '/styles.css'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(URLS)));
});
self.addEventListener('fetch', e=>{
  e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request)));
});

/* Optional: respond to messages from page to show notifications (if scheduled there) */
self.addEventListener('message', (event)=>{
  const data = event.data;
  if(data && data.type === 'showNotification'){
    const options = { body: data.body || '', tag: data.tag || undefined, renotify: true, data: data.data || {} };
    self.registration.showNotification(data.title || 'N Clock', options);
  }
});
