"use client";

import { Train, MapPin } from 'lucide-react';
import type { Station } from '@/types';
import { cn, findNearestStationOnRoute } from '@/lib/utils';
import * as React from 'react';
import { metroLines } from '@/lib/delhi-metro-data';

interface JourneyTrackerProps {
  route: Station[];
  currentLocation: { latitude: number; longitude: number } | null;
  nearestStationOverride?: Station | null;
}

export function JourneyTracker({ route, currentLocation, nearestStationOverride }: JourneyTrackerProps) {
  // If we don't yet have a GPS fix, fall back to showing the start station
  // as the current position so the user sees progress immediately.
  const fallbackStation = route && route.length > 0 ? route[0] : null;

  // Prefer a nearestStationOverride (provided by parent) when GPS is not available,
  // otherwise use GPS coords to compute nearest station on the route. If neither is
  // available, fall back to the route start.
  const closestStationOnRoute = currentLocation
    ? findNearestStationOnRoute(currentLocation, route)
    : (nearestStationOverride ?? fallbackStation);

  // Debug logging
  React.useEffect(() => {
    console.log('JourneyTracker - Current Location:', currentLocation);
    console.log('JourneyTracker - Nearest Station Override:', nearestStationOverride);
    console.log('JourneyTracker - Closest Station on Route:', closestStationOnRoute?.name);
  }, [currentLocation, nearestStationOverride, closestStationOnRoute]);

  const closestStationIndex = closestStationOnRoute
    ? route.findIndex(s => s.id === closestStationOnRoute.id)
    : -1;

  const isFinished = closestStationIndex === route.length - 1;
  // build a quick map of line id -> color
  const lineColorMap = React.useMemo(() => {
    const m: Record<string, string> = {};
    for (const l of metroLines) {
      m[l.id] = l.color;
    }
    return m;
  }, []);

  // For each segment between station[i] and station[i+1], determine the line id
  // to use for that segment. Prefer a common line between the two stations; if
  // none, fall back to the first line declared on station[i]. Also compute
  // whether the boundary is a transfer (line change).
  const segments = React.useMemo(() => {
    const segs: Array<{ lineId: string | null }> = [];
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i];
      const b = route[i + 1];
      const aLines = (a as any).lines ?? [];
      const bLines = (b as any).lines ?? [];
      const common = aLines.find((l: string) => bLines.includes(l));
      const lineId = common ?? (aLines.length > 0 ? aLines[0] : (bLines.length > 0 ? bLines[0] : null));
      segs.push({ lineId });
    }
    return segs;
  }, [route]);

  // compute transfer boundaries: a transfer occurs at station index j when
  // the segment before it and after it have different lineIds.
  const transferStations = React.useMemo(() => {
    const set = new Set<number>();
    for (let i = 0; i < segments.length - 1; i++) {
      const cur = segments[i]?.lineId ?? null;
      const next = segments[i + 1]?.lineId ?? null;
      if (cur && next && cur !== next) {
        // transfer happens at station i+1 (boundary between segment i and i+1)
        set.add(i + 1);
      }
    }
    return set;
  }, [segments]);
  // Refs and measurements to map station DOM positions to track segments so the
  // colored bars align exactly with the station markers in the list.
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const stationRefs = React.useRef<Record<number, HTMLLIElement | null>>({});
  const [stationTops, setStationTops] = React.useState<number[]>([]);

  // No gap: keep the track continuous. Transfer badges are shown inline
  // next to station names so we don't need to break the colored track.
  // (Previously we experimented with a visual gap; user requested no break.)
  const GAP_PX = 0;
  const GAP_HALF = 0;

  React.useEffect(() => {
    function measure() {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const tops: number[] = [];
      for (let i = 0; i < route.length; i++) {
        const el = stationRefs.current[i];
        if (el) {
          const r = el.getBoundingClientRect();
          tops[i] = r.top - containerRect.top + r.height / 2; // center of marker
        } else {
          tops[i] = (i / Math.max(1, route.length - 1)) * containerRect.height;
        }
      }
      setStationTops(tops);
    }

    measure();
    window.addEventListener('resize', measure);
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      window.removeEventListener('resize', measure);
      ro.disconnect();
    };
  }, [route]);
  
  return (
    <div ref={containerRef} className="relative pl-8 pr-4 py-4">
      {/* segmented colored track (left) */}
      <div className="absolute top-0 left-4 w-1 h-full">
        {stationTops.length === route.length ? (
          // draw each segment between measured station centers (continuous track)
          segments.map((s, i) => {
            const container = containerRef.current;
            const containerHeight = container ? container.getBoundingClientRect().height : 1;
            const topPx = stationTops[i];
            const bottomPx = stationTops[i + 1] ?? containerHeight;
            const topPct = (topPx / containerHeight) * 100;
            const heightPct = ((bottomPx - topPx) / containerHeight) * 100;
            const opacity = 1;
            return (
              <div
                key={i}
                className="absolute left-0 w-full"
                style={{
                  top: `${topPct}%`,
                  height: `${heightPct}%`,
                  backgroundColor: s.lineId ? lineColorMap[s.lineId] : undefined,
                  opacity,
                }}
              />
            );
          })
        ) : (
          // fallback: even segments as before
          segments.map((s, i) => {
            const top = (i / (route.length - 1)) * 100;
            const height = (1 / (route.length - 1)) * 100;
            const opacity = 1;
            return (
              <div
                key={i}
                className={`absolute left-0 w-full`}
                style={{
                  top: `${top}%`,
                  height: `${height}%`,
                  backgroundColor: s.lineId ? lineColorMap[s.lineId] : undefined,
                  opacity,
                }}
              />
            );
          })
        )}
      </div>
      {/* transfer badges are rendered inline next to station names so they
          appear at the exact same vertical position as the station and do
          not overlap the broken track. */}
      
      {closestStationIndex !== -1 && !isFinished && (
         <div 
           className="absolute -translate-y-1/2 mt-1 z-10 transition-all duration-1000 ease-in-out"
           style={{
             left: '1rem',
             top: stationTops.length === route.length && stationTops[closestStationIndex] !== undefined
               ? `${(stationTops[closestStationIndex] / (containerRef.current?.getBoundingClientRect().height || 1)) * 100}%`
               : `${((closestStationIndex) / Math.max(1, route.length - 1)) * 100}%`,
             transform: 'translateX(-50%) translateY(-50%)'
           }}
          >
            <div
              className="rounded-full p-1.5 ml-1 shadow-lg border-2 border-background"
              style={{ backgroundColor: lineColorMap[route[closestStationIndex]?.lines?.[0] ?? ''] || undefined }}
            >
                <Train className="h-5 w-5 text-white" />
            </div>
         </div>
      )}

      <ul className="space-y-6">
        {route.map((station, index) => {
          const hasBeenVisited = closestStationIndex !== -1 && index <= closestStationIndex;
          const isCurrent = closestStationOnRoute?.id === station.id;
          const isStart = index === 0;
          const isEnd = index === route.length - 1;
          const isTransferStation = transferStations.has(index);

          return (
            <li
              ref={el => { stationRefs.current[index] = el; }}
                key={station.id}
                className="relative flex items-center min-h-[40px]"
              >
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
                <div className="flex items-center gap-3">
                  <p>{station.name}</p>
                  {isTransferStation && (
                    <div className="bg-orange-100 text-orange-700 rounded-lg px-2 py-0.5 border border-orange-300 text-[10px] font-semibold">
                      Change • 5-15 min
                    </div>
                  )}
                </div>
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