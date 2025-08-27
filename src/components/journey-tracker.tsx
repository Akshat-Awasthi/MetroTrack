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
  const closestStationOnRoute = currentLocation ? findNearestStationOnRoute(currentLocation, route) : null;
  const closestStationIndex = closestStationOnRoute 
    ? route.findIndex(s => s.id === closestStationOnRoute.id) 
    : -1;

  const isFinished = closestStationIndex === route.length - 1;
  
  return (
    <div className="relative pl-8 pr-4 py-4">
      <div className="absolute top-0 left-4 w-1 bg-primary/10 h-full rounded-full" />
      
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

      <ul className="space-y-6">
        {route.map((station, index) => {
          const hasBeenVisited = closestStationIndex !== -1 && index <= closestStationIndex;
          const isCurrent = closestStationOnRoute?.id === station.id;
          const isStart = index === 0;
          const isEnd = index === route.length - 1;
          
          return (
            <li key={station.id} className="relative flex items-center min-h-[40px]">
              <div 
                className={cn(
                  "absolute left-0 -translate-x-1/2 w-4 h-4 rounded-full border-2 flex items-center justify-center z-10",
                  hasBeenVisited ? "bg-primary border-background" : "bg-background border-primary/20"
                )} 
                style={{ left: '1rem' }}
              >
                {(isStart || (isEnd && hasBeenVisited)) && <MapPin className="h-2 w-2 text-primary-foreground" />}
              </div>
              
              <div className={cn(
                "ml-8 text-sm transition-colors",
                hasBeenVisited ? "font-semibold text-foreground" : "text-muted-foreground"
              )}>
                <p>{station.name}</p>
                {isStart && <p className="text-xs text-muted-foreground -mt-1">Start</p>}
                {isEnd && <p className="text-xs text-muted-foreground -mt-1">Destination</p>}
              </div>

              {isCurrent && (
                  <div className="ml-auto text-xs font-bold text-primary animate-pulse text-right">
                      {isFinished ? 'ARRIVED' : 'CURRENT'}
                  </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
