self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon.png',
    badge: '/icon.png',
    tag: 'journey-notification',
    renotify: true,
    vibrate: [200, 100, 200],
    requireInteraction: false,
    silent: false,
    data: data.data || {},
    actions: [
      {
        action: 'view',
        title: '🚉 View Journey',
        icon: '/view.svg'
      },
      {
        action: 'close',
        title: 'Dismiss',
        icon: '/close.svg'
      }
    ],
    image: data.image || undefined,
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
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

self.addEventListener('message', event => {
  try {
    const data = event.data;
    if (data && data.type === 'show-notification' && data.payload) {
      const { title, body, image, data: extraData } = data.payload;
      const options = {
        body,
        icon: '/icon.png',
        badge: '/icon.png',
        tag: 'journey-notification',
        renotify: true,
        vibrate: [200, 100, 200],
        requireInteraction: false,
        silent: false,
        data: extraData || {},
        actions: [
          {
            action: 'view',
            title: '🚉 View Journey',
            icon: '/view.svg'
          },
          {
            action: 'close',
            title: 'Dismiss',
            icon: '/close.svg'
          }
        ],
        image: image || undefined,
      };
      event.waitUntil(self.registration.showNotification(title, options));
    }
  } catch (err) {
    console.error('SW message handler error:', err);
  }
});