"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Compass, LoaderCircle, Search, Train, ArrowLeftRight, LocateFixed, ZoomIn, ZoomOut, Crosshair } from "lucide-react";

import { useGeolocation } from "@/hooks/use-geolocation";
import { metroLines, stations } from "@/lib/delhi-metro-data";
import { findNearestStation, findJourneyRoute, cn, findNearestStationOnRoute } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { MetroTrackLogo } from "@/components/icons";
import { AmenityFinder } from "@/components/amenity-finder";
import { JourneyTracker } from "@/components/journey-tracker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { StationCombobox } from "@/components/station-combobox";
import { Station } from "@/types";
import { useJourneyNotifications } from "@/hooks/use-journey-notifications";


const MAP_BOUNDS = {
  minLat: 28.35,
  maxLat: 28.9,
  minLng: 76.8,
  maxLng: 77.6,
};

const MAP_DIMENSIONS = {
  width: 2500,
  height: 1500,
};

const toMapCoords = (lat: number, lng: number) => {
  const PADDING = 0.05; // 5% padding
  const effectiveWidth = MAP_DIMENSIONS.width * (1 - 2 * PADDING);
  const effectiveHeight = MAP_DIMENSIONS.height * (1 - 2 * PADDING);
  
  const x = (paddingX => paddingX + ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * effectiveWidth)(MAP_DIMENSIONS.width * PADDING);
  const y = (paddingY => paddingY + ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * effectiveHeight)(MAP_DIMENSIONS.height * PADDING);
  
  return { x, y };
};

export default function Home() {
  const { position, error } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
  });
  const [closestStation, setClosestStation] = React.useState<Station | null>(null);
  
  // Journey state
  const [fromStationId, setFromStationId] = React.useState<string | null>(null);
  const [toStationId, setToStationId] = React.useState<string | null>(null);
  const [journey, setJourney] = React.useState<{ from: Station; to: Station; route: Station[] } | null>(null);
  
  // Location intent state
  const [isWaitingForLocationToSetFrom, setIsWaitingForLocationToSetFrom] = React.useState(false);

  // Map interaction state
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0.8);
  const [translate, setTranslate] = React.useState({ x: -200, y: -100 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [startDrag, setStartDrag] = React.useState({ x: 0, y: 0 });

  const { toast } = useToast();
  const stationEntries = React.useMemo(() => Object.values(stations), []);
  const sortedStations = React.useMemo(() => [...stationEntries].sort((a, b) => a.name.localeCompare(b.name)), [stationEntries]);

  // When the user starts a journey but we don't yet have a live GPS fix, we
  // can store a one-time nearest-station override so the tracker shows
  // immediate progress. This is populated from the current `position` or
  // by a one-shot `getCurrentPosition` call.
  const [initialNearestStation, setInitialNearestStation] = React.useState<Station | null>(null);

  // Handle Notifications
  const closestStationOnRoute = position && journey ? findNearestStationOnRoute(position.coords, journey.route) : null;
  useJourneyNotifications(journey?.route || null, closestStationOnRoute);


  React.useEffect(() => {
    if (position) {
      console.log('Home - GPS Position updated:', position.coords.latitude, position.coords.longitude);
      console.log('Home - Total stations available:', Object.keys(stations).length);
      console.log('Home - Sample station:', Object.values(stations)[0]);
      const nearestStation = findNearestStation(position.coords);
      console.log('Home - Nearest station:', nearestStation?.name, nearestStation);
      setClosestStation(nearestStation);
      
      if (isWaitingForLocationToSetFrom && nearestStation) {
        setFromStationId(nearestStation.id);
        setIsWaitingForLocationToSetFrom(false);
      }
    }
  }, [position, isWaitingForLocationToSetFrom]);
  
  const handleSetNearestStationAsFrom = () => {
    if (position && closestStation) {
      setFromStationId(closestStation.id);
    } else if (error) {
      toast({
        variant: "destructive",
        title: "Location Error",
        description: error || "Could not determine your location. Please ensure location services are enabled.",
      });
    } else {
      setIsWaitingForLocationToSetFrom(true);
      toast({
        title: "Locating...",
        description: "Waiting for GPS signal to set the nearest station.",
      });
    }
  };
  
  const handleStartJourney = async () => {
    if (fromStationId && toStationId) {
       const route = findJourneyRoute(fromStationId, toStationId);
       if(route && route.length > 0) {
         // Compute an initial nearest station override to show progress
         // immediately while the continuous watch position may still be
         // acquiring. Prefer the live `position` if available.
         if (position) {
           const initial = findNearestStationOnRoute(position.coords, route);
           setInitialNearestStation(initial);
         } else if ('geolocation' in navigator) {
           // One-shot attempt to get a quick fix; it's asynchronous and may
           // prompt the user for permission. We'll set the override when it
           // resolves — the tracker will update accordingly.
           navigator.geolocation.getCurrentPosition((pos) => {
             const initial = findNearestStationOnRoute(pos.coords, route);
             setInitialNearestStation(initial);
           }, () => {
             // ignore failure — tracker will fall back to other heuristics
           });
         }
         if ('Notification' in window && Notification.permission !== 'denied') {
            await Notification.requestPermission();
         }
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

  // Go back to the planning UI but keep the from/to selections
  const handleBackToPlan = () => {
    setJourney(null);
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
    if (userMapPos && mapRef.current) {
        const mapWidth = mapRef.current.clientWidth;
        const mapHeight = mapRef.current.clientHeight;
        const newScale = 2; // Zoom in a bit
        setScale(newScale);
        setTranslate({
            x: -userMapPos.x * newScale + mapWidth / 2,
            y: -userMapPos.y * newScale + mapHeight / 2,
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
         <div className="absolute inset-0 grid grid-cols-20 grid-rows-12">
            {[...Array(240)].map((_, i) => (
                <div key={i} className="border border-border/10"></div>
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
              const isPartOfJourney = journey?.route.some(s => s.id === station.id);
              
              const baseFontSize = 7;
              const maxFontSize = 10;
              const minFontSize = 4;
              const fontSize = Math.max(minFontSize, Math.min(maxFontSize, baseFontSize / scale));


              return (
                <g key={station.id} className={cn(
                  "transition-opacity", 
                  !journey || isPartOfJourney ? "opacity-100" : "opacity-30"
                )}>
                   <circle
                    cx={x}
                    cy={y}
                    r={isClosest || isJourneyEndpoint ? "5" : "3"}
                    fill={isClosest || isJourneyEndpoint ? "hsl(var(--primary))" : "hsl(var(--background))"}
                    stroke="hsl(var(--foreground))"
                    strokeWidth="1"
                  />
                   <text
                      x={x + 4}
                      y={y + 4}
                      textAnchor="start"
                      fontSize={`${fontSize}px`}
                      className="font-sans font-medium fill-foreground"
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
          className={cn("rounded-t-lg transition-all duration-300 p-0",
            journey ? "h-[85dvh]" : "h-auto max-h-[60dvh]"
          )}
        >
       <SheetHeader className="p-4 pt-2 text-center relative">
         <div className="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/20 mb-2 cursor-grab active:cursor-grabbing"></div>
         {journey && (
          <div className="absolute left-4 top-4">
            <Button variant="ghost" size="icon" onClick={handleBackToPlan}>
             <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
         )}
         <SheetTitle className="font-headline text-lg sm:text-xl text-center">
           {journey ? "Journey Details" : "Plan Your Journey"}
         </SheetTitle>
       </SheetHeader>
          <div className="overflow-y-auto h-full pb-4">
            {!journey ? (
              // Journey Selection UI
              <div className="px-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 flex gap-2 items-center pt-1">
                    <StationCombobox
                      stations={sortedStations}
                      value={fromStationId}
                      onSelect={setFromStationId}
                      placeholder="From Station"
                    />
                     <Button variant="outline" size="icon" className="shrink-0" onClick={handleSetNearestStationAsFrom} disabled={isWaitingForLocationToSetFrom}>
                      {isWaitingForLocationToSetFrom ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="sm:self-center">
                    <Button variant="ghost" size="icon" className="hidden sm:flex" onClick={handleSwapStations} disabled={!fromStationId && !toStationId}>
                        <ArrowLeftRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1">
                    <StationCombobox
                      stations={sortedStations.filter(s => s.id !== fromStationId)}
                      value={toStationId}
                      onSelect={setToStationId}
                      placeholder="To Station"
                      disabled={!fromStationId}
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={handleStartJourney} disabled={!fromStationId || !toStationId}>
                    <Train className="mr-2 h-4 w-4" />
                    Start Journey
                </Button>
                 {!position && !error && !isWaitingForLocationToSetFrom && (
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
                       <p className="text-xs mt-1 text-center">Please grant location permissions and ensure your GPS is enabled.</p>
                    </div>
                  )}
              </div>
            ) : (
               // Journey Tracking UI
               <div className="space-y-4 flex flex-col h-full">
                 <Card className="mx-4">
                    <CardContent className="p-3 sm:p-4 flex items-center justify-between text-center">
                        <div className="flex-1">
                            <p className="text-xs text-muted-foreground">From</p>
                            <p className="font-bold text-sm sm:text-base truncate">{journey.from.name}</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-primary mx-2 shrink-0" />
                        <div className="flex-1">
                            <p className="text-xs text-muted-foreground">To</p>
                            <p className="font-bold text-sm sm:text-base truncate">{journey.to.name}</p>
                        </div>
                    </CardContent>
                 </Card>

                 <ScrollArea className="flex-1 px-2">
                   <JourneyTracker 
                    route={journey.route}
                   currentLocation={position ? position.coords : null}
                   nearestStationOverride={(() => {
                      // Only use override when we DON'T have an active GPS position
                      if (position) return null;

                      // Use the initial nearest station we computed when journey started
                      if (initialNearestStation) {
                        const isOnRoute = journey.route.some(s => s.id === initialNearestStation.id);
                        if (isOnRoute) return initialNearestStation;
                      }

                      // Fall back to closestStation from last known position
                      if (closestStation) {
                        const isOnRoute = journey.route.some(s => s.id === closestStation.id);
                        if (isOnRoute) return closestStation;
                        return findNearestStationOnRoute({ latitude: closestStation.coordinates.lat, longitude: closestStation.coordinates.lng }, journey.route);
                      }

                      return null;
                   })()}
                   />
                 </ScrollArea>
                
                 <div className="px-4 pt-2 border-t">
                    <Button variant="destructive" className="w-full" onClick={handleEndJourney}>
                        End Journey
                    </Button>
                 </div>
               </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}