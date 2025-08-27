"use client";

import * as React from "react";
import { ArrowRight, Compass, LoaderCircle, MapPin, Search, Train, Wind, LocateFixed, ZoomIn, ZoomOut, ArrowLeftRight } from "lucide-react";

import { useGeolocation } from "@/hooks/use-geolocation";
import {metroLines, stations } from "@/lib/delhi-metro-data";
import { findNearestStation, findJourneyRoute } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { MetroTrackLogo } from "@/components/icons";
import { AmenityFinder } from "@/components/amenity-finder";
import { JourneyTracker } from "@/components/journey-tracker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { StationCombobox } from "@/components/station-combobox";
import { Station } from "@/types";


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
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  const [translate, setTranslate] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [startDrag, setStartDrag] = React.useState({ x: 0, y: 0 });

  const { toast } = useToast();
  const stationEntries = React.useMemo(() => Object.values(stations), []);
  const sortedStations = React.useMemo(() => [...stationEntries].sort((a, b) => a.name.localeCompare(b.name)), [stationEntries]);

  React.useEffect(() => {
    if (position) {
      const nearestStation = findNearestStation(position.coords);
      setClosestStation(nearestStation);
    }
  }, [position]);

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

  const handleSwapStations = () => {
    setFromStationId(toStationId);
    setToStationId(fromStationId);
  };
  
  const handleEndJourney = () => {
    setJourney(null);
    setFromStationId(null);
    setToStationId(null);
  };
  
  const handleZoom = (zoomFactor: number, clientX?: number, clientY?: number) => {
    if (!mapRef.current) return;
  
    const newScale = Math.max(0.5, Math.min(scale * zoomFactor, 5));
    if (newScale === scale) return;
  
    const mapRect = mapRef.current.getBoundingClientRect();
    const mouseX = (clientX ?? mapRect.width / 2) - mapRect.left;
    const mouseY = (clientY ?? mapRect.height / 2) - mapRect.top;
  
    // Position of the mouse on the map before zoom
    const mapMouseX = (mouseX - translate.x) / scale;
    const mapMouseY = (mouseY - translate.y) / scale;
  
    // New translate to keep the mouse position fixed
    const newTranslateX = mouseX - mapMouseX * newScale;
    const newTranslateY = mouseY - mapMouseY * newScale;
  
    setScale(newScale);
    setTranslate({ x: newTranslateX, y: newTranslateY });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    handleZoom(zoomFactor, e.clientX, e.clientY);
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

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setStartDrag({ x: e.touches[0].clientX - translate.x, y: e.touches[0].clientY - translate.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isDragging && e.touches.length === 1) {
      setTranslate({
        x: e.touches[0].clientX - startDrag.x,
        y: e.touches[0].clientY - startDrag.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };
  
  const centerOnUser = () => {
    if (userMapPos) {
      setScale(2); // Zoom in a bit
      setTranslate({
        x: -userMapPos.x * 2 + MAP_DIMENSIONS.width / 2,
        y: -userMapPos.y * 2 + MAP_DIMENSIONS.height / 2,
      });
    }
  };
  
  const userMapPos = position ? toMapCoords(position.coords.latitude, position.coords.longitude) : null;
  
  return (
    <main className="h-[100dvh] w-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <header className="flex items-center justify-between p-3 bg-background/80 backdrop-blur-sm border-b shadow-sm z-10">
        <div className="flex items-center gap-2">
          <MetroTrackLogo className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-primary">MetroTrack</h1>
        </div>
        <div className="flex items-center gap-2">
          {position && (
             <Button variant="outline" size="icon" onClick={centerOnUser}>
              <LocateFixed className="h-5 w-5" />
            </Button>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
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
        </div>
      </header>

      <div 
        ref={mapRef}
        className="flex-1 relative overflow-hidden cursor-grab"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
         <div className="absolute inset-0 grid grid-cols-10 grid-rows-10">
            {[...Array(100)].map((_, i) => (
                <div key={i} className="border border-black/5 dark:border-white/5"></div>
            ))}
         </div>
         
         <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
            <Button variant="outline" size="icon" onClick={() => handleZoom(1.2)}>
                <ZoomIn className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => handleZoom(1/1.2)}>
                <ZoomOut className="h-5 w-5" />
            </Button>
         </div>
        
        <div
          className="absolute top-0 left-0"
          style={{ 
            width: MAP_DIMENSIONS.width, 
            height: MAP_DIMENSIONS.height,
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: 'top left'
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
                    r={isClosest || isJourneyEndpoint ? "5" : "3"}
                    fill={isClosest || isJourneyEndpoint ? "hsl(var(--primary))" : "hsl(var(--background))"}
                    stroke="hsl(var(--foreground))"
                    strokeWidth="1"
                  />
                   <text
                      x={x}
                      y={y + 8}
                      textAnchor="middle"
                      fontSize="4"
                      fill="hsl(var(--foreground))"
                      className="font-sans"
                    >
                      {station.name}
                    </text>
                </g>
              );
            })}
            
            {userMapPos && (
               <g transform={`translate(${userMapPos.x}, ${userMapPos.y})`}>
                  <circle cx="0" cy="0" r="6" fill="hsl(var(--primary))" opacity="0.8"/>
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
          className={journey ? "h-[90dvh] rounded-t-lg" : "h-auto max-h-[50dvh] rounded-t-lg"}
        >
          <SheetHeader className="pt-4 text-center">
             <div className="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/20 mb-2"></div>
             <SheetTitle className="font-headline">
                {journey ? "Journey Details" : "Plan Your Journey"}
             </SheetTitle>
          </SheetHeader>
          <div className="p-4 overflow-y-auto h-full">
            {!journey ? (
              // Journey Selection UI
              <div className="space-y-4">
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                    <StationCombobox
                      stations={sortedStations}
                      value={fromStationId}
                      onSelect={setFromStationId}
                      placeholder="From Station"
                    />
                    <Button variant="ghost" size="icon" onClick={handleSwapStations} disabled={!fromStationId && !toStationId}>
                        <ArrowLeftRight className="h-4 w-4" />
                    </Button>
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
                    currentLocation={position ? position.coords : null}
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
