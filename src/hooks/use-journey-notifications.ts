"use client";

import { useEffect, useRef } from 'react';
import type { Station } from '@/types';

async function showNotification(
  title: string,
  body: string,
  options: {
    image?: string;
    data?: any;
  } = {}
) {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const notificationOptions: any = {
        body,
        tag: 'journey-notification',
        renotify: true,
        icon: '/icon.png',
        badge: '/icon.png',
        vibrate: [200, 100, 200],
        requireInteraction: false,
        silent: false,
        data: options.data || {},
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
        image: options.image,
      };

      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(title, options as any);
        return;
      }

      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'show-notification',
          payload: { title, body, ...options },
        });
        return;
      }
    } catch (err) {
      console.error('showNotification (service worker) failed:', err);
    }
  }

  try {
    new Notification(title, {
      body,
      tag: 'journey-notification',
      renotify: true,
      icon: '/icon.png',
      badge: '/icon.png',
      vibrate: [200, 100, 200],
      data: options.data || {},
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
    if ('serviceWorker' in navigator) {
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

    // Enhanced notification body with better formatting
    const stationNumber = currentIndex + 1;
    const totalStations = route.length;
    
    let body = `🚉 Station ${stationNumber} of ${totalStations}\n\n`;
    body += `⬅️ Previous: ${previousStation ? previousStation.name : 'Start'}\n`;
    body += `➡️ Next: ${nextStation ? nextStation.name : 'Final Destination'}`;

    const title = `📍 Arrived: ${currentStation.name}`;

    const progress = Math.round((stationNumber / totalStations) * 100);

    showNotification(title, body, {
      data: {
        stationId: currentStation.id,
        progress,
        currentIndex,
        totalStations,
      }
    });
  }, [route, currentStation]);
}