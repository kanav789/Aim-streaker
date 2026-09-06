export interface GPSPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
  speed: number | null;
}

export interface RunningSession {
  id?: string;
  userId: string;
  userName?: string;
  startedAt: string;
  endedAt: string;
  distanceMeters: number;
  durationSeconds: number;
  status: "completed" | "discarded";
  newAreaSquareMeters: number;
  routeGeoJSON?: string; // Serialized GeoJSON LineString coordinates [[lng, lat], ...]
}

export interface Territory {
  id?: string;
  userId: string;
  userName: string;
  sessionId: string;
  polygonGeoJSON: string; // Serialized GeoJSON Feature<Polygon | MultiPolygon>
  routeGeoJSON?: string; // Serialized GeoJSON LineString coordinates [[lng, lat], ...]
  areaSquareMeters: number;
  distanceMeters?: number;
  durationSeconds?: number;
  createdAt: string;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");

  if (hours > 0) {
    const hh = hours.toString().padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export function formatArea(sqMeters: number): string {
  const rounded = Math.round(sqMeters);
  if (rounded >= 1000000) {
    return `${(sqMeters / 1000000).toFixed(2)} km²`;
  }
  return `${rounded.toLocaleString()} m²`;
}

export function formatPace(distanceMeters: number, durationSeconds: number): string {
  if (distanceMeters <= 50 || durationSeconds <= 5) {
    return "--'--\" /km";
  }
  const km = distanceMeters / 1000;
  const paceSecondsPerKm = durationSeconds / km;

  if (paceSecondsPerKm > 3600 || !isFinite(paceSecondsPerKm)) {
    return "--'--\" /km";
  }

  const minutes = Math.floor(paceSecondsPerKm / 60);
  const seconds = Math.round(paceSecondsPerKm % 60);
  return `${minutes}'${seconds.toString().padStart(2, "0")}" /km`;
}
