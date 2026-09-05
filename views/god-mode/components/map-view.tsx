"use client";

import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Feature, FeatureCollection, Geometry, LineString, Polygon, MultiPolygon } from "geojson";
import { Territory } from "@/service/running";
import { formatArea } from "@/service/running";

interface MapViewProps {
  userLocation: { latitude: number; longitude: number } | null;
  liveRouteCoordinates: [number, number][]; // [lng, lat][]
  worldTerritories: Territory[];
  currentUserId: string;
  onMapLoaded?: () => void;
}

// Direct, high-speed inline OpenStreetMap style that loads immediately with 0 external style dependencies
const OPENSTREETMAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "osm-tiles": {
      type: "raster",
      tiles: [
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: "osm-tiles-layer",
      type: "raster",
      source: "osm-tiles",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export function MapView({
  userLocation,
  liveRouteCoordinates,
  worldTerritories,
  currentUserId,
  onMapLoaded,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Projected screen coordinates for the live route and covered area
  const [projectedRoutePoints, setProjectedRoutePoints] = useState<{ x: number; y: number }[]>([]);

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialLng = userLocation ? userLocation.longitude : 0;
    const initialLat = userLocation ? userLocation.latitude : 20;
    const initialZoom = userLocation ? 16 : 2;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OPENSTREETMAP_STYLE,
      center: [initialLng, initialLat],
      zoom: initialZoom,
      pitch: 0,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-left"
    );

    map.on("load", () => {
      map.resize();
      setIsMapReady(true);
      if (onMapLoaded) onMapLoaded();

      // 1. Live Route WebGL Layer (backup layer)
      map.addSource("live-route-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "live-route-line-casing",
        type: "line",
        source: "live-route-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#000000",
          "line-width": 8,
          "line-opacity": 0.5,
        },
      });

      map.addLayer({
        id: "live-route-line",
        type: "line",
        source: "live-route-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#a3ff12",
          "line-width": 5,
          "line-opacity": 0.95,
        },
      });

      // 2. Other Users' Territories Source & Layers (Cyan / Electric Blue)
      map.addSource("other-territories-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "other-territories-fill",
        type: "fill",
        source: "other-territories-source",
        paint: {
          "fill-color": "#00e5ff",
          "fill-opacity": 0.35,
        },
      });

      map.addLayer({
        id: "other-territories-line",
        type: "line",
        source: "other-territories-source",
        paint: {
          "line-color": "#00e5ff",
          "line-width": 2.5,
          "line-opacity": 0.9,
        },
      });

      // 3. My Territories Source & Layers (Neon Green)
      map.addSource("my-territories-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "my-territories-fill",
        type: "fill",
        source: "my-territories-source",
        paint: {
          "fill-color": "#a3ff12",
          "fill-opacity": 0.35,
        },
      });

      map.addLayer({
        id: "my-territories-line",
        type: "line",
        source: "my-territories-source",
        paint: {
          "line-color": "#a3ff12",
          "line-width": 3,
          "line-opacity": 0.95,
        },
      });

      // Territory Tap / Click Popup
      const setupPopupHandler = (layerId: string, isSelf: boolean) => {
        map.on("click", layerId, (e: maplibregl.MapLayerMouseEvent) => {
          if (!e.features || !e.features[0]) return;
          const props = e.features[0].properties;
          if (!props) return;

          const coordinates = e.lngLat;
          const ownerName = props.userName || (isSelf ? "You" : "Unknown Streaker");
          const area = Number(props.areaSquareMeters || 0);
          const createdAt = props.createdAt
            ? new Date(props.createdAt).toLocaleDateString()
            : "";

          new maplibregl.Popup({ offset: 15, className: "aim-map-popup" })
            .setLngLat(coordinates)
            .setHTML(
              `<div style="color: #000; font-family: sans-serif; padding: 4px;">
                <div style="font-weight: 800; font-size: 13px; color: ${isSelf ? "#10b981" : "#0284c7"}">
                  ${isSelf ? "🏴 Your Territory" : `👤 ${ownerName}`}
                </div>
                <div style="font-size: 11px; margin-top: 2px; color: #4b5563;">
                  Area: <strong>${formatArea(area)}</strong>
                </div>
                ${createdAt ? `<div style="font-size: 9px; color: #9ca3af; margin-top: 2px;">Claimed: ${createdAt}</div>` : ""}
              </div>`
            )
            .addTo(map);
        });

        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
        });
      };

      setupPopupHandler("my-territories-fill", true);
      setupPopupHandler("other-territories-fill", false);
    });

    const handleResize = () => {
      map.resize();
    };
    window.addEventListener("resize", handleResize);

    mapRef.current = map;

    return () => {
      window.removeEventListener("resize", handleResize);
      map.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, []);

  // Synchronize SVG projected points on route change and map movement
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    const map = mapRef.current;

    const updateProjectedPoints = () => {
      if (liveRouteCoordinates.length === 0) {
        setProjectedRoutePoints([]);
        return;
      }
      const points = liveRouteCoordinates.map((coord) => map.project(coord));
      setProjectedRoutePoints(points);
    };

    updateProjectedPoints();

    map.on("move", updateProjectedPoints);
    map.on("zoom", updateProjectedPoints);
    map.on("rotate", updateProjectedPoints);

    return () => {
      map.off("move", updateProjectedPoints);
      map.off("zoom", updateProjectedPoints);
      map.off("rotate", updateProjectedPoints);
    };
  }, [liveRouteCoordinates, isMapReady]);

  // Update User Marker & Center
  useEffect(() => {
    if (!mapRef.current || !isMapReady || !userLocation) return;

    mapRef.current.resize();

    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "user-gps-marker";
      el.innerHTML = `
        <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: #a3ff12; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #a3ff12; border: 2.5px solid #ffffff; box-shadow: 0 0 14px rgba(163,255,18,0.95);"></div>
        </div>
      `;

      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(mapRef.current);

      mapRef.current.flyTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: 16.5,
        essential: true,
      });
    } else {
      userMarkerRef.current.setLngLat([
        userLocation.longitude,
        userLocation.latitude,
      ]);
    }
  }, [userLocation, isMapReady]);

  // Update Live Route WebGL Layer
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    const source = mapRef.current.getSource("live-route-source") as maplibregl.GeoJSONSource;
    if (source) {
      if (liveRouteCoordinates.length >= 2) {
        source.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: liveRouteCoordinates,
              },
            },
          ],
        });
      } else {
        source.setData({
          type: "FeatureCollection",
          features: [],
        });
      }
    }
  }, [liveRouteCoordinates, isMapReady]);

  // Update World Territories on Map
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    const myFeatures: Feature<Geometry>[] = [];
    const otherFeatures: Feature<Geometry>[] = [];

    for (const territory of worldTerritories) {
      try {
        const parsed = JSON.parse(territory.polygonGeoJSON);
        const geom = parsed.geometry ? parsed.geometry : parsed;
        const feature: Feature<Polygon | MultiPolygon> = {
          type: "Feature",
          properties: {
            id: territory.id,
            userId: territory.userId,
            userName: territory.userName,
            areaSquareMeters: territory.areaSquareMeters,
            createdAt: territory.createdAt,
          },
          geometry: geom,
        };

        if (territory.userId === currentUserId) {
          myFeatures.push(feature);
        } else {
          otherFeatures.push(feature);
        }
      } catch (err) {
        console.error("Failed to parse territory polygon:", err);
      }
    }

    const mySource = mapRef.current.getSource("my-territories-source") as maplibregl.GeoJSONSource;
    if (mySource) {
      mySource.setData({
        type: "FeatureCollection",
        features: myFeatures,
      } as FeatureCollection);
    }

    const otherSource = mapRef.current.getSource("other-territories-source") as maplibregl.GeoJSONSource;
    if (otherSource) {
      otherSource.setData({
        type: "FeatureCollection",
        features: otherFeatures,
      } as FeatureCollection);
    }
  }, [worldTerritories, currentUserId, isMapReady]);

  // Recenter helper
  const handleRecenter = () => {
    if (!mapRef.current || !userLocation) return;
    mapRef.current.easeTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 16.5,
      duration: 1000,
    });
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-black overflow-hidden tactical-map">
      {/* Base Map Container */}
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
      />

      {/* High-Visibility Projected SVG Live Route & Covered Area Overlay */}
      {projectedRoutePoints.length >= 1 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
          {/* Covered Area Polygon (Shaded Area being captured) */}
          {projectedRoutePoints.length >= 3 && (
            <polygon
              points={projectedRoutePoints.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(" ")}
              fill="rgba(163, 255, 18, 0.25)"
              stroke="#a3ff12"
              strokeWidth="2.5"
              strokeDasharray="6 4"
            />
          )}

          {/* Active Running Line */}
          {projectedRoutePoints.length >= 2 && (
            <>
              {/* Outer Casing for contrast */}
              <path
                d={`M ${projectedRoutePoints.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(" L ")}`}
                fill="none"
                stroke="#000000"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.6"
              />
              {/* Vibrant Neon Green Route */}
              <path
                d={`M ${projectedRoutePoints.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(" L ")}`}
                fill="none"
                stroke="#a3ff12"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: "drop-shadow(0 0 8px #a3ff12)" }}
              />
            </>
          )}

          {/* Start Point Beacon Pin */}
          {projectedRoutePoints.length >= 1 && (
            <g transform={`translate(${Math.round(projectedRoutePoints[0].x)}, ${Math.round(projectedRoutePoints[0].y)})`}>
              <circle r="14" fill="#a3ff12" fillOpacity="0.3" className="animate-ping" />
              <circle r="6" fill="#a3ff12" stroke="#ffffff" strokeWidth="2.5" />
              <text
                y="-12"
                textAnchor="middle"
                fill="#a3ff12"
                fontSize="11"
                fontWeight="900"
                stroke="#000000"
                strokeWidth="3"
                paintOrder="stroke"
              >
                🏁 START
              </text>
            </g>
          )}
        </svg>
      )}

      {/* Recenter Button */}
      {userLocation && isMapReady && (
        <button
          onClick={handleRecenter}
          className="absolute right-4 bottom-52 z-20 flex items-center justify-center w-11 h-11 rounded-2xl bg-zinc-950/80 backdrop-blur-md border border-zinc-800 text-white shadow-lg hover:border-zinc-700 active:scale-95 transition"
          aria-label="Recenter Map"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5 text-accent"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 2.25v2.25m0 15v2.25m9.75-9.75h-2.25m-15 0H2.25m14.25 0a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default MapView;
