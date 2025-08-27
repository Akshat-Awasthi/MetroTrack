
"use client";

import { Train } from 'lucide-react';
import type { Station } from '@/types';
import { cn } from '@/lib/utils';

interface JourneyTrackerProps {
  route: Station[];
  closestStation: Station | null;
}

export function JourneyTracker({ route, closestStation }: JourneyTrackerProps) {
  const closestStationIndex = closestStation ? route.findIndex(s => s.id === closestStation.id) : -1;
  const isFinished = closestStationIndex === route.length - 1;
  
  return (
    <div className="relative pl-8 pr-4 py-4">
      {/* Vertical timeline bar */}
      <div className="absolute top-0 left-8 w-1 bg-primary/20 h-full" />
      
      {/* Train Icon representing current position */}
      {closestStationIndex !== -1 && !isFinished && (
         <div className="absolute left-[21px] -translate-y-1/2 z-10" style={{ top: `${((closestStationIndex + 0.5) / route.length) * 100}%`}}>
            <div className="bg-primary rounded-full p-1.5 shadow-lg border-2 border-background">
                <Train className="h-5 w-5 text-primary-foreground" />
            </div>
         </div>
      )}


      <ul className="space-y-8">
        {route.map((station, index) => {
          const hasBeenVisited = closestStationIndex !== -1 && index <= closestStationIndex;
          
          return (
            <li key={station.id} className="relative flex items-center">
              {/* Station Dot */}
              <div 
                className={cn(
                  "absolute left-0 -translate-x-1/2 w-4 h-4 rounded-full border-2",
                  hasBeenVisited ? "bg-primary border-primary-foreground" : "bg-background border-primary/50"
                )} 
                style={{ left: '0.9rem' }}
              />
              
              {/* Station Name */}
              <div className={cn(
                "ml-8 text-sm",
                hasBeenVisited ? "font-semibold text-foreground" : "text-muted-foreground"
              )}>
                <p>{station.name}</p>
                {index === 0 && <p className="text-xs text-muted-foreground">Start</p>}
                {index === route.length - 1 && <p className="text-xs text-muted-foreground">Destination</p>}
              </div>

              {/* Status Indicator */}
              {closestStation?.id === station.id && (
                  <div className="ml-auto text-xs font-bold text-primary animate-pulse">
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
