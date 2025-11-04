self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'journey-notification',
    renotify: true,
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});

// Respond to messages from the page (controller.postMessage) so the page can
// request an immediate notification without depending on navigator.serviceWorker.controller
// being set. The page posts { type: 'show-notification', payload: { title, body } }.
self.addEventListener('message', event => {
  try {
    const data = event.data;
    if (data && data.type === 'show-notification' && data.payload) {
      const { title, body } = data.payload;
      const options = {
        body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'journey-notification',
        renotify: true,
      };
      event.waitUntil(self.registration.showNotification(title, options));
    }
  } catch (err) {
    // swallow errors in SW message handler
    console.error('SW message handler error:', err);
  }
});
