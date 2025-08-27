
"use client";

import { Train, MapPin } from 'lucide-react';
import type { Station } from '@/types';
import { cn, findNearestStationOnRoute } from '@/lib/utils';
import * as React from 'react';

interface JourneyTrackerProps {
  route: Station[];
  currentLocation: { latitude: number; longitude: number } | null;
}

export function JourneyTracker({ route, currentLocation }: JourneyTrackerProps) {
  // Find the closest station on the current route to the user's live location.
  const closestStationOnRoute = currentLocation ? findNearestStationOnRoute(currentLocation, route) : null;
  
  // Find the index of that closest station within the route array.
  // This is the key step to determine how far along the journey the user is.
  const closestStationIndex = closestStationOnRoute 
    ? route.findIndex(s => s.id === closestStationOnRoute.id) 
    : -1;

  const isFinished = closestStationIndex === route.length - 1;
  
  return (
    <div className="relative pl-8 pr-4 py-4">
      {/* Vertical timeline bar */}
      <div className="absolute top-0 left-4 w-1 bg-primary/10 h-full rounded-full" />
      
      {/* Train Icon representing current position */}
      {closestStationIndex !== -1 && !isFinished && (
         <div 
           className="absolute left-[9px] -translate-y-1/2 z-10 transition-all duration-1000 ease-in-out" 
           style={{ top: `${((closestStationIndex) / (route.length - 1)) * 100}%`}}
          >
            <div className="bg-primary rounded-full p-1.5 shadow-lg border-2 border-background">
                <Train className="h-5 w-5 text-primary-foreground" />
            </div>
         </div>
      )}

      <ul className="space-y-8">
        {route.map((station, index) => {
          // A station has been visited if its index is less than or equal to the closest station's index.
          // This ensures all progress up to the nearest station is shown.
          const hasBeenVisited = closestStationIndex !== -1 && index <= closestStationIndex;
          const isCurrent = closestStationOnRoute?.id === station.id;
          const isStart = index === 0;
          const isEnd = index === route.length - 1;
          
          return (
            <li key={station.id} className="relative flex items-center">
              {/* Station Dot / Icon */}
              <div 
                className={cn(
                  "absolute left-0 -translate-x-1/2 w-4 h-4 rounded-full border-2 flex items-center justify-center z-10",
                  hasBeenVisited ? "bg-primary border-background" : "bg-background border-primary/20"
                )} 
                style={{ left: '1rem' }}
              >
                {(isStart || (isEnd && hasBeenVisited)) && <MapPin className="h-2 w-2 text-primary-foreground" />}
              </div>
              
              {/* Station Name */}
              <div className={cn(
                "ml-8 text-sm transition-colors",
                hasBeenVisited ? "font-semibold text-foreground" : "text-muted-foreground"
              )}>
                <p>{station.name}</p>
                {isStart && <p className="text-xs text-muted-foreground">Start</p>}
                {isEnd && <p className="text-xs text-muted-foreground">Destination</p>}
              </div>

              {/* Status Indicator */}
              {isCurrent && (
                  <div className="ml-auto text-xs font-bold text-primary animate-pulse">
                      {isFinished ? 'ARRIVED' : 'CURRENT STATION'}
                  </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
