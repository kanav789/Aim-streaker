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

  // Active Run State
  const [isRunning, setIsRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [rawGPSPoints, setRawGPSPoints] = useState<GPSPoint[]>([]);
  const [liveRouteCoordinates, setLiveRouteCoordinates] = useState<[number, number][]>([]);

  // Territory Data
  const [worldTerritories, setWorldTerritories] = useState<Territory[]>([]);
  const [totalCumulativeArea, setTotalCumulativeArea] = useState(0);
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

  // Load World Territories and User Permanent Territory
  const loadTerritoryData = useCallback(async () => {
    if (!user) return;
    try {
      const [allTerritories, userStats] = await Promise.all([
        getAllWorldTerritories(200),
        getUserCumulativeTerritory(user.uid),
      ]);
      setWorldTerritories(allTerritories);
      setTotalCumulativeArea(userStats.totalTerritoryArea);
      setCumulativeTerritoryGeoJSON(userStats.cumulativeTerritoryGeoJSON);
    } catch (err) {
      console.error("Failed to load territory data:", err);
    }
  }, [user]);

  useEffect(() => {
    loadTerritoryData();
  }, [loadTerritoryData]);

  // Request initial GPS position
  const requestLocation = useCallback(() => {
    setLocationError(null);
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationError("Geolocation is not supported by your browser/device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setCurrentLocation({ latitude, longitude });
        setGpsAccuracy(accuracy);
        setLocationError(null);
      },
      (err) => {
        let msg = "Failed to acquire GPS location.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location permission was denied. Please enable GPS permissions in your browser.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "GPS location is currently unavailable. Ensure device location is turned on.";
        } else if (err.code === err.TIMEOUT) {
          msg = "GPS location request timed out. Please try again in an open area.";
        }
        setLocationError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Start Running Session
  const handleStartRun = () => {
    if (!("geolocation" in navigator)) {
      setLocationError("Geolocation is not supported on this device.");
      return;
    }

    setIsRunning(true);
    setStartedAt(new Date().toISOString());
    setDurationSeconds(0);
    setDistanceMeters(0);
    setRawGPSPoints([]);
    setLiveRouteCoordinates([]);

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

        const newPoint: GPSPoint = {
          latitude,
          longitude,
          timestamp: pos.timestamp || Date.now(),
          accuracy,
          speed: speed || null,
        };

        setRawGPSPoints((prev) => {
          const updated = [...prev, newPoint];
          const filtered = filterGPSPoints(updated);
          const totalDist = calculateRouteDistance(filtered);
          setDistanceMeters(totalDist);
          setLiveRouteCoordinates(filtered.map((p) => [p.longitude, p.latitude]));
          return updated;
        });
      },
      (err) => {
        console.warn("GPS tracking warning:", err.message);
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

    // Persist session and territory in Firestore
    if (user) {
      try {
        await saveRunningSessionAndTerritory({
          userId: user.uid,
          userName: profile?.name || "Streaker",
          startedAt: startedAt || endedAt,
          endedAt,
          distanceMeters: finalDistance,
          durationSeconds,
          newPolygonGeoJSON: result.newPolygonGeoJSON,
          newUniqueAreaMeters: result.newUniqueAreaMeters,
          updatedCumulativeGeoJSON: result.updatedCumulativeGeoJSON,
          totalCumulativeAreaMeters: result.totalCumulativeAreaMeters,
          routeCoordinates: liveRouteCoordinates,
        });

        // Update local state with new cumulative values
        setTotalCumulativeArea(result.totalCumulativeAreaMeters);
        if (result.updatedCumulativeGeoJSON) {
          setCumulativeTerritoryGeoJSON(result.updatedCumulativeGeoJSON);
        }

        // Refresh world territories
        await loadTerritoryData();
      } catch (err) {
        console.error("Failed to save running session to Firestore:", err);
      }
    }

    // Open Summary Modal
    setSummaryModalData({
      isOpen: true,
      distanceMeters: finalDistance,
      durationSeconds,
      newAreaMeters: result.newUniqueAreaMeters,
      totalCumulativeAreaMeters: result.totalCumulativeAreaMeters,
      isValidLoop: result.isValidLoop,
      summaryMessage: result.message,
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
    const centerLat = currentLocation ? currentLocation.latitude : 40.7829;
    const centerLng = currentLocation ? currentLocation.longitude : -73.9654;

    const offset = 0.0015; // ~150 meters
    const simulatedPoints: GPSPoint[] = [
      { latitude: centerLat, longitude: centerLng, timestamp: Date.now(), accuracy: 5, speed: 2.2 },
      { latitude: centerLat + offset, longitude: centerLng, timestamp: Date.now() + 10000, accuracy: 5, speed: 2.4 },
      { latitude: centerLat + offset, longitude: centerLng + offset, timestamp: Date.now() + 20000, accuracy: 5, speed: 2.3 },
      { latitude: centerLat, longitude: centerLng + offset, timestamp: Date.now() + 30000, accuracy: 5, speed: 2.5 },
      { latitude: centerLat, longitude: centerLng, timestamp: Date.now() + 40000, accuracy: 5, speed: 2.1 },
    ];

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

  return (
    <div className="relative flex flex-1 flex-col w-full h-[100dvh] overflow-hidden bg-black select-none">
      {/* Location Error Banner */}
      {locationError && (
        <div className="absolute top-16 inset-x-0 z-30">
          <LocationErrorBanner error={locationError} onRetry={requestLocation} />
        </div>
      )}

      {/* Interactive Mapbox Tactical View */}
      <MapView
        userLocation={currentLocation}
        liveRouteCoordinates={liveRouteCoordinates}
        worldTerritories={worldTerritories}
        currentUserId={user?.uid || ""}
      />

      {/* Floating HUD Controls */}
      <RunningHud
        isRunning={isRunning}
        distanceMeters={distanceMeters}
        durationSeconds={durationSeconds}
        totalCumulativeAreaMeters={totalCumulativeArea}
        gpsAccuracy={gpsAccuracy}
        isNearStartPoint={isNearStartPoint}
        hasEnoughPoints={rawGPSPoints.length >= 4}
        onStartRun={handleStartRun}
        onFinishRun={handleFinishRun}
        onTriggerDevSimulation={handleTriggerDevSimulation}
      />

      {/* Run Summary Modal */}
      <RunSummaryModal
        isOpen={summaryModalData.isOpen}
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
