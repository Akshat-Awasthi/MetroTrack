
"use client";

import * as React from "react";
import { ArrowRight, Compass, LoaderCircle, MapPin, Search, Train, Wind } from "lucide-react";

import { useGeolocation } from "@/hooks/use-geolocation";
import { type Station, type MetroLine, metroLines, stations } from "@/lib/delhi-metro-data";
import { haversineDistance, findJourneyRoute } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { MetroTrackLogo } from "@/components/icons";
import { AmenityFinder } from "@/components/amenity-finder";
import { JourneyTracker } from "@/components/journey-tracker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { StationCombobox } from "@/components/station-combobox";


const MAP_BOUNDS = {
  minLat: 28.4,
  maxLat: 28.8,
  minLng: 77.0,
  maxLng: 77.4,
};

const MAP_DIMENSIONS = {
  width: 800,
  height: 800,
};

const toMapCoords = (lat: number, lng: number) => {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * MAP_DIMENSIONS.width;
  const y = ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * MAP_DIMENSIONS.height;
  return { x, y };
};

export default function Home() {
  const { position, error } = useGeolocation();
  const [closestStation, setClosestStation] = React.useState<Station | null>(null);
  
  // Journey state
  const [fromStationId, setFromStationId] = React.useState<string | null>(null);
  const [toStationId, setToStationId] = React.useState<string | null>(null);
  const [journey, setJourney] = React.useState<{ from: Station; to: Station; route: Station[] } | null>(null);
  
  // Map interaction state
  const [scale, setScale] = React.useState(1);
  const [translate, setTranslate] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [startDrag, setStartDrag] = React.useState({ x: 0, y: 0 });

  const { toast } = useToast();
  const stationEntries = React.useMemo(() => Object.values(stations), []);
  const sortedStations = React.useMemo(() => [...stationEntries].sort((a, b) => a.name.localeCompare(b.name)), [stationEntries]);

  React.useEffect(() => {
    if (position) {
      let minDistance = Infinity;
      let nearestStation: Station | null = null;
      for (const station of stationEntries) {
        const distance = haversineDistance(position.coords, station.coordinates);
        if (distance < minDistance) {
          minDistance = distance;
          nearestStation = station;
        }
      }
      setClosestStation(nearestStation);
    }
  }, [position, stationEntries]);

  const handleStartJourney = () => {
    if (fromStationId && toStationId) {
       const route = findJourneyRoute(fromStationId, toStationId);
       if(route && route.length > 0) {
         setJourney({
           from: stations[fromStationId],
           to: stations[toStationId],
           route: route,
         });
       } else {
          toast({
            variant: "destructive",
            title: "Route Not Found",
            description: "Could not find a metro route between the selected stations.",
          });
          console.error("Could not find a route between the selected stations.");
       }
    }
  };

  const handleEndJourney = () => {
    setJourney(null);
    setFromStationId(null);
    setToStationId(null);
  };
  
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    if (e.deltaY < 0) {
      // Zoom in
      setScale(prev => Math.min(prev * zoomFactor, 5));
    } else {
      // Zoom out
      setScale(prev => Math.max(prev / zoomFactor, 0.5));
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setStartDrag({ x: e.clientX - translate.x, y: e.clientY - translate.y });
    e.currentTarget.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      setTranslate({
        x: e.clientX - startDrag.x,
        y: e.clientY - startDrag.y
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(false);
     e.currentTarget.style.cursor = 'grab';
  };
  
  const userMapPos = position ? toMapCoords(position.coords.latitude, position.coords.longitude) : null;
  
  return (
    <main className="h-[100dvh] w-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <header className="flex items-center justify-between p-4 bg-background border-b shadow-sm z-10">
        <div className="flex items-center gap-2">
          <MetroTrackLogo className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold font-headline text-primary">MetroTrack Delhi</h1>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Search className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Amenity Locator</SheetTitle>
              <SheetDescription>
                Find restrooms, ATMs, and more at your station.
              </SheetDescription>
            </SheetHeader>
            <AmenityFinder />
          </SheetContent>
        </Sheet>
      </header>

      <div 
        className="flex-1 relative overflow-hidden cursor-grab"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
         <div className="absolute inset-0 grid grid-cols-10 grid-rows-10">
            {[...Array(100)].map((_, i) => (
                <div key={i} className="border border-gray-200 dark:border-gray-800"></div>
            ))}
         </div>
        
        <div
          className="absolute top-1/2 left-1/2 transition-transform duration-100 ease-linear"
          style={{ 
            width: MAP_DIMENSIONS.width, 
            height: MAP_DIMENSIONS.height,
            transform: `translate(-50%, -50%) translate(${translate.x}px, ${translate.y}px) scale(${scale})`
          }}
        >
          <svg
            width={MAP_DIMENSIONS.width}
            height={MAP_DIMENSIONS.height}
            viewBox={`0 0 ${MAP_DIMENSIONS.width} ${MAP_DIMENSIONS.height}`}
            className="pointer-events-none"
          >
            {metroLines.map((line) => {
              const pathData = line.stations
                .map((stationId) => {
                  const station = stations[stationId];
                  if (!station) return "";
                  const { x, y } = toMapCoords(station.coordinates.lat, station.coordinates.lng);
                  return `${x},${y}`;
                })
                .join(" L ");
              return (
                <path
                  key={line.id}
                  d={`M ${pathData}`}
                  stroke={line.color}
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
            
            {stationEntries.map((station) => {
              const { x, y } = toMapCoords(station.coordinates.lat, station.coordinates.lng);
              const isClosest = closestStation?.id === station.id;
              const isJourneyEndpoint = journey?.from.id === station.id || journey?.to.id === station.id;
              
              return (
                <g key={station.id}>
                   <circle
                    cx={x}
                    cy={y}
                    r={isClosest || isJourneyEndpoint ? "6" : "4"}
                    fill={isClosest || isJourneyEndpoint ? "hsl(var(--accent))" : "white"}
                    stroke="hsl(var(--primary))"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}
            
            {userMapPos && (
               <g transform={`translate(${userMapPos.x}, ${userMapPos.y})`}>
                  <circle cx="0" cy="0" r="6" fill="hsl(var(--primary))" />
                  <circle cx="0" cy="0" r="6" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" strokeWidth="2" strokeOpacity="0.5">
                      <animate attributeName="r" from="6" to="12" dur="1s" begin="0s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="1" to="0" dur="1s" begin="0s" repeatCount="indefinite" />
                  </circle>
              </g>
            )}
          </svg>
        </div>
      </div>

      <Sheet modal={false} open={true}>
        <SheetContent 
          side="bottom" 
          hideCloseButton 
          className={journey ? "h-[90vh] rounded-t-lg" : "h-auto max-h-[50vh] rounded-t-lg"}
        >
          <SheetHeader className="pt-4">
             <SheetTitle className="text-center font-headline">
                {journey ? "Journey Details" : "Plan Your Journey"}
             </SheetTitle>
          </SheetHeader>
          <div className="p-4 overflow-y-auto h-full">
            {!journey ? (
              // Journey Selection UI
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <StationCombobox
                      stations={sortedStations}
                      value={fromStationId}
                      onSelect={setFromStationId}
                      placeholder="From Station"
                    />
                    <StationCombobox
                      stations={sortedStations.filter(s => s.id !== fromStationId)}
                      value={toStationId}
                      onSelect={setToStationId}
                      placeholder="To Station"
                      disabled={!fromStationId}
                    />
                </div>
                <Button className="w-full" onClick={handleStartJourney} disabled={!fromStationId || !toStationId}>
                    <Train className="mr-2 h-4 w-4" />
                    Start Journey
                </Button>
                 {!position && !error && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-4">
                      <LoaderCircle className="animate-spin h-8 w-8 mb-4" />
                      <p>Acquiring GPS signal...</p>
                      <p className="text-xs mt-1">Enable location services for live tracking.</p>
                    </div>
                  )}

                  {error && (
                     <div className="flex flex-col items-center justify-center h-full text-destructive py-4">
                       <Compass className="h-8 w-8 mb-4" />
                       <p className="font-semibold">{error}</p>
                    </div>
                  )}
              </div>
            ) : (
               // Journey Tracking UI
               <div className="space-y-4 flex flex-col h-[calc(100%-4rem)]">
                 <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">From</p>
                            <p className="font-bold">{journey.from.name}</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-primary" />
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">To</p>
                            <p className="font-bold">{journey.to.name}</p>
                        </div>
                    </CardContent>
                 </Card>

                 <ScrollArea className="flex-1">
                   <JourneyTracker 
                    route={journey.route}
                    closestStation={closestStation}
                   />
                 </ScrollArea>
                
                 <Button variant="destructive" className="w-full" onClick={handleEndJourney}>
                    End Journey
                 </Button>
               </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
