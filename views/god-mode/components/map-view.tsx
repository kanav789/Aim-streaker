"use client";

import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, Geometry, LineString, Polygon, MultiPolygon } from "geojson";
import { Territory } from "@/service/running";
import { formatArea, formatDistance } from "@/service/running";

interface MapViewProps {
  userLocation: { latitude: number; longitude: number } | null;
  liveRouteCoordinates: [number, number][]; // [lng, lat][]
  worldTerritories: Territory[];
  currentUserId: string;
  focusCoordinates?: [number, number] | null;
  focusBounds?: [number, number, number, number] | null;
  liveDistanceMeters?: number;
  liveAreaMeters?: number;
  onMapLoaded?: () => void;
}

// High-contrast, pitch-black tactical dark mode style with ZERO watermarks, NO API key required, and 100% reliable raster loading
const TACTICAL_DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "esri-dark-base": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 16,
      attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
    },
    "esri-dark-ref": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 16,
    },
  },
  layers: [
    {
      id: "dark-background",
      type: "background",
      paint: {
        "background-color": "#080a0e",
      },
    },
    {
      id: "esri-dark-base-layer",
      type: "raster",
      source: "esri-dark-base",
      minzoom: 0,
      maxzoom: 22,
      paint: {
        "raster-brightness-max": 0.4, // Deepens the gray into midnight pitch black
        "raster-contrast": 0.35,       // High contrast roads and street grids
        "raster-saturation": -1.0,     // Eliminates brownish tints for pure dark mode
      },
    },
    {
      id: "esri-dark-ref-layer",
      type: "raster",
      source: "esri-dark-ref",
      minzoom: 0,
      maxzoom: 22,
      paint: {
        "raster-contrast": 0.4,        // Crisp street names and landmarks
        "raster-brightness-min": 0.15, // Clear, legible labels
      },
    },
  ],
};

export interface ProjectedTerritory {
  id: string;
  userName: string;
  isSelf: boolean;
  area: number;
  center: { x: number; y: number };
  rings: { x: number; y: number }[][];
}

export function MapView({
  userLocation,
  liveRouteCoordinates,
  worldTerritories,
  currentUserId,
  focusCoordinates,
  focusBounds,
  liveDistanceMeters = 0,
  liveAreaMeters = 0,
  onMapLoaded,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const territoryMarkersRef = useRef<maplibregl.Marker[]>([]);
  const hasAutoCenteredRef = useRef(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // Projected screen coordinates for the live route and covered area
  const [projectedRoutePoints, setProjectedRoutePoints] = useState<{ x: number; y: number }[]>([]);
  // Projected screen polygons for ALL world territories & manual showcase shapes
  const [projectedTerritories, setProjectedTerritories] = useState<ProjectedTerritory[]>([]);

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Prioritize captured territory, then user location, then Thaltej/Ahmedabad
    let initialLng = 72.5120;
    let initialLat = 23.0300;
    let initialZoom = 12.8;

    if (worldTerritories && worldTerritories.length > 0) {
      try {
        const latest = worldTerritories[0];
        const parsed = JSON.parse(latest.polygonGeoJSON);
        const geom = parsed.geometry ? parsed.geometry : parsed;
        const c = turf.centroid(geom);
        initialLng = c.geometry.coordinates[0];
        initialLat = c.geometry.coordinates[1];
        initialZoom = 12.8;
      } catch (e) {
        // fallback
      }
    } else if (userLocation) {
      initialLng = userLocation.longitude;
      initialLat = userLocation.latitude;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: TACTICAL_DARK_STYLE,
      center: [initialLng, initialLat],
      zoom: initialZoom,
      pitch: 0,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-left"
    );

    map.on("error", (e) => {
      console.warn("[TacticalMap Warning]", e);
    });

    setTimeout(() => {
      map.resize();
    }, 100);

    map.on("load", () => {
      map.resize();
      setIsMapReady(true);
      if (onMapLoaded) onMapLoaded();

      // 1. Other Users' Territories Source & Layers (Unified Glowing Neon Green Aesthetic)
      map.addSource("other-territories-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "other-territories-fill",
        type: "fill",
        source: "other-territories-source",
        paint: {
          "fill-color": "#a3ff12",
          "fill-opacity": 0.25,
        },
      });

      map.addLayer({
        id: "other-territories-glow",
        type: "line",
        source: "other-territories-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#a3ff12",
          "line-width": 10,
          "line-opacity": 0.35,
          "line-blur": 3,
        },
      });

      map.addLayer({
        id: "other-territories-casing",
        type: "line",
        source: "other-territories-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#000000",
          "line-width": 8,
          "line-opacity": 0.7,
        },
      });

      map.addLayer({
        id: "other-territories-line",
        type: "line",
        source: "other-territories-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#a3ff12",
          "line-width": 5,
          "line-opacity": 1.0,
        },
      });

      // 2. My Territories Source & Layers (Neon Green with High-Contrast Casing and Glow)
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
          "fill-opacity": 0.25,
        },
      });

      map.addLayer({
        id: "my-territories-glow",
        type: "line",
        source: "my-territories-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#a3ff12",
          "line-width": 10,
          "line-opacity": 0.35,
          "line-blur": 3,
        },
      });

      map.addLayer({
        id: "my-territories-casing",
        type: "line",
        source: "my-territories-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#000000",
          "line-width": 8,
          "line-opacity": 0.7,
        },
      });

      map.addLayer({
        id: "my-territories-line",
        type: "line",
        source: "my-territories-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#a3ff12",
          "line-width": 5,
          "line-opacity": 1.0,
        },
      });

      // 3. Other Users' Running Route Tracks (Neon Lime with Dark Casing)
      map.addSource("other-routes-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "other-routes-casing",
        type: "line",
        source: "other-routes-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#000000",
          "line-width": 8,
          "line-opacity": 0.7,
        },
      });

      map.addLayer({
        id: "other-routes-line",
        type: "line",
        source: "other-routes-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#a3ff12",
          "line-width": 5,
          "line-opacity": 1.0,
        },
      });

      // 4. My Running Route Tracks (Neon Lime with Dark Casing)
      map.addSource("my-routes-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "my-routes-casing",
        type: "line",
        source: "my-routes-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#000000",
          "line-width": 8,
          "line-opacity": 0.7,
        },
      });

      map.addLayer({
        id: "my-routes-line",
        type: "line",
        source: "my-routes-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#a3ff12",
          "line-width": 5,
          "line-opacity": 1.0,
        },
      });

      // 5. Live Route WebGL Layer (Highest WebGL priority)
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
          "line-width": 9.5,
          "line-opacity": 0.85,
        },
      });

      map.addLayer({
        id: "live-route-line",
        type: "line",
        source: "live-route-source",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#a3ff12",
          "line-width": 6,
          "line-opacity": 1.0,
        },
      });

      // Territory Tap / Click Popup
      const setupPopupHandler = (layerId: string, isSelf: boolean) => {
        map.on("click", layerId, (e: maplibregl.MapLayerMouseEvent) => {
          if (!e.features || !e.features[0]) return;
          const props = e.features[0].properties;
          if (!props) return;

          const coordinates = e.lngLat;
          const ownerName = props.userName || (isSelf ? "You" : "Runner");
          const area = Number(props.areaSquareMeters || 0);
          const distance = Number(props.distanceMeters || 0);
          const createdAt = props.createdAt
            ? new Date(props.createdAt).toLocaleDateString()
            : "";

          new maplibregl.Popup({ offset: 15, className: isSelf ? "aim-map-popup self-popup" : "aim-map-popup" })
            .setLngLat(coordinates)
            .setHTML(
              `<div style="font-family: inherit; padding: 2px 0;">
                <div style="font-weight: 900; font-size: 13px; color: #a3ff12; display: flex; align-items: center; gap: 6px; letter-spacing: -0.01em;">
                  <span>${isSelf ? "👑" : "👤"}</span>
                  <span>${isSelf ? "Your Territory (" + ownerName + ")" : ownerName + "'s Territory"}</span>
                </div>
                ${distance > 0 ? `<div style="font-size: 11px; margin-top: 6px; color: #e4e4e7; font-weight: 700; display: flex; align-items: center; gap: 4px;"><span>🏃</span><span>Run Route:</span><span style="color: #ffffff; font-weight: 800;">${formatDistance(distance)}</span></div>` : ""}
                <div style="font-size: 11px; margin-top: 3px; color: #a1a1aa; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                  <span>🏴</span><span>Area Covered:</span><span style="color: #ffffff; font-weight: 800;">${formatArea(area)}</span>
                </div>
                ${createdAt ? `<div style="font-size: 10px; color: #71717a; margin-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 4px;">Claimed: ${createdAt}</div>` : ""}
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
      setupPopupHandler("my-territories-line", true);
      setupPopupHandler("other-territories-fill", false);
      setupPopupHandler("other-territories-line", false);
      setupPopupHandler("my-routes-line", true);
      setupPopupHandler("other-routes-line", false);
    });

    const handleResize = () => {
      map.resize();
    };
    window.addEventListener("resize", handleResize);

    mapRef.current = map;
    if (typeof window !== "undefined") {
      (window as any).__aimMap = map;
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      territoryMarkersRef.current.forEach((m) => m.remove());
      territoryMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, []);

  // Synchronize SVG projected territory shapes and live route points on map movement & zoom
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    const map = mapRef.current;

    const updateAllProjected = () => {
      // 1. Live route points
      if (liveRouteCoordinates.length === 0) {
        setProjectedRoutePoints([]);
      } else {
        const points = liveRouteCoordinates.map((coord) => map.project(coord));
        setProjectedRoutePoints(points);
      }

      // 2. Projected Territory Polygons
      const list: ProjectedTerritory[] = [];

      for (const territory of worldTerritories) {
        try {
          let parsed: any = null;
          try {
            parsed = typeof territory.polygonGeoJSON === "string"
              ? JSON.parse(territory.polygonGeoJSON)
              : territory.polygonGeoJSON;
          } catch {
            parsed = null;
          }

          let geom: any = null;
          if (parsed) {
            if (parsed.type === "FeatureCollection" && parsed.features?.[0]?.geometry) {
              geom = parsed.features[0].geometry;
            } else if (parsed.type === "Feature" && parsed.geometry) {
              geom = parsed.geometry;
            } else if (parsed.type === "Polygon" || parsed.type === "MultiPolygon") {
              geom = parsed;
            } else if (parsed.geometry) {
              geom = parsed.geometry;
            }
          }

          // Route fallback
          let routeCoords: [number, number][] = [];
          if (territory.routeGeoJSON) {
            try {
              const r = typeof territory.routeGeoJSON === "string"
                ? JSON.parse(territory.routeGeoJSON)
                : territory.routeGeoJSON;
              if (Array.isArray(r)) {
                routeCoords = r.map((p: any) =>
                  Array.isArray(p) ? [p[0], p[1]] : [p.longitude ?? p.lng, p.latitude ?? p.lat]
                );
              } else if (r?.coordinates) {
                routeCoords = r.coordinates;
              }
            } catch {}
          }

          if (
            !geom ||
            (geom.type === "Polygon" && (!geom.coordinates || geom.coordinates[0]?.length < 3))
          ) {
            if (routeCoords.length >= 3) {
              const startPt = routeCoords[0];
              const endPt = routeCoords[routeCoords.length - 1];
              const distKm = turf.distance(startPt, endPt);
              if (distKm <= 0.25) {
                geom = turf.polygon([[...routeCoords, routeCoords[0]]]).geometry;
              } else {
                geom = turf.buffer(turf.lineString(routeCoords), 0.04, { units: "kilometers" })?.geometry;
              }
            } else if (routeCoords.length >= 2) {
              geom = turf.buffer(turf.lineString(routeCoords), 0.04, { units: "kilometers" })?.geometry;
            } else if (routeCoords.length === 1) {
              geom = turf.buffer(turf.point(routeCoords[0]), 0.06, { units: "kilometers" })?.geometry;
            }
          }

          if (!geom) continue;

          let rawRings: [number, number][][] = [];
          if (geom.type === "Polygon") {
            rawRings = geom.coordinates;
          } else if (geom.type === "MultiPolygon") {
            rawRings = geom.coordinates.flat(1);
          }

          if (rawRings.length === 0) continue;

          const projectedRings: { x: number; y: number }[][] = rawRings.map((ring) =>
            ring.map((coord) => map.project(coord))
          );

          const mainRing = projectedRings[0] || [];
          let cx = 0;
          let cy = 0;
          if (mainRing.length > 0) {
            cx = Math.round(mainRing.reduce((sum, p) => sum + p.x, 0) / mainRing.length);
            cy = Math.round(mainRing.reduce((sum, p) => sum + p.y, 0) / mainRing.length);
          }

          list.push({
            id: territory.id || `territory_${Math.random()}`,
            userName: territory.userName || "Runner",
            isSelf: territory.userId === currentUserId,
            area: territory.areaSquareMeters || 0,
            center: { x: cx, y: cy },
            rings: projectedRings,
          });
        } catch (err) {
          console.warn("Failed to project territory polygon:", territory.id, err);
        }
      }

      setProjectedTerritories(list);
    };

    updateAllProjected();

    map.on("move", updateAllProjected);
    map.on("zoom", updateAllProjected);
    map.on("rotate", updateAllProjected);

    return () => {
      map.off("move", updateAllProjected);
      map.off("zoom", updateAllProjected);
      map.off("rotate", updateAllProjected);
    };
  }, [liveRouteCoordinates, worldTerritories, currentUserId, isMapReady]);

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

      // Only fly to user location if actively tracking or if no territories exist yet
      if (liveRouteCoordinates.length > 0 || !worldTerritories || worldTerritories.length === 0) {
        mapRef.current.flyTo({
          center: [userLocation.longitude, userLocation.latitude],
          zoom: 16.5,
          essential: true,
        });
      }
    } else {
      userMarkerRef.current.setLngLat([
        userLocation.longitude,
        userLocation.latitude,
      ]);
    }
  }, [userLocation, isMapReady, liveRouteCoordinates.length, worldTerritories]);

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

  // Update World Territories on Map & Render Territory Name Badges
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    // Clear previous territory markers
    territoryMarkersRef.current.forEach((m) => m.remove());
    territoryMarkersRef.current = [];

    const myFeatures: Feature<Geometry>[] = [];
    const otherFeatures: Feature<Geometry>[] = [];
    const myRouteFeatures: Feature<Geometry>[] = [];
    const otherRouteFeatures: Feature<Geometry>[] = [];

    for (const territory of worldTerritories) {
      try {
        let parsed: any = null;
        try {
          parsed = JSON.parse(territory.polygonGeoJSON);
        } catch {
          parsed = null;
        }

        let geom: any = null;
        if (parsed) {
          if (parsed.type === "FeatureCollection") {
            if (parsed.features && parsed.features.length > 0) {
              const validFeatures = parsed.features.filter(
                (f: any) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
              );
              if (validFeatures.length === 1) {
                geom = validFeatures[0].geometry;
              } else if (validFeatures.length > 1) {
                const allCoords: any[] = [];
                for (const vf of validFeatures) {
                  if (vf.geometry.type === "Polygon") {
                    allCoords.push(vf.geometry.coordinates);
                  } else if (vf.geometry.type === "MultiPolygon") {
                    allCoords.push(...vf.geometry.coordinates);
                  }
                }
                geom = { type: "MultiPolygon", coordinates: allCoords };
              } else if (parsed.features[0]?.geometry) {
                geom = parsed.features[0].geometry;
              }
            }
          } else if (parsed.type === "Feature") {
            geom = parsed.geometry;
          } else if (parsed.type === "Polygon" || parsed.type === "MultiPolygon") {
            geom = parsed;
          } else if (parsed.geometry) {
            geom = parsed.geometry;
          }
        }

        // 1. Extract running route track (line)
        let routeCoords: [number, number][] = [];
        if (territory.routeGeoJSON) {
          try {
            const parsedRoute = JSON.parse(territory.routeGeoJSON);
            if (Array.isArray(parsedRoute)) {
              if (parsedRoute.length > 0 && typeof parsedRoute[0] === "object" && !Array.isArray(parsedRoute[0])) {
                routeCoords = parsedRoute.map((p: any) => [
                  Number(p.longitude ?? p.lng ?? p[0]),
                  Number(p.latitude ?? p.lat ?? p[1]),
                ]);
              } else {
                routeCoords = parsedRoute;
              }
            } else if (parsedRoute && parsedRoute.type === "LineString" && Array.isArray(parsedRoute.coordinates)) {
              routeCoords = parsedRoute.coordinates;
            } else if (parsedRoute && parsedRoute.type === "Feature" && parsedRoute.geometry?.coordinates) {
              routeCoords = parsedRoute.geometry.coordinates;
            }
          } catch (e) {
            console.warn("Could not parse routeGeoJSON for territory:", territory.id, e);
          }
        }

        // 2. Identify start/anchor coordinate for START beacon & runner name badge
        let pinLng = 72.5123;
        let pinLat = 23.0495;
        if (routeCoords.length >= 1) {
          pinLng = routeCoords[0][0];
          pinLat = routeCoords[0][1];
        } else if (geom) {
          try {
            const c = turf.centroid(geom);
            pinLng = c.geometry.coordinates[0];
            pinLat = c.geometry.coordinates[1];
          } catch {}
        }

        // 3. Fallback: If routeCoords empty or insufficient, extract perimeter from polygon
        if (routeCoords.length < 2 && geom) {
          if (geom.type === "Polygon" && Array.isArray(geom.coordinates?.[0])) {
            routeCoords = geom.coordinates[0] as [number, number][];
          } else if (geom.type === "MultiPolygon" && Array.isArray(geom.coordinates?.[0]?.[0])) {
            routeCoords = geom.coordinates[0][0] as [number, number][];
          } else if (geom.type === "LineString" && Array.isArray(geom.coordinates)) {
            routeCoords = geom.coordinates as [number, number][];
          }
        }

        // 4. GUARANTEE A VISIBLE TERRITORY SHAPE FOR EVERY RUN:
        // If geom is missing or collapsed (e.g. straight line run or short test run with 0 area):
        let polyArea = 0;
        if (geom) {
          try {
            polyArea = turf.area(geom);
          } catch {}
        }

        if (!geom || polyArea < 25) {
          if (routeCoords.length >= 2) {
            // Buffer open/straight route into a 25-meter wide glowing ribbon corridor!
            try {
              const line = turf.lineString(routeCoords);
              const corridor = turf.buffer(line, 0.025, { units: "kilometers" });
              if (corridor) {
                geom = corridor.geometry;
              }
            } catch (err) {
              console.warn("Could not buffer route corridor:", err);
            }
          } else {
            // Buffer single spot / stationary test run into a 35-meter radius circular captured zone!
            try {
              const pt = turf.point([pinLng, pinLat]);
              const zone = turf.buffer(pt, 0.035, { units: "kilometers" });
              if (zone) {
                geom = zone.geometry;
              }
            } catch (err) {
              console.warn("Could not buffer point zone:", err);
            }
          }
        }

        if (!geom) continue;

        const feature: Feature<Polygon | MultiPolygon> = {
          type: "Feature",
          properties: {
            id: territory.id,
            userId: territory.userId,
            userName: territory.userName,
            areaSquareMeters: territory.areaSquareMeters,
            distanceMeters: territory.distanceMeters,
            createdAt: territory.createdAt,
          },
          geometry: geom,
        };

        if (territory.userId === currentUserId) {
          myFeatures.push(feature);
        } else {
          otherFeatures.push(feature);
        }

        // Add running track / boundary line
        let lineCoords = routeCoords;
        if (lineCoords.length < 2 && geom) {
          if (geom.type === "Polygon" && Array.isArray(geom.coordinates?.[0])) {
            lineCoords = geom.coordinates[0];
          } else if (geom.type === "MultiPolygon" && Array.isArray(geom.coordinates?.[0]?.[0])) {
            lineCoords = geom.coordinates[0][0];
          }
        }

        if (lineCoords.length >= 2) {
          const lineFeature: Feature<LineString> = {
            type: "Feature",
            properties: {
              id: territory.id,
              userId: territory.userId,
              userName: territory.userName,
              areaSquareMeters: territory.areaSquareMeters,
              distanceMeters: territory.distanceMeters,
              createdAt: territory.createdAt,
            },
            geometry: {
              type: "LineString",
              coordinates: lineCoords,
            },
          };

          if (territory.userId === currentUserId) {
            myRouteFeatures.push(lineFeature);
          } else {
            otherRouteFeatures.push(lineFeature);
          }
        }

        const isSelf = territory.userId === currentUserId;
        const ownerName = territory.userName || (isSelf ? "You" : "Runner");
        const areaText = formatArea(territory.areaSquareMeters || 0);
        const distText = territory.distanceMeters ? formatDistance(territory.distanceMeters) : null;

        // Container element for START pin & Owner Name
        const markerEl = document.createElement("div");
        markerEl.className = "aim-territory-marker-container";
        markerEl.style.position = "relative";
        markerEl.style.display = "flex";
        markerEl.style.flexDirection = "column";
        markerEl.style.alignItems = "center";
        markerEl.style.cursor = "pointer";
        markerEl.style.userSelect = "none";
        markerEl.style.transition = "transform 0.15s ease";

        const displayName = isSelf ? (ownerName && ownerName !== "Streaker" ? ownerName : "YOU") : ownerName;

        markerEl.innerHTML = `
          <!-- START text with runner name exactly matching screenshot -->
          <div style="
            font-size: 11px;
            font-weight: 900;
            color: #a3ff12;
            text-shadow: -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 2px 4px rgba(0,0,0,0.95);
            letter-spacing: -0.01em;
            margin-bottom: 2px;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span>🏁 START</span>
            ${displayName ? `<span style="color: #ffffff; font-weight: 800; font-size: 10px; opacity: 0.95;">• ${displayName}</span>` : ""}
          </div>

          <!-- Pulsing Beacon Pin Dot matching screenshot -->
          <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: #a3ff12; opacity: 0.35; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #a3ff12; border: 2.5px solid #ffffff; box-shadow: 0 0 12px rgba(163,255,18,0.95);"></div>
          </div>
        `;

        markerEl.onmouseenter = () => {
          markerEl.style.transform = "scale(1.15)";
        };
        markerEl.onmouseleave = () => {
          markerEl.style.transform = "scale(1)";
        };

        markerEl.onclick = (e) => {
          e.stopPropagation();
          if (!mapRef.current) return;

          mapRef.current.flyTo({
            center: [pinLng, pinLat],
            zoom: 17,
            pitch: 20,
            essential: true,
            duration: 900,
          });

          new maplibregl.Popup({ offset: 15, className: isSelf ? "aim-map-popup self-popup" : "aim-map-popup" })
            .setLngLat([pinLng, pinLat])
            .setHTML(`
              <div style="font-family: inherit; padding: 2px 0;">
                <div style="font-weight: 900; font-size: 13px; color: #a3ff12; display: flex; align-items: center; gap: 6px; letter-spacing: -0.01em;">
                  <span>${isSelf ? "👑" : "👤"}</span>
                  <span>${isSelf ? "Your Territory (" + ownerName + ")" : ownerName + "'s Territory"}</span>
                </div>
                ${distText ? `<div style="font-size: 11px; margin-top: 6px; color: #e4e4e7; font-weight: 700; display: flex; align-items: center; gap: 4px;"><span>🏃</span><span>Run Route:</span><span style="color: #ffffff; font-weight: 800;">${distText}</span></div>` : ""}
                <div style="font-size: 11px; margin-top: 3px; color: #a1a1aa; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                  <span>🏴</span><span>Area Covered:</span><span style="color: #ffffff; font-weight: 800;">${areaText}</span>
                </div>
                ${territory.createdAt ? `<div style="font-size: 10px; color: #71717a; margin-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 4px;">Claimed: ${new Date(territory.createdAt).toLocaleDateString()}</div>` : ""}
              </div>
            `)
            .addTo(mapRef.current);
        };

        const marker = new maplibregl.Marker({ element: markerEl, anchor: "bottom" })
          .setLngLat([pinLng, pinLat])
          .addTo(mapRef.current);

        territoryMarkersRef.current.push(marker);
      } catch (err) {
        console.error("Failed to parse territory polygon:", err);
      }
    }

    // Reliably push GeoJSON data to map sources with auto-retry if map is mounting
    const updateSources = (attempt = 0) => {
      if (!mapRef.current) return;
      const mySource = mapRef.current.getSource("my-territories-source") as maplibregl.GeoJSONSource;
      const otherSource = mapRef.current.getSource("other-territories-source") as maplibregl.GeoJSONSource;
      const myRoutesSource = mapRef.current.getSource("my-routes-source") as maplibregl.GeoJSONSource;
      const otherRoutesSource = mapRef.current.getSource("other-routes-source") as maplibregl.GeoJSONSource;

      if (mySource && otherSource && myRoutesSource && otherRoutesSource) {
        mySource.setData({
          type: "FeatureCollection",
          features: myFeatures,
        } as FeatureCollection);

        otherSource.setData({
          type: "FeatureCollection",
          features: otherFeatures,
        } as FeatureCollection);

        myRoutesSource.setData({
          type: "FeatureCollection",
          features: myRouteFeatures,
        } as FeatureCollection);

        otherRoutesSource.setData({
          type: "FeatureCollection",
          features: otherRouteFeatures,
        } as FeatureCollection);
      } else if (attempt < 10) {
        setTimeout(() => updateSources(attempt + 1), 150);
      }
    };

    updateSources();
  }, [worldTerritories, currentUserId, isMapReady]);

  // Smoothly fly to territory when chosen in the World Feed at street level
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;
    if (focusCoordinates) {
      mapRef.current.flyTo({
        center: focusCoordinates,
        zoom: 17,
        pitch: 20,
        essential: true,
        duration: 1200,
      });
    } else if (focusBounds) {
      mapRef.current.fitBounds(
        [
          [focusBounds[0], focusBounds[1]],
          [focusBounds[2], focusBounds[3]],
        ],
        {
          padding: { top: 120, bottom: 200, left: 60, right: 60 },
          minZoom: 16,
          maxZoom: 18,
          duration: 1200,
        }
      );
    }
  }, [focusCoordinates, focusBounds, isMapReady]);

  // Auto-center map on latest territory when territories load, if not actively tracking a run
  useEffect(() => {
    if (!mapRef.current || !isMapReady || hasAutoCenteredRef.current) return;
    if (focusCoordinates || focusBounds) return;

    if (worldTerritories && worldTerritories.length > 0) {
      try {
        const latest = worldTerritories[0];
        const parsed = JSON.parse(latest.polygonGeoJSON);
        const geom = parsed.geometry ? parsed.geometry : parsed;
        const c = turf.centroid(geom);
        const [cLng, cLat] = c.geometry.coordinates;

        // If user is not currently in a live run, center on the territory
        if (liveRouteCoordinates.length === 0) {
          mapRef.current.easeTo({
            center: [cLng, cLat],
            zoom: 12.8,
            duration: 900,
          });
          hasAutoCenteredRef.current = true;
        }
      } catch (e) {
        // ignore
      }
    }
  }, [worldTerritories, isMapReady, focusCoordinates, focusBounds, liveRouteCoordinates.length]);

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

      {/* High-Visibility Projected SVG Territory Shapes & Live Route Overlay */}
      {(projectedTerritories.length > 0 || projectedRoutePoints.length >= 1) && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
          {/* Render All Captured & Manual Showcase Territory Polygons */}
          {projectedTerritories.map((t) => (
            <g key={t.id} className="territory-polygon-group">
              {t.rings.map((ring, rIdx) => {
                if (ring.length < 3) return null;
                const pts = ring.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(" ");
                return (
                  <React.Fragment key={rIdx}>
                    {/* Deep shadow / casing */}
                    <polygon
                      points={pts}
                      fill="none"
                      stroke="#000000"
                      strokeWidth="8"
                      strokeLinejoin="round"
                      strokeOpacity="0.8"
                    />
                    {/* Glowing neon fill & ambient border */}
                    <polygon
                      points={pts}
                      fill={t.id.startsWith("manual_") ? "rgba(163, 255, 18, 0.15)" : "rgba(163, 255, 18, 0.08)"}
                      stroke="#a3ff12"
                      strokeWidth="10"
                      strokeLinejoin="round"
                      strokeOpacity="0.35"
                      style={{ filter: "drop-shadow(0 0 12px rgba(163,255,18,0.7))" }}
                    />
                    {/* Crisp neon primary stroke */}
                    <polygon
                      points={pts}
                      fill="none"
                      stroke="#a3ff12"
                      strokeWidth="3.5"
                      strokeLinejoin="round"
                    />
                    {/* Corner vertices with high-contrast dots (only for polygon shapes, not high-density curves) */}
                    {ring.length <= 14 && ring.map((p, pIdx) => (
                      <circle
                        key={pIdx}
                        cx={Math.round(p.x)}
                        cy={Math.round(p.y)}
                        r="4"
                        fill="#a3ff12"
                        stroke="#000000"
                        strokeWidth="1.5"
                      />
                    ))}
                  </React.Fragment>
                );
              })}

              {/* Central Claim Badge for prominent showcase sectors */}
              {(t.id === "manual_showcase_sector_ahmedabad" || t.id === "manual_vastrapur_loop_ahmedabad") && t.center.x > 0 && (
                <g transform={`translate(${t.center.x}, ${t.center.y})`}>
                  <rect
                    x="-88"
                    y="-14"
                    width="176"
                    height="28"
                    rx="14"
                    fill="rgba(8, 10, 14, 0.94)"
                    stroke="#a3ff12"
                    strokeWidth="1.5"
                    style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.9))" }}
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#a3ff12"
                    fontSize="10"
                    fontWeight="900"
                    fontFamily="monospace"
                  >
                    {`👑 ${t.userName} • ${formatArea(t.area)}`}
                  </text>
                </g>
              )}
            </g>
          ))}

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

          {/* Current Runner Head Pin & Live Area Covered Badge on the Line */}
          {projectedRoutePoints.length >= 2 && (() => {
            const currentPt = projectedRoutePoints[projectedRoutePoints.length - 1];
            return (
              <g transform={`translate(${Math.round(currentPt.x)}, ${Math.round(currentPt.y)})`}>
                <circle r="12" fill="#a3ff12" fillOpacity="0.4" className="animate-ping" />
                <circle r="6" fill="#ffffff" stroke="#a3ff12" strokeWidth="3" />
                <g transform="translate(0, -22)">
                  <rect
                    x="-75"
                    y="-13"
                    width="150"
                    height="24"
                    rx="12"
                    fill="rgba(0, 0, 0, 0.9)"
                    stroke="#a3ff12"
                    strokeWidth="1.5"
                    style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.8))" }}
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#a3ff12"
                    fontSize="10"
                    fontWeight="900"
                  >
                    {`🏃 ${formatDistance(liveDistanceMeters)} • 🏴 ${formatArea(liveAreaMeters)}`}
                  </text>
                </g>
              </g>
            );
          })()}
        </svg>
      )}

      {/* Tactical Map Route & Area Legend */}
      <div className="absolute left-4 top-[72px] z-20 hidden sm:flex flex-col gap-1.5 p-2 rounded-xl bg-zinc-950/85 backdrop-blur-md border border-zinc-800 text-[10px] font-mono shadow-xl pointer-events-none select-none">
        <div className="text-[9px] uppercase tracking-wider font-bold text-zinc-400">
          Tactical Map Overlay
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1 rounded bg-[#a3ff12] shadow-[0_0_6px_#a3ff12]"></span>
          <span className="w-2.5 h-2.5 rounded-sm bg-[#a3ff12]/30 border border-[#a3ff12]"></span>
          <span className="text-zinc-200 font-medium">Captured World Territories</span>
        </div>
      </div>

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
