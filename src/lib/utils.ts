import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type Station } from "@/types";
import { metroLines, stations } from "./delhi-metro-data";
import { getDistance } from 'geolib';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function findNearestStation(
  userCoords: { latitude: number; longitude: number }
): Station | null {
  const allStations = Object.values(stations);
  if (allStations.length === 0) {
    return null;
  }

  let closestStation: Station | null = null;
  let minDistance = Infinity;

  for (const station of allStations) {
    const distance = getDistance(userCoords, {
      latitude: station.coordinates.lat,
      longitude: station.coordinates.lng,
    });

    if (distance < minDistance) {
      minDistance = distance;
      closestStation = station;
    }
  }
  return closestStation;
}

export function findJourneyRoute(startStationId: string, endStationId: string): Station[] | null {
  if (!startStationId || !endStationId || !stations[startStationId] || !stations[endStationId]) {
    return null;
  }

  // --- Graph Construction ---
  const graph: { [key: string]: string[] } = {};
  const allStationIds = Object.keys(stations);

  // Initialize graph
  allStationIds.forEach(id => {
    graph[id] = [];
  });

  // 1. Add connections within each line
  for (const line of metroLines) {
    for (let i = 0; i < line.stations.length; i++) {
      const currentStationId = line.stations[i];
      if (i > 0) {
        graph[currentStationId].push(line.stations[i - 1]);
      }
      if (i < line.stations.length - 1) {
        graph[currentStationId].push(line.stations[i + 1]);
      }
    }
  }

  // 2. Add interchange connections
  const interchangeGroups: { [key: string]: string[] } = {};
  for (const stationId of allStationIds) {
    const station = stations[stationId];
    if (!interchangeGroups[station.name]) {
      interchangeGroups[station.name] = [];
    }
    interchangeGroups[station.name].push(station.id);
  }

  for (const name in interchangeGroups) {
    const stationIdsInGroup = interchangeGroups[name];
    if (stationIdsInGroup.length > 1) {
      for (let i = 0; i < stationIdsInGroup.length; i++) {
        for (let j = i + 1; j < stationIdsInGroup.length; j++) {
          const id1 = stationIdsInGroup[i];
          const id2 = stationIdsInGroup[j];
          graph[id1].push(id2);
          graph[id2].push(id1);
        }
      }
    }
  }

  // --- BFS Pathfinding ---
  const queue: { stationId: string; path: string[] }[] = [{ stationId: startStationId, path: [startStationId] }];
  const visited = new Set<string>([startStationId]);

  while (queue.length > 0) {
    const { stationId: currentStationId, path } = queue.shift()!;

    if (currentStationId === endStationId) {
      return path.map(id => stations[id]);
    }

    const neighbors = graph[currentStationId] || [];
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        const newPath = [...path, neighborId];
        queue.push({ stationId: neighborId, path: newPath });
      }
    }
  }

  return null; // Path not found
}


export function findNearestStationOnRoute(
  userCoords: { latitude: number; longitude: number },
  route: Station[]
): Station | null {
  if (!route || route.length === 0) {
    return null;
  }

  let closestStation: Station | null = null;
  let minDistance = Infinity;

  for (const station of route) {
    const distance = getDistance(userCoords, {
      latitude: station.coordinates.lat,
      longitude: station.coordinates.lng,
    });

    if (distance < minDistance) {
      minDistance = distance;
      closestStation = station;
    }
  }
  return closestStation;
}
