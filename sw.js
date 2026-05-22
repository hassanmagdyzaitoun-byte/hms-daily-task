const CACHE_NAME = 'hms-daily-task-cache-v4'; // تم تغيير الإصدار لإجبار الهاتف على التحديث

// قائمة الملفات والمكتبات الأساسية التي نريد حفظها في الهاتف فوراً
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  // المكتبات الخارجية
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // استخدام catch لتجنب توقف التثبيت إذا فشل تحميل ملف خارجي
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.log('فشل حفظ:', url)))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache); // حذف النسخة القديمة من الكاش
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // تخطي الطلبات التي ليست من نوع http أو https
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // إرجاع الملف من الكاش إذا كنا أوفلاين وكان موجوداً
      if (cachedResponse) {
        return cachedResponse; 
      }

      // إذا لم يكن في الكاش، نجلبه من الإنترنت ونحفظه للمرات القادمة (Dynamic Caching)
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          // إذا كان الطلب لموقع خارجي (مثل ملفات الخطوط الفرعية) نحفظه أيضاً
          if (networkResponse && networkResponse.type === 'opaque') {
             const responseToCache = networkResponse.clone();
             caches.open(CACHE_NAME).then((cache) => {
               cache.put(event.request, responseToCache);
             });
          }
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // يتم تجاهل الخطأ بصمت لكي لا يتوقف التطبيق
      });
    })
  );
});
