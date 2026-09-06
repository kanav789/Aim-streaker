import * as turf from "@turf/turf";
import type { Feature, Polygon, MultiPolygon } from "geojson";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  updateDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { GPSPoint, RunningSession, Territory } from "./running";

const TERRITORIES_COLLECTION = "territories";
const RUNNING_SESSIONS_COLLECTION = "running_sessions";
const USERS_COLLECTION = "users";

export interface TerritoryCalculationResult {
  isValidLoop: boolean;
  rawAreaMeters: number;
  newUniqueAreaMeters: number;
  totalCumulativeAreaMeters: number;
  newPolygonGeoJSON: string | null;
  updatedCumulativeGeoJSON: string | null;
  message: string;
}

/**
 * Filter raw GPS points to reduce jitter while preserving real-world mobile movements.
 */
export function filterGPSPoints(rawPoints: GPSPoint[]): GPSPoint[] {
  if (rawPoints.length === 0) return [];

  const filtered: GPSPoint[] = [];

  for (const pt of rawPoints) {
    // Discard points only if accuracy is extremely poor (> 80m)
    if (pt.accuracy > 80 && rawPoints.length > 2) continue;

    if (filtered.length === 0) {
      filtered.push(pt);
      continue;
    }

    const last = filtered[filtered.length - 1];
    // Calculate distance between points in meters
    const dist = turf.distance(
      turf.point([last.longitude, last.latitude]),
      turf.point([pt.longitude, pt.latitude]),
      { units: "meters" }
    );

    // Keep points if moved at least 1.5m or after 3 seconds
    if (dist >= 1.5 || pt.timestamp - last.timestamp > 3000) {
      filtered.push(pt);
    }
  }

  // Fallback: if over-filtered, keep all raw points so route is never lost
  return filtered.length >= 1 ? filtered : rawPoints;
}

/**
 * Calculate total distance of a route in meters.
 */
export function calculateRouteDistance(points: GPSPoint[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const from = [points[i].longitude, points[i].latitude];
    const to = [points[i + 1].longitude, points[i + 1].latitude];
    total += turf.distance(turf.point(from), turf.point(to), { units: "meters" });
  }
  return total;
}

/**
 * Validates whether a sequence of GPS points forms a closed loop and creates
 * a sanitized, unkinked Turf polygon/multipolygon.
 */
export function createTerritoryFromRoute(
  points: GPSPoint[],
  maxClosureDistanceMeters = 60
): Feature<Polygon | MultiPolygon> | null {
  if (points.length < 3) return null;

  // Extract coordinates [lng, lat]
  const coords: [number, number][] = points.map((p) => [p.longitude, p.latitude]);

  const startCoord = coords[0];
  const endCoord = coords[coords.length - 1];

  // Calculate distance between start and end
  const closureDist = turf.distance(
    turf.point(startCoord),
    turf.point(endCoord),
    { units: "meters" }
  );

  const totalDist = calculateRouteDistance(points);

  // If start and end are far apart and not closing (< 60m or < 25% of total route if total route > 100m)
  const isCloseEnough =
    closureDist <= maxClosureDistanceMeters ||
    (totalDist > 100 && closureDist <= totalDist * 0.25);

  if (!isCloseEnough) {
    return null;
  }

  // Ensure closed ring (last point === first point)
  const closedCoords: [number, number][] = [...coords];
  if (
    startCoord[0] !== endCoord[0] ||
    startCoord[1] !== endCoord[1]
  ) {
    closedCoords.push(startCoord);
  }

  if (closedCoords.length < 4) return null;

  try {
    const rawPoly = turf.polygon([closedCoords]);
    const cleaned = turf.cleanCoords(rawPoly) as Feature<Polygon>;

    // Resolve any self-intersections (unkink)
    const unkinked = turf.unkinkPolygon(cleaned);

    if (!unkinked || !unkinked.features || unkinked.features.length === 0) {
      // Fallback: try buffer 0 to fix self-intersections
      const buffered = turf.buffer(cleaned, 0);
      if (buffered && turf.area(buffered) > 10) {
        return buffered as Feature<Polygon | MultiPolygon>;
      }
      return null;
    }

    if (unkinked.features.length === 1) {
      const single = unkinked.features[0];
      if (turf.area(single) < 10) return null; // Ignore tiny non-territory loops (< 10 m²)
      return single as Feature<Polygon>;
    }

    // Unite multiple unkinked pieces
    const united = turf.union(unkinked);
    if (!united || turf.area(united) < 10) return null;

    return united as Feature<Polygon | MultiPolygon>;
  } catch (err) {
    console.error("Error creating territory polygon:", err);
    return null;
  }
}

/**
 * Calculates new unique captured territory by subtracting existing cumulative territory,
 * and updates cumulative territory by uniting the new territory.
 */
export function calculateUniqueTerritory(
  newPoly: Feature<Polygon | MultiPolygon>,
  existingCumulativeGeoJSON: string | null
): {
  rawArea: number;
  newUniqueArea: number;
  totalCumulativeArea: number;
  updatedCumulativeGeoJSON: string;
} {
  const rawArea = turf.area(newPoly);

  // If user has no previous territory
  if (!existingCumulativeGeoJSON) {
    return {
      rawArea,
      newUniqueArea: rawArea,
      totalCumulativeArea: rawArea,
      updatedCumulativeGeoJSON: JSON.stringify(newPoly),
    };
  }

  try {
    const existingPoly = JSON.parse(existingCumulativeGeoJSON) as Feature<
      Polygon | MultiPolygon
    >;

    // Difference: newPoly minus existingPoly
    // turf.difference(featureCollection([newPoly, existingPoly]))
    const diff = turf.difference(
      turf.featureCollection([newPoly, existingPoly])
    );

    let newUniqueArea = 0;
    if (diff) {
      newUniqueArea = turf.area(diff);
    }

    // Union: existingPoly combined with newPoly
    const combinedUnion = turf.union(
      turf.featureCollection([existingPoly, newPoly])
    );

    const totalCumulativeArea = combinedUnion
      ? turf.area(combinedUnion)
      : turf.area(existingPoly);

    const updatedCumulativeGeoJSON = JSON.stringify(
      combinedUnion || existingPoly
    );

    return {
      rawArea,
      newUniqueArea,
      totalCumulativeArea,
      updatedCumulativeGeoJSON,
    };
  } catch (err) {
    console.error("Failed to compute turf difference/union, falling back:", err);
    return {
      rawArea,
      newUniqueArea: rawArea,
      totalCumulativeArea: rawArea,
      updatedCumulativeGeoJSON: JSON.stringify(newPoly),
    };
  }
}

/**
 * Evaluates route points and existing user profile to generate the territory calculation result.
 */
export function evaluateRouteForTerritory(
  routePoints: GPSPoint[],
  existingCumulativeGeoJSON: string | null,
  currentCumulativeArea = 0
): TerritoryCalculationResult {
  const totalDistance = calculateRouteDistance(routePoints);

  if (routePoints.length < 4 || totalDistance < 25) {
    return {
      isValidLoop: false,
      rawAreaMeters: 0,
      newUniqueAreaMeters: 0,
      totalCumulativeAreaMeters: currentCumulativeArea,
      newPolygonGeoJSON: null,
      updatedCumulativeGeoJSON: existingCumulativeGeoJSON,
      message: "Route is too short to form a territory (minimum 25m needed).",
    };
  }

  const poly = createTerritoryFromRoute(routePoints);

  if (!poly) {
    return {
      isValidLoop: false,
      rawAreaMeters: 0,
      newUniqueAreaMeters: 0,
      totalCumulativeAreaMeters: currentCumulativeArea,
      newPolygonGeoJSON: null,
      updatedCumulativeGeoJSON: existingCumulativeGeoJSON,
      message:
        "Open route detected. To capture territory, close your route by returning near your starting point.",
    };
  }

  const {
    rawArea,
    newUniqueArea,
    totalCumulativeArea,
    updatedCumulativeGeoJSON,
  } = calculateUniqueTerritory(poly, existingCumulativeGeoJSON);

  return {
    isValidLoop: true,
    rawAreaMeters: rawArea,
    newUniqueAreaMeters: newUniqueArea,
    totalCumulativeAreaMeters: totalCumulativeArea,
    newPolygonGeoJSON: JSON.stringify(poly),
    updatedCumulativeGeoJSON,
    message:
      newUniqueArea > 0
        ? `Territory captured! +${Math.round(newUniqueArea)} m² added.`
        : "Loop completed, but this area was already owned by you.",
  };
}

// ---------------------------------------------------------------------------
// Firestore Database Integration
// ---------------------------------------------------------------------------

/**
 * Fetches all world territories for the shared world map.
 */
export async function getAllWorldTerritories(limitCount = 200): Promise<Territory[]> {
  let firestoreTerritories: Territory[] = [];
  try {
    const q = query(
      collection(db, TERRITORIES_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    firestoreTerritories = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Territory[];
  } catch (err) {
    console.warn("Firestore query with orderBy failed, attempting plain query fallback:", err);
    try {
      const qFallback = query(
        collection(db, TERRITORIES_COLLECTION),
        limit(limitCount)
      );
      const snapFallback = await getDocs(qFallback);
      firestoreTerritories = snapFallback.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Territory[];
      firestoreTerritories.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    } catch (fallbackErr) {
      console.warn("Firestore query failed entirely. Using local fallback:", fallbackErr);
    }
  }

  // Also sync and merge any offline/fallback territories
  if (typeof window !== "undefined") {
    try {
      const localRaw = localStorage.getItem("aim_local_territories");
      if (localRaw) {
        const localList: Territory[] = JSON.parse(localRaw);
        const existingIds = new Set(firestoreTerritories.map((t) => t.id));
        for (const item of localList) {
          if (item.id && !existingIds.has(item.id)) {
            firestoreTerritories.unshift(item);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to parse local territories:", e);
    }
  }

  return firestoreTerritories;
}

/**
 * Fetches a user's cumulative territory data and stats from their profile.
 */
export async function getUserCumulativeTerritory(userId: string): Promise<{
  totalTerritoryArea: number;
  cumulativeTerritoryGeoJSON: string | null;
}> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      const data = snap.data();
      return {
        totalTerritoryArea: typeof data.totalTerritoryArea === "number" ? data.totalTerritoryArea : 0,
        cumulativeTerritoryGeoJSON: data.cumulativeTerritoryGeoJSON || null,
      };
    }
  } catch (err) {
    console.warn("Failed to fetch user cumulative territory from Firestore:", err);
  }

  // Fallback to local storage if Firestore rule is blocking
  if (typeof window !== "undefined") {
    try {
      const localArea = localStorage.getItem(`aim_user_area_${userId}`);
      const localGeoJSON = localStorage.getItem(`aim_user_geo_${userId}`);
      if (localArea) {
        return {
          totalTerritoryArea: Number(localArea) || 0,
          cumulativeTerritoryGeoJSON: localGeoJSON || null,
        };
      }
    } catch (e) {
      console.warn("Local storage read error:", e);
    }
  }

  return {
    totalTerritoryArea: 0,
    cumulativeTerritoryGeoJSON: null,
  };
}

/**
 * Saves completed running session, new territory (if created), and updates user's permanent total territory.
 */
export async function saveRunningSessionAndTerritory(params: {
  userId: string;
  userName: string;
  startedAt: string;
  endedAt: string;
  distanceMeters: number;
  durationSeconds: number;
  newPolygonGeoJSON: string | null;
  newUniqueAreaMeters: number;
  updatedCumulativeGeoJSON: string | null;
  totalCumulativeAreaMeters: number;
  routeCoordinates: [number, number][];
}): Promise<{ sessionId: string; territoryId?: string }> {
  const {
    userId,
    userName,
    startedAt,
    endedAt,
    distanceMeters,
    durationSeconds,
    newPolygonGeoJSON,
    newUniqueAreaMeters,
    updatedCumulativeGeoJSON,
    totalCumulativeAreaMeters,
    routeCoordinates,
  } = params;

  let sessionId = `session_${Date.now()}`;
  let territoryId: string | undefined = undefined;

  // Determine the territory polygon to be permanently etched into the world map
  let polygonToSave = newPolygonGeoJSON;
  let areaToSave = Math.round(newUniqueAreaMeters);

  // If no closed loop polygon was captured, but runner traversed at least 2 points:
  // Automatically generate a 15-meter wide corridor polygon along their running route!
  if (!polygonToSave && routeCoordinates.length >= 2) {
    try {
      const line = turf.lineString(routeCoordinates);
      const corridor = turf.buffer(line, 0.015, { units: "kilometers" });
      if (corridor) {
        polygonToSave = JSON.stringify(corridor);
        areaToSave = Math.max(1, Math.round(turf.area(corridor)));
      }
    } catch (err) {
      console.warn("Failed to generate route corridor buffer:", err);
    }
  }

  // If a loop polygon exists but area was 0 (e.g. self-overlap or re-running), compute raw polygon area
  if (polygonToSave && areaToSave <= 0) {
    try {
      const parsed = JSON.parse(polygonToSave);
      areaToSave = Math.max(1, Math.round(turf.area(parsed)));
    } catch (e) {
      areaToSave = 1;
    }
  }

  // 1. Create running_sessions doc (saved forever in Firestore)
  const sessionDoc: Omit<RunningSession, "id"> = {
    userId,
    userName: userName || "Streaker",
    startedAt,
    endedAt,
    distanceMeters: Math.round(distanceMeters),
    durationSeconds: Math.round(durationSeconds),
    status: "completed",
    newAreaSquareMeters: Math.max(0, areaToSave),
    routeGeoJSON: JSON.stringify(routeCoordinates),
  };

  try {
    const sessionRef = await addDoc(
      collection(db, RUNNING_SESSIONS_COLLECTION),
      sessionDoc
    );
    sessionId = sessionRef.id;
  } catch (err) {
    console.warn("Firestore save session failed (check rules):", err);
  }

  // 2. Save territory into shared world territories collection forever!
  if (polygonToSave) {
    territoryId = `territory_${Date.now()}`;
    const territoryDoc: Territory = {
      id: territoryId,
      userId,
      userName: userName || "Streaker",
      sessionId,
      polygonGeoJSON: polygonToSave,
      routeGeoJSON: JSON.stringify(routeCoordinates),
      areaSquareMeters: Math.max(1, areaToSave),
      distanceMeters: Math.round(distanceMeters),
      durationSeconds: Math.round(durationSeconds),
      createdAt: new Date().toISOString(),
    };

    try {
      const territoryRef = await addDoc(
        collection(db, TERRITORIES_COLLECTION),
        territoryDoc
      );
      territoryId = territoryRef.id;
    } catch (err) {
      console.warn("Firestore save territory failed (check rules):", err);
    }

    // Always update local storage cache as well for offline/instant access
    if (typeof window !== "undefined") {
      try {
        const localRaw = localStorage.getItem("aim_local_territories");
        const list: Territory[] = localRaw ? JSON.parse(localRaw) : [];
        list.unshift({ ...territoryDoc, id: territoryId });
        localStorage.setItem("aim_local_territories", JSON.stringify(list));
      } catch (e) {
        console.warn("Failed to cache territory locally:", e);
      }
    }
  }

  // 3. Update user profile cumulative stats in users/{userId}
  const finalTotalArea = Math.max(
    totalCumulativeAreaMeters,
    totalCumulativeAreaMeters + (newUniqueAreaMeters > 0 ? newUniqueAreaMeters : areaToSave)
  );

  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userDocRef, {
      totalTerritoryArea: Math.round(finalTotalArea),
      ...(updatedCumulativeGeoJSON
        ? { cumulativeTerritoryGeoJSON: updatedCumulativeGeoJSON }
        : {}),
    });
  } catch (err) {
    console.warn("Failed to update user cumulative territory in Firestore:", err);
  }

  // Store local user cache as backup
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        `aim_user_area_${userId}`,
        Math.round(finalTotalArea).toString()
      );
      if (updatedCumulativeGeoJSON) {
        localStorage.setItem(`aim_user_geo_${userId}`, updatedCumulativeGeoJSON);
      }
    } catch (e) {
      console.warn("Local storage cache write error:", e);
    }
  }

  return { sessionId, territoryId };
}

