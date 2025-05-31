// sw.js

// Nombre del caché
const CACHE_NAME = 'fb-post-deleter-cache-v1';
// Archivos para cachear en la instalación
const urlsToCache = [
  './', // Cachea la página principal (index.html)
  './manifest.json', // Cachea el manifiesto
  // Puedes añadir aquí las rutas a tus íconos si quieres que se cacheen
  // './icon-192x192.png',
  // './icon-512x512.png',
  // Considera cachear Tailwind CSS si no quieres depender siempre de la CDN
  // 'https://cdn.tailwindcss.com' // ¡Cuidado! Cachear recursos de terceros puede ser complicado por las actualizaciones
];

// Evento de instalación: se dispara cuando el Service Worker se instala por primera vez.
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  // Espera hasta que el precaching esté completo.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache abierto, añadiendo archivos al precache.');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Todos los archivos han sido cacheados exitosamente.');
        return self.skipWaiting(); // Fuerza al SW a activarse inmediatamente
      })
      .catch(error => {
        console.error('Service Worker: Falló el precaching durante la instalación:', error);
      })
  );
});

// Evento de activación: se dispara después de que el Service Worker se ha instalado
// y cuando una nueva versión del Service Worker reemplaza a una antigua.
self.addEventListener('activate', event => {
  console.log('Service Worker: Activando...');
  // Elimina cachés antiguas que no coincidan con CACHE_NAME
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Cachés antiguas eliminadas, cliente reclamado.');
      return self.clients.claim(); // Permite que el SW controle las páginas abiertas inmediatamente
    })
  );
});

// Evento fetch: se dispara cada vez que la aplicación PWA realiza una solicitud de red (fetch).
self.addEventListener('fetch', event => {
  // Para las solicitudes a la API de Facebook, siempre ir a la red.
  if (event.request.url.includes('graph.facebook.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Estrategia: Cache-First, luego Network (para assets locales)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si se encuentra en caché, devolver la respuesta del caché
        if (response) {
          console.log('Service Worker: Sirviendo desde caché:', event.request.url);
          return response;
        }
        // Si no está en caché, ir a la red
        console.log('Service Worker: Recurso no encontrado en caché, obteniendo de la red:', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // Opcional: Clonar y guardar la nueva respuesta en caché para futuras solicitudes
            // if (networkResponse && networkResponse.status === 200 && urlsToCache.includes(new URL(event.request.url).pathname.substring(1))) {
            //   const responseToCache = networkResponse.clone();
            //   caches.open(CACHE_NAME)
            //     .then(cache => {
            //       cache.put(event.request, responseToCache);
            //     });
            // }
            return networkResponse;
          }
        ).catch(error => {
          console.error('Service Worker: Error al obtener de la red:', error);
          // Opcional: Podrías devolver una página offline genérica aquí si la red falla
          // if (event.request.mode === 'navigate') {
          //   return caches.match('/offline.html'); // Necesitarías crear un offline.html
          // }
        });
      })
  );
});
