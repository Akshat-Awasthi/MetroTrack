
"use client";

import { useState, useEffect, useRef } from 'react';

interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  timestamp: number;
}

interface GeolocationError {
  code: number;
  message: string;
}

export function useGeolocation(options: PositionOptions = {}) {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);

  // We need to manage the active options locally to support fallback
  const [activeOptions, setActiveOptions] = useState(options);
  const hasTriedFallback = useRef(false);

  // Reset fallback state if external options change
  useEffect(() => {
    setActiveOptions(options);
    hasTriedFallback.current = false;
  }, [options]);

  const [retryCount, setRetryCount] = useState(0);

  const refetch = () => {
    setError(null);
    hasTriedFallback.current = false;
    setActiveOptions(options);
    setRetryCount(prev => prev + 1);
  };

  useEffect(() => {
    let watchId: number;

    const onSuccess = (pos: GeolocationPosition) => {
      setPosition(pos);
      setError(null);
    };

    const onError = (err: GeolocationError) => {
      // If high accuracy failed (TIMEOUT or UNAVAILABLE), try low accuracy
      // Code 2: POSITION_UNAVAILABLE, Code 3: TIMEOUT
      if (activeOptions.enableHighAccuracy && !hasTriedFallback.current && (err.code === 2 || err.code === 3)) {
        // eslint-disable-next-line no-console
        console.warn('Geolocation high accuracy failed, falling back to low accuracy.');
        hasTriedFallback.current = true;
        setActiveOptions(prev => ({ ...prev, enableHighAccuracy: false, timeout: 10000, maximumAge: 10000 }));
        // Do not set error yet, give fallback a chance
      } else {
        // Only set error state for PERMISSION_DENIED (code 1).
        // For POSITION_UNAVAILABLE (2) and TIMEOUT (3), we keep the error null
        // so the UI shows "Acquiring signal..." instead of a hard failure.
        // The watchPosition loop continues to try in the background.
        if (err.code === 1) {
          setError(err.message);
        } else {
          console.warn(`Geolocation error (code ${err.code}): ${err.message}`);
          // Optionally clear any stale error if we are just waiting/retrying
          setError(null);
        }
      }
    };

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(onSuccess, onError, activeOptions);
    } else {
      setError('Geolocation is not supported by this browser.');
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [activeOptions, retryCount]);

  return { position, error, refetch };
}
