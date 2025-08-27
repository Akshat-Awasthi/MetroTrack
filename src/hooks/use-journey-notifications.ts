
"use client";

import { useEffect, useRef } from 'react';
import type { Station } from '@/types';

function showNotification(title: string, body: string) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'show-notification',
      payload: { title, body },
    });
  } else {
    // Fallback for when service worker is not active
    new Notification(title, { 
        body,
        tag: 'journey-notification',
        // renotify: true,
        icon: '/icon-192x192.png',
     });
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
