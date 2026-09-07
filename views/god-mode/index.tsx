"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/auth-context";
import { useAims } from "@/context/aims-context";
import { GPSPoint, Territory } from "@/service/running";
import {
  filterGPSPoints,
  calculateRouteDistance,
  evaluateRouteForTerritory,
  getAllWorldTerritories,
  getUserCumulativeTerritory,
  saveRunningSessionAndTerritory,
} from "@/service/territory";
import { RunningHud } from "./components/running-hud";
import { RunSummaryModal } from "./components/run-summary-modal";
import { LocationErrorBanner } from "./components/location-error-banner";
import { GpsPermissionModal } from "./components/gps-permission-modal";
import { WorldStreakersFeed } from "./components/world-streakers-feed";
import * as turf from "@turf/turf";

// Dynamically import MapView to disable SSR for WebGL
const MapView = dynamic(() => import("./components/map-view"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-zinc-500">
      <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-xs font-medium">Initializing Tactical Map...</p>
    </div>
  ),
});

// Explicit Manual Coordinates covering the prominent Ahmedabad sector matching user's map view
export const MANUAL_TERRITORY_COORDINATES: [number, number][] = [
  [72.4950, 23.0550], // North-West (Science City / Sola)
  [72.5320, 23.0550], // North-East (Drive-In Road / Thaltej)
  [72.5360, 23.0200], // East (Vastrapur Lake / IIM)
  [72.5250, 22.9900], // South-East (Prahladnagar / Shyamal)
  [72.4950, 22.9900], // South-West (Sarkhej / Makarba)
  [72.4900, 23.0250], // West (Bopal Ambli Road)
  [72.4950, 23.0550], // Closing loop back to NW
];

export const MANUAL_VASTRAPUR_COORDINATES: [number, number][] = [
  [72.5080, 23.0480], // Thaltej Cross Road / SG Highway
  [72.5380, 23.0480], // Drive-In Cinema / Memnagar
  [72.5420, 23.0300], // Vastrapur Lake
  [72.5120, 23.0300], // Pakwan Cross Road
  [72.5080, 23.0480], // Closing point
];

export const MANUAL_TERRITORY: Territory = {
  id: "manual_showcase_sector_ahmedabad",
  userId: "showcase_runner_kanu",
  userName: "Kanu (Prime Sector)",
  sessionId: "session_manual_prime_1",
  polygonGeoJSON: JSON.stringify(turf.polygon([MANUAL_TERRITORY_COORDINATES])),
  routeGeoJSON: JSON.stringify(MANUAL_TERRITORY_COORDINATES),
  areaSquareMeters: 18500000,
  distanceMeters: 18000,
  durationSeconds: 5400,
  createdAt: new Date().toISOString(),
};

export const MANUAL_VASTRAPUR_TERRITORY: Territory = {
  id: "manual_vastrapur_loop_ahmedabad",
  userId: "showcase_runner_kanav",
  userName: "Kanav (Vastrapur Loop)",
  sessionId: "session_manual_vastrapur_2",
  polygonGeoJSON: JSON.stringify(turf.polygon([MANUAL_VASTRAPUR_COORDINATES])),
  routeGeoJSON: JSON.stringify(MANUAL_VASTRAPUR_COORDINATES),
  areaSquareMeters: 3800000,
  distanceMeters: 8500,
  durationSeconds: 2400,
  createdAt: new Date().toISOString(),
};

export default function GodModeView() {
  const { user } = useAuth();
  const { profile } = useAims();

  // Location & GPS Tracking State
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isAcquiringGps, setIsAcquiringGps] = useState<boolean>(true);
  const [isSignalLost, setIsSignalLost] = useState<boolean>(false);
  const [isGpsModalOpen, setIsGpsModalOpen] = useState<boolean>(false);
  const [isWorldFeedOpen, setIsWorldFeedOpen] = useState<boolean>(false);
  const [focusCoordinates, setFocusCoordinates] = useState<[number, number] | null>(null);
  const [focusBounds, setFocusBounds] = useState<[number, number, number, number] | null>(null);

  // Resolved runner name
  const runnerName =
    profile?.name?.trim() ||
    user?.displayName?.trim() ||
    (user?.email ? user.email.split("@")[0] : "") ||
    (user?.phoneNumber ? user.phoneNumber : "") ||
    (typeof window !== "undefined" ? localStorage.getItem("aim_user_name") || localStorage.getItem("aim_username") || "" : "") ||
    "Streaker";

  // Active Run State
  const [isRunning, setIsRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [rawGPSPoints, setRawGPSPoints] = useState<GPSPoint[]>([]);
  const [liveRouteCoordinates, setLiveRouteCoordinates] = useState<[number, number][]>([]);

  // Territory Data initialized with the prominent manual showcase territories
  const [worldTerritories, setWorldTerritories] = useState<Territory[]>([
    MANUAL_TERRITORY,
    MANUAL_VASTRAPUR_TERRITORY,
  ]);
  const [totalCumulativeArea, setTotalCumulativeArea] = useState(47300000);
  const [cumulativeTerritoryGeoJSON, setCumulativeTerritoryGeoJSON] = useState<string | null>(null);

  // Summary Modal State
  const [summaryModalData, setSummaryModalData] = useState<{
    isOpen: boolean;
    distanceMeters: number;
    durationSeconds: number;
    newAreaMeters: number;
    totalCumulativeAreaMeters: number;
    isValidLoop: boolean;
    summaryMessage: string;
  }>({
    isOpen: false,
    distanceMeters: 0,
    durationSeconds: 0,
    newAreaMeters: 0,
    totalCumulativeAreaMeters: 0,
    isValidLoop: false,
    summaryMessage: "",
  });

  const watchIdRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load World Territories and User Permanent Territory (unconditional for all users)
  const loadTerritoryData = useCallback(async () => {
    try {
      const allTerritories = await getAllWorldTerritories(200);
      setWorldTerritories([
        MANUAL_TERRITORY,
        MANUAL_VASTRAPUR_TERRITORY,
        ...allTerritories.filter(
          (t) => t.id !== MANUAL_TERRITORY.id && t.id !== MANUAL_VASTRAPUR_TERRITORY.id
        ),
      ]);

      if (user?.uid) {
        const userStats = await getUserCumulativeTerritory(user.uid);
        setTotalCumulativeArea(userStats.totalTerritoryArea);
        setCumulativeTerritoryGeoJSON(userStats.cumulativeTerritoryGeoJSON);
      }
    } catch (err) {
      console.error("Failed to load territory data:", err);
    }
  }, [user]);

  useEffect(() => {
    loadTerritoryData();
  }, [loadTerritoryData]);

  // Synchronize route points, distance calculation, and live coordinates
  useEffect(() => {
    if (rawGPSPoints.length === 0) {
      setDistanceMeters(0);
      setLiveRouteCoordinates([]);
      return;
    }
    const filtered = filterGPSPoints(rawGPSPoints);
    const totalDist = calculateRouteDistance(filtered);
    setDistanceMeters(totalDist);

    const pointsToDraw = filtered.length >= 2 ? filtered : rawGPSPoints;
    setLiveRouteCoordinates(pointsToDraw.map((p) => [p.longitude, p.latitude]));
  }, [rawGPSPoints]);

  // Request GPS position (Ask Mode & Device Check)
  const requestLocation = useCallback(() => {
    setIsAcquiringGps(true);
    setLocationError(null);
    setIsSignalLost(false);

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationError("Geolocation is not supported by your browser/device.");
      setIsAcquiringGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setCurrentLocation({ latitude, longitude });
        setGpsAccuracy(accuracy);
        setLocationError(null);
        setIsAcquiringGps(false);
        setIsSignalLost(false);
      },
      (err) => {
        let msg = "Failed to acquire GPS location.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location permission was denied. Please allow location access in your browser to track your run.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "Device GPS / Location is turned off. Please turn on Location in your device settings.";
        } else if (err.code === err.TIMEOUT) {
          msg = "GPS location request timed out. Please check your signal and try again.";
        }
        setLocationError(msg);
        setCurrentLocation(null);
        setGpsAccuracy(null);
        setIsAcquiringGps(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, []);

  // Request initial location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Observe browser permission changes (e.g. user toggles permissions in site settings)
  useEffect(() => {
    if (typeof window === "undefined" || !("permissions" in navigator)) return;
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      ?.then((status) => {
        status.onchange = () => {
          if (status.state === "granted") {
            requestLocation();
          } else if (status.state === "denied") {
            setLocationError(
              "Location permission was denied. Please allow location access in your browser to track your run."
            );
            setCurrentLocation(null);
            setGpsAccuracy(null);
            setIsAcquiringGps(false);
          }
        };
      })
      ?.catch(() => {
        // Permissions query not supported on this browser
      });
  }, [requestLocation]);

  // Start Running Session
  const handleStartRun = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationError("Geolocation is not supported on this device.");
      setIsGpsModalOpen(true);
      return;
    }

    // Strict Guard: Prevent starting running if GPS is off, denied, unavailable, or still acquiring
    if (!currentLocation || locationError || isAcquiringGps) {
      if (locationError) {
        setIsGpsModalOpen(true);
      } else {
        requestLocation();
      }
      return;
    }

    setIsRunning(true);
    setStartedAt(new Date().toISOString());
    setDurationSeconds(0);
    setDistanceMeters(0);
    setRawGPSPoints([]);
    setLiveRouteCoordinates([]);
    setIsSignalLost(false);

    // Start live duration counter
    timerIntervalRef.current = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);

    // Watch position
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed } = pos.coords;
        setCurrentLocation({ latitude, longitude });
        setGpsAccuracy(accuracy);
        setIsSignalLost(false);

        const newPoint: GPSPoint = {
          latitude,
          longitude,
          timestamp: pos.timestamp || Date.now(),
          accuracy,
          speed: speed || null,
        };

        setRawGPSPoints((prev) => [...prev, newPoint]);
      },
      (err) => {
        console.warn("GPS tracking warning:", err.message);
        setIsSignalLost(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      }
    );

    watchIdRef.current = watchId;
  };

  // Stop Running Session & Calculate Territory
  const handleFinishRun = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setIsRunning(false);
    const endedAt = new Date().toISOString();
    const finalFiltered = filterGPSPoints(rawGPSPoints);

    // Evaluate route for territory
    const result = evaluateRouteForTerritory(
      finalFiltered,
      cumulativeTerritoryGeoJSON,
      totalCumulativeArea
    );

    const finalDistance = calculateRouteDistance(finalFiltered);

    // Determine final display area
    const effectiveArea =
      result.newUniqueAreaMeters > 0
        ? result.newUniqueAreaMeters
        : result.rawAreaMeters > 0
        ? result.rawAreaMeters
        : Math.max(1, Math.round(finalDistance * 15));

    const coordsToSave = [...liveRouteCoordinates];
    setRawGPSPoints([]);
    setLiveRouteCoordinates([]);

    // Optimistically construct and inject territory so the shape NEVER disappears
    const polyGeo =
      result.newPolygonGeoJSON ||
      (coordsToSave.length >= 2
        ? (() => {
            try {
              if (coordsToSave.length >= 3) {
                const closed = [...coordsToSave, coordsToSave[0]];
                const testPoly = turf.polygon([closed]);
                if (turf.area(testPoly) > 25) {
                  return JSON.stringify(testPoly);
                }
              }
              const line = turf.lineString(coordsToSave);
              const corridor = turf.buffer(line, 0.025, { units: "kilometers" });
              return corridor ? JSON.stringify(corridor) : null;
            } catch {
              return null;
            }
          })()
        : (coordsToSave.length === 1
            ? (() => {
                try {
                  const pt = turf.point(coordsToSave[0]);
                  const zone = turf.buffer(pt, 0.035, { units: "kilometers" });
                  return zone ? JSON.stringify(zone) : null;
                } catch {
                  return null;
                }
              })()
            : null));

    if (polyGeo) {
      const optimisticTerritory: Territory = {
        id: `territory_${Date.now()}`,
        userId: user?.uid || "current_user",
        userName: runnerName,
        sessionId: `session_${Date.now()}`,
        polygonGeoJSON: polyGeo,
        routeGeoJSON: JSON.stringify(coordsToSave),
        areaSquareMeters: effectiveArea,
        distanceMeters: Math.round(finalDistance),
        durationSeconds,
        createdAt: endedAt,
      };
      setWorldTerritories((prev) => [
        optimisticTerritory,
        ...prev.filter((t) => t.id !== optimisticTerritory.id),
      ]);
    }

    // Persist session and territory in Firestore and local cache forever
    const currentUserId = user?.uid || "local_user";
    try {
      await saveRunningSessionAndTerritory({
        userId: currentUserId,
        userName: runnerName,
        startedAt: startedAt || endedAt,
        endedAt,
        distanceMeters: finalDistance,
        durationSeconds,
        newPolygonGeoJSON: result.newPolygonGeoJSON || polyGeo,
        newUniqueAreaMeters: result.newUniqueAreaMeters,
        updatedCumulativeGeoJSON: result.updatedCumulativeGeoJSON,
        totalCumulativeAreaMeters: result.totalCumulativeAreaMeters,
        routeCoordinates: coordsToSave,
      });

      // Update local state with new cumulative values
      setTotalCumulativeArea(result.totalCumulativeAreaMeters);
      if (result.updatedCumulativeGeoJSON) {
        setCumulativeTerritoryGeoJSON(result.updatedCumulativeGeoJSON);
      }

      // Refresh world territories to confirm cloud sync
      await loadTerritoryData();
    } catch (err) {
      console.error("Failed to save running session:", err);
    }

    // Open Summary Modal
    setSummaryModalData({
      isOpen: true,
      distanceMeters: finalDistance,
      durationSeconds,
      newAreaMeters: effectiveArea,
      totalCumulativeAreaMeters: Math.max(totalCumulativeArea, result.totalCumulativeAreaMeters),
      isValidLoop: result.isValidLoop,
      summaryMessage: result.isValidLoop
        ? result.message
        : "Route completed & saved forever! Your claimed corridor is now etched on the world map.",
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Check if runner is near starting point
  const isNearStartPoint = (() => {
    if (rawGPSPoints.length < 4 || distanceMeters < 30) return false;
    const start = rawGPSPoints[0];
    const current = rawGPSPoints[rawGPSPoints.length - 1];
    const dist = turf.distance(
      turf.point([start.longitude, start.latitude]),
      turf.point([current.longitude, current.latitude]),
      { units: "meters" }
    );
    return dist <= 50;
  })();

  // Developer Simulator: Generates a realistic closed walking loop around current location
  const handleTriggerDevSimulation = () => {
    let centerLat = 23.0495;
    let centerLng = 72.5123;

    if (worldTerritories && worldTerritories.length > 0) {
      try {
        const latest = worldTerritories[0];
        const parsed = JSON.parse(latest.polygonGeoJSON);
        const geom = parsed.geometry ? parsed.geometry : parsed;
        const c = turf.centroid(geom);
        centerLng = c.geometry.coordinates[0];
        centerLat = c.geometry.coordinates[1];
      } catch (e) {
        // fallback
      }
    } else if (currentLocation && (!gpsAccuracy || gpsAccuracy < 300)) {
      centerLat = currentLocation.latitude;
      centerLng = currentLocation.longitude;
    }

    const offset = 0.0015; // ~150 meters
    const simulatedPoints: GPSPoint[] = [
      { latitude: centerLat, longitude: centerLng, timestamp: Date.now(), accuracy: 5, speed: 2.2 },
      { latitude: centerLat + offset, longitude: centerLng, timestamp: Date.now() + 10000, accuracy: 5, speed: 2.4 },
      { latitude: centerLat + offset, longitude: centerLng + offset, timestamp: Date.now() + 20000, accuracy: 5, speed: 2.3 },
      { latitude: centerLat, longitude: centerLng + offset, timestamp: Date.now() + 30000, accuracy: 2.5, speed: 2.5 },
      { latitude: centerLat, longitude: centerLng, timestamp: Date.now() + 40000, accuracy: 5, speed: 2.1 },
    ];

    setLocationError(null);
    setIsAcquiringGps(false);
    setIsSignalLost(false);
    setRawGPSPoints(simulatedPoints);
    setLiveRouteCoordinates(simulatedPoints.map((p) => [p.longitude, p.latitude]));
    const dist = calculateRouteDistance(simulatedPoints);
    setDistanceMeters(dist);
    setDurationSeconds(180);
    setCurrentLocation({ latitude: centerLat, longitude: centerLng });
    setGpsAccuracy(5);
    setIsRunning(true);
    setStartedAt(new Date(Date.now() - 180000).toISOString());
  };

  // Calculate live covered area from raw GPS points while running
  const liveAreaMeters = (() => {
    if (rawGPSPoints.length < 3) return 0;
    try {
      const coords = rawGPSPoints.map((p) => [p.longitude, p.latitude]);
      const closed = [...coords, coords[0]];
      const poly = turf.polygon([closed]);
      return Math.round(turf.area(poly));
    } catch {
      return 0;
    }
  })();

  return (
    <div className="relative flex flex-1 flex-col w-full h-[100dvh] overflow-hidden bg-black select-none">
      {/* Location Error Banner */}
      {locationError && (
        <div className="absolute top-16 inset-x-0 z-30">
          <LocationErrorBanner
            error={locationError}
            isAcquiring={isAcquiringGps}
            onRetry={requestLocation}
            onHelp={() => setIsGpsModalOpen(true)}
          />
        </div>
      )}

      {/* Interactive Mapbox Tactical View */}
      <MapView
        userLocation={currentLocation}
        liveRouteCoordinates={liveRouteCoordinates}
        worldTerritories={worldTerritories}
        currentUserId={user?.uid || ""}
        focusCoordinates={focusCoordinates}
        focusBounds={focusBounds}
        liveDistanceMeters={distanceMeters}
        liveAreaMeters={liveAreaMeters}
      />

      {/* Floating HUD Controls */}
      <RunningHud
        isRunning={isRunning}
        distanceMeters={distanceMeters}
        durationSeconds={durationSeconds}
        totalCumulativeAreaMeters={totalCumulativeArea}
        gpsAccuracy={gpsAccuracy}
        isGpsReady={!!currentLocation && !locationError}
        isAcquiringGps={isAcquiringGps}
        locationError={locationError}
        isSignalLost={isSignalLost}
        isNearStartPoint={isNearStartPoint}
        hasEnoughPoints={rawGPSPoints.length >= 4}
        runnerName={runnerName}
        worldTerritoryCount={worldTerritories.length}
        onStartRun={handleStartRun}
        onFinishRun={handleFinishRun}
        onRequestGps={requestLocation}
        onOpenGpsHelp={() => setIsGpsModalOpen(true)}
        onOpenWorldFeed={() => setIsWorldFeedOpen(true)}
        onTriggerDevSimulation={handleTriggerDevSimulation}
      />

      {/* World Streakers Feed Drawer */}
      <WorldStreakersFeed
        isOpen={isWorldFeedOpen}
        territories={worldTerritories}
        currentUserId={user?.uid || ""}
        onClose={() => setIsWorldFeedOpen(false)}
        onSelectTerritory={(territory) => {
          try {
            let parsed = JSON.parse(territory.polygonGeoJSON);
            let geom: any = null;
            if (parsed.type === "FeatureCollection" && parsed.features?.[0]) {
              geom = parsed.features[0].geometry || parsed.features[0];
            } else if (parsed.type === "Feature") {
              geom = parsed.geometry;
            } else {
              geom = parsed.geometry ? parsed.geometry : parsed;
            }
            if (geom) {
              const centroid = turf.centroid(geom);
              const bbox = turf.bbox(geom);
              setFocusCoordinates(centroid.geometry.coordinates as [number, number]);
              setFocusBounds(bbox as [number, number, number, number]);
            }
          } catch (err) {
            console.error("Failed to parse territory for focus:", err);
          }
        }}
      />

      {/* GPS Permission & Guidance Modal */}
      <GpsPermissionModal
        isOpen={isGpsModalOpen}
        error={locationError}
        isAcquiring={isAcquiringGps}
        onRetry={requestLocation}
        onClose={() => setIsGpsModalOpen(false)}
      />

      {/* Run Summary Modal */}
      <RunSummaryModal
        isOpen={summaryModalData.isOpen}
        runnerName={runnerName}
        distanceMeters={summaryModalData.distanceMeters}
        durationSeconds={summaryModalData.durationSeconds}
        newAreaMeters={summaryModalData.newAreaMeters}
        totalCumulativeAreaMeters={summaryModalData.totalCumulativeAreaMeters}
        isValidLoop={summaryModalData.isValidLoop}
        summaryMessage={summaryModalData.summaryMessage}
        onClose={() =>
          setSummaryModalData((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
}
