
"use client";

import { useEffect, useRef } from 'react';
import type { Station } from '@/types';

async function showNotification(title: string, body: string) {
  // Prefer showing via the ServiceWorkerRegistration (works even when
  // navigator.serviceWorker.controller is not yet set). This is the most
  // reliable way for PWAs on mobile to display notifications.
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const options: any = {
        body,
        tag: 'journey-notification',
        renotify: true,
        icon: '/icon-192x192.png',
      };

      if (registration && typeof registration.showNotification === 'function') {
        // Use the registration API which displays a notification from the
        // service worker context (works in PWAs and when the page isn't
        // controlled yet).
        await registration.showNotification(title, options as any);
        return;
      }

      // If we couldn't get a registration, try sending a message to the
      // active controller (older flow). Some environments may support this.
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'show-notification',
          payload: { title, body },
        });
        return;
      }
    } catch (err) {
      // continue to fallback to Notification API
      console.error('showNotification (service worker) failed:', err);
    }
  }

  // Final fallback: direct Notification from the page. This requires
  // permission and may be blocked on some mobile browsers in PWA mode,
  // but it's better than nothing.
  try {
    new Notification(title, {
      body,
      tag: 'journey-notification',
      renotify: true,
      icon: '/icon-192x192.png',
    } as any);
  } catch (err) {
    console.error('showNotification (Notification API) failed:', err);
  }
}

export function useJourneyNotifications(
  route: Station[] | null,
  currentStation: Station | null
) {
  const lastNotifiedStationId = useRef<string | null>(null);

  useEffect(() => {
    if ('serviceWorker'in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.error('Service Worker registration failed:', err);
        });
    }
  }, []);

  useEffect(() => {
    if (!route || !currentStation) {
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }
    
    // Only notify if the station has changed
    if (currentStation.id === lastNotifiedStationId.current) {
        return;
    }

    lastNotifiedStationId.current = currentStation.id;

    const currentIndex = route.findIndex(s => s.id === currentStation.id);
    if (currentIndex === -1) {
      return;
    }

    const previousStation = currentIndex > 0 ? route[currentIndex - 1] : null;
    const nextStation = currentIndex < route.length - 1 ? route[currentIndex + 1] : null;

    let body = `Previous: ${previousStation ? previousStation.name : 'Start'}\n`;
    body += `Next: ${nextStation ? nextStation.name : 'Destination'}`;

    const title = `📍 Current Station: ${currentStation.name}`;

    showNotification(title, body);

  }, [route, currentStation]);
}
