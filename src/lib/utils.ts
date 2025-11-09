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

  // Debug: surface station data and the incoming user coords to help diagnose
  // cases where distance calculations return unexpected results.
  try {
    // eslint-disable-next-line no-console
    console.log('utils.findNearestStation - total stations:', allStations.length);
    // eslint-disable-next-line no-console
    console.log('utils.findNearestStation - sample station:', allStations[0]);
    // eslint-disable-next-line no-console
    console.log('utils.findNearestStation - userCoords:', userCoords);
  } catch (e) {
    // ignore logging errors in environments that restrict console
  }

  // Coerce incoming coords to plain numbers to avoid issues when a
  // GeolocationCoordinates-like object is passed in (browser objects can
  // sometimes have getters or non-enumerable props).
  const user = { latitude: Number(userCoords?.latitude), longitude: Number(userCoords?.longitude) };

  let closestStation: Station | null = null;
  let minDistance = Infinity;

  for (const station of allStations) {
    const distance = getDistance(user, {
      latitude: station.coordinates.lat,
      longitude: station.coordinates.lng,
    });

    // Debug a sample of computed distances to catch NaN or unexpected values
    try {
      // eslint-disable-next-line no-console
      if (station === allStations[0]) console.log('utils.findNearestStation - sample distance to first station:', distance);
    } catch (e) {}

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

  try {
    // eslint-disable-next-line no-console
    console.log('utils.findNearestStationOnRoute - route length:', route.length);
    // eslint-disable-next-line no-console
    console.log('utils.findNearestStationOnRoute - userCoords:', userCoords);
  } catch (e) {
    // ignore
  }

  // Coerce incoming coords to plain numbers similar to findNearestStation
  const user = { latitude: Number(userCoords?.latitude), longitude: Number(userCoords?.longitude) };

  // Also log a sample distance to the first station on the route to detect NaN issues
  try {
    if (route.length > 0) {
      const sampleDist = getDistance(user, { latitude: route[0].coordinates.lat, longitude: route[0].coordinates.lng });
      // eslint-disable-next-line no-console
      console.log('utils.findNearestStationOnRoute - sample distance to first route station:', sampleDist);
    }
  } catch (e) {
    // ignore
  }

  let closestStation: Station | null = null;
  let minDistance = Infinity;

  for (const station of route) {
    const distance = getDistance(user, {
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

/**
 * Estimate journey duration for a route in seconds.
 *
 * Heuristics used (sourced from DMRC / public information):
 * - Average running speed: 45 km/h (typical average including acceleration/braking)
 * - Dwell time per intermediate stop: 20 seconds
 * - Transfer (interchange) penalty when route contains consecutive stations with the same name but different ids: 120 seconds
 */
export function estimateJourneyDuration(route: Station[] | null): { seconds: number; breakdown: { distanceMeters: number; runningSeconds: number; dwellSeconds: number; transferSeconds: number; lineChangeCount: number; lineChangePenaltySeconds: number } } | null {
  if (!route || route.length < 2) return null;

  const AVG_SPEED_KMPH = 45; // km/h
  const DWELL_SECONDS_PER_STOP = 20; // seconds
  const TRANSFER_PENALTY_SECONDS = 120; // seconds for interchange
  const LINE_CHANGE_PENALTY_SECONDS = 10 * 60; // minimum 10 minutes per line change

  let distanceMeters = 0;
  let transferCount = 0;
  let lineChangeCount = 0;

  // Helper to pick a line used between two stations. We pick a line present on both stations
  // if possible. If multiple, prefer the currentLine when provided.
  const commonLineBetween = (a: Station, b: Station, prefer?: string | null): string | null => {
    const setA = new Set(a.lines || []);
    const setB = new Set(b.lines || []);
    // if prefer is available and both stations have it, pick it
    if (prefer && setA.has(prefer) && setB.has(prefer)) return prefer;
    for (const l of a.lines || []) {
      if (setB.has(l)) return l;
    }
    // no common line found
    return null;
  };

  let currentLine: string | null = null;

  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    try {
      distanceMeters += getDistance(
        { latitude: a.coordinates.lat, longitude: a.coordinates.lng },
        { latitude: b.coordinates.lat, longitude: b.coordinates.lng }
      );
    } catch (e) {
      // ignore distance errors for malformed coords
    }

    // If two adjacent stations share the same name but are different ids, treat as an interchange
    if (a.name === b.name && a.id !== b.id) transferCount++;

    // Detect line used for this segment and whether it represents a line change
    const segmentLine = commonLineBetween(a, b, currentLine);
    if (i === 0) {
      currentLine = segmentLine;
    } else {
      // If we found a segment line and it's different from currentLine, count a line change
      if (segmentLine && currentLine && segmentLine !== currentLine) {
        lineChangeCount++;
        currentLine = segmentLine;
      }
      // If no common line found between stations, but names differ (non-interchange), we still
      // consider this a line change as trains would require transfer-like behaviour.
      if (!segmentLine && currentLine) {
        lineChangeCount++;
        currentLine = null;
      }
      // If currentLine is null and segmentLine exists, adopt it without counting a change
      if (!currentLine && segmentLine) currentLine = segmentLine;
    }
  }

  const runningSeconds = (distanceMeters / 1000) / AVG_SPEED_KMPH * 3600;
  const stops = route.length - 1; // number of station stops between origin and destination
  const dwellSeconds = stops * DWELL_SECONDS_PER_STOP;
  const transferSeconds = transferCount * TRANSFER_PENALTY_SECONDS;
  const lineChangePenaltySeconds = lineChangeCount * LINE_CHANGE_PENALTY_SECONDS;

  const seconds = Math.round(runningSeconds + dwellSeconds + transferSeconds + lineChangePenaltySeconds);
  return {
    seconds,
    breakdown: {
      distanceMeters: Math.round(distanceMeters),
      runningSeconds: Math.round(runningSeconds),
      dwellSeconds,
      transferSeconds,
      lineChangeCount,
      lineChangePenaltySeconds,
    },
  };
}
