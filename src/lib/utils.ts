
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type Station } from "@/types";
import { metroLines, stations } from "./delhi-metro-data";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function haversineDistance(
  coords1: { latitude: number; longitude: number },
  coords2: { lat: number; lng: number }
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;

  const R = 6371; // Earth radius in km
  const dLat = toRad(coords2.lat - coords1.latitude);
  const dLon = toRad(coords2.lng - coords1.longitude);
  const lat1 = toRad(coords1.latitude);
  const lat2 = toRad(coords2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return d;
}


// A simple BFS pathfinding algorithm to find a route between two stations
export function findJourneyRoute(startStationId: string, endStationId: string): Station[] | null {
  const queue: string[][] = [[startStationId]];
  const visited = new Set<string>([startStationId]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const currentStationId = path[path.length - 1];

    if (currentStationId === endStationId) {
      return path.map(id => stations[id]);
    }
    
    const currentStation = stations[currentStationId];
    if (!currentStation) continue;
    
    // Find all metro lines that pass through the current station
    const linesThroughStation = metroLines.filter(line => line.stations.includes(currentStationId));

    for (const line of linesThroughStation) {
      const stationIndex = line.stations.indexOf(currentStationId);

      // Check neighbors on the same line
      const neighbors = [];
      if (stationIndex > 0) {
        neighbors.push(line.stations[stationIndex - 1]);
      }
      if (stationIndex < line.stations.length - 1) {
        neighbors.push(line.stations[stationIndex + 1]);
      }

      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          const newPath = [...path, neighborId];
          queue.push(newPath);
        }
      }
    }
  }

  return null; // No path found
}
