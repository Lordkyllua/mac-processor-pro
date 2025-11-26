// Service Worker para MAC Processor Pro
const CACHE_NAME = 'mac-processor-pro-v2.0.1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Evento de instalación
self.addEventListener('install', event => {
  console.log('🛠 Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Service Worker: Cache abierto - Agregando archivos');
        return cache.addAll(urlsToCache)
          .then(() => {
            console.log('✅ Service Worker: Todos los archivos cacheados');
          })
          .catch(error => {
            console.log('❌ Service Worker: Error cacheando archivos:', error);
          });
      })
      .then(() => {
        console.log('🚀 Service Worker: Instalación completada - Activando');
        return self.skipWaiting();
      })
  );
});

// Evento de activación
self.addEventListener('activate', event => {
  console.log('🎯 Service Worker: Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑 Service Worker: Eliminando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Activación completada - Reclamando clientes');
      return self.clients.claim();
    })
  );
});

// Evento de fetch - Manejo de requests
self.addEventListener('fetch', event => {
  // Solo manejar requests GET
  if (event.request.method !== 'GET') {
    return;
  }

  console.log('🌐 Service Worker: Fetching:', event.request.url);

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si encontramos la respuesta en cache, la devolvemos
        if (response) {
          console.log('💾 Service Worker: Sirviendo desde cache:', event.request.url);
          return response;
        }

        // Si no está en cache, hacemos fetch a la red
        console.log('📡 Service Worker: Haciendo fetch a la red:', event.request.url);
        return fetch(event.request)
          .then(fetchResponse => {
            // Verificar si la respuesta es válida
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }

            // Clonar la respuesta porque solo se puede consumir una vez
            const responseToCache = fetchResponse.clone();

            // Agregar la respuesta al cache
            caches.open(CACHE_NAME)
              .then(cache => {
                console.log('💽 Service Worker: Guardando en cache:', event.request.url);
                cache.put(event.request, responseToCache);
              })
              .catch(error => {
                console.log('⚠️ Service Worker: Error guardando en cache:', error);
              });

            return fetchResponse;
          })
          .catch(error => {
            console.log('❌ Service Worker: Error en fetch:', error);
            
            // Para páginas HTML, podrías devolver una página offline personalizada
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
            
            // Para otros recursos, podrías devolver un fallback
            return new Response('Recurso no disponible offline', {
              status: 408,
              statusText: 'Offline'
            });
          });
      })
  );
});

// Evento de mensajes - Para comunicación con la app
self.addEventListener('message', event => {
  console.log('💬 Service Worker: Mensaje recibido:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⏩ Service Worker: Saltando espera...');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_NAME,
      timestamp: new Date().toISOString()
    });
  }
});

// Evento de sync - Para sincronización en background
self.addEventListener('sync', event => {
  console.log('🔄 Service Worker: Sync event:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Función de ejemplo para sync en background
function doBackgroundSync() {
  return Promise.resolve()
    .then(() => {
      console.log('✅ Service Worker: Background sync completado');
    })
    .catch(error => {
      console.log('❌ Service Worker: Error en background sync:', error);
    });
}

// Evento de push - Para notificaciones push
self.addEventListener('push', event => {
  console.log('📲 Service Worker: Push event recibido');
  
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'Nueva actualización disponible',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || './'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'MAC Processor Pro', options)
  );
});

// Evento de click en notificación
self.addEventListener('notificationclick', event => {
  console.log('👆 Service Worker: Click en notificación');
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
  );
});

console.log('👷 Service Worker: Script cargado y listo');
