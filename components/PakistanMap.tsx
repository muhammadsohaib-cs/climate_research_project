"use client";

import React, { useEffect, useRef } from 'react';
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";

// 55 Pakistan Meteorological Weather Stations Coordinates swapped to [Longitude, Latitude]
const STATION_COORDS: Record<string, [number, number]> = {
  'Astore': [74.90, 35.36],
  'Badin': [68.83, 24.63],
  'Bahawalnagar': [73.25, 29.99],
  'Bahawalpur': [71.68, 29.39],
  'Balakot': [73.35, 34.54],
  'Barkhan': [69.52, 29.89],
  'Bunji': [74.63, 35.66],
  'Cherat': [71.88, 33.81],
  'Chhor': [69.78, 25.51],
  'Chilas': [74.10, 35.42],
  'Chitral': [71.78, 35.85],
  'D.I Khan': [70.90, 31.83],
  'Dalbandin': [64.40, 28.89],
  'Darosh': [71.80, 35.56],
  'Dir': [71.87, 35.20],
  'Faisalabad': [73.13, 31.45],
  'Ghari Dupatta': [73.61, 34.21],
  'Gilgit': [74.31, 35.92],
  'Gupis': [73.44, 36.23],
  'Hyderabad': [68.37, 25.39],
  'Islamabad': [73.06, 33.72],
  'Jaccobabad': [68.44, 28.28],
  'Jhelum': [73.72, 32.94],
  'Jiwani': [61.74, 25.05],
  'Kakul': [73.25, 34.18],
  'Kalat': [66.58, 29.03],
  'Karachi': [67.01, 24.86],
  'Khanpur': [70.66, 28.65],
  'Khuzdar': [66.61, 27.80],
  'Kohat': [71.44, 33.58],
  'Kotli': [73.90, 33.51],
  'Lahore': [74.35, 31.52],
  'Lasbella': [66.31, 26.22],
  'Mianwali': [71.53, 32.58],
  'Mohin Jodaro': [68.13, 27.33],
  'Multan': [71.52, 30.15],
  'Murree': [73.39, 33.90],
  'Muzaffarabad': [73.47, 34.37],
  'Nawabshah': [68.41, 26.24],
  'Nokkundi': [61.20, 28.82],
  'Ormara': [64.63, 25.20],
  'Padidan': [68.13, 26.86],
  'Panjgur': [64.10, 26.96],
  'Parachinar': [70.10, 33.90],
  'Passni': [63.48, 25.26],
  'Peshawar': [71.52, 34.01],
  'Quetta': [66.99, 30.18],
  'Risalpur': [71.98, 34.07],
  'Rohri': [68.89, 27.69],
  'Saidu Sharif': [72.35, 34.75],
  'Sargodha': [72.67, 32.08],
  'Sialkot': [74.52, 32.49],
  'Sibbi': [67.88, 29.55],
  'Skardu': [75.63, 35.30],
  'Zhob': [69.45, 31.34]
};

interface PakistanMapProps {
  selectedLocation: string;
  setSelectedLocation: (location: string) => void;
}

export default function PakistanMap({ selectedLocation, setSelectedLocation }: PakistanMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const markersRef = useRef<Record<string, maptilersdk.Marker>>({});
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
    if (!apiKey) {
      console.error("MapTiler API Key is missing in .env.local!");
      return;
    }

    // Set MapTiler API Key
    maptilersdk.config.apiKey = apiKey;

    // Initialize Map with Outdoor Light style
    const map = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle.OUTDOOR, // Outdoor/Topo Light style
      center: [69.3451, 30.3753], // Centered on Pakistan
      zoom: 5,
      minZoom: 4.5,
      // Lock camera navigation to Pakistan's bounding box
      maxBounds: [
        [58.0, 22.0], // Southwest boundary
        [80.0, 38.0], // Northeast boundary
      ],
    });

    mapRef.current = map;

    // Plot all 55 weather stations as markers
    Object.entries(STATION_COORDS).forEach(([name, coords]) => {
      const popup = new maptilersdk.Popup({ offset: 25 }).setHTML(
        `<div style="color: #0f172a; padding: 4px; font-family: sans-serif;">
          <h4 style="margin: 0; font-weight: 700; font-size: 13px;">${name}</h4>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #475569;">Weather Station</p>
         </div>`
      );

      const marker = new maptilersdk.Marker({
        color: name === selectedLocation ? '#f97316' : '#3b82f6'
      })
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map);

      // Listen for click event to update the selected station in dashboard
      marker.getElement().addEventListener('click', (e) => {
        // Prevent map click handler from triggering other popups
        e.stopPropagation();
        setSelectedLocation(name);
      });

      markersRef.current[name] = marker;
    });

    map.on("load", async () => {
      try {
        // 1. Fetch GeoJSON for Pakistan Administrative Regions
        const pakData = await fetch(
          "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/releaseData/gbOpen/PAK/ADM1/geoBoundaries-PAK-ADM1_simplified.geojson"
        ).then((res) => res.json());

        // Ensure map is still mounted
        if (!mapRef.current) return;

        // 2. Build Inverted Mask (World Box with Pakistan Polygon Cut Out)
        const pakHoles = pakData.features.map(
          (feature: any) => feature.geometry.coordinates[0]
        );

        const maskGeoJSON = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: [
                  // Global bounding box
                  [
                    [-180, -90],
                    [180, -90],
                    [180, 90],
                    [-180, 90],
                    [-180, -90],
                  ],
                  ...pakHoles, // Subtracts Pakistan's shape
                ],
              },
            },
          ],
        };

        // 3. Add World Mask Layer (Hides Outside Countries with Light Slate)
        map.addSource("world-mask", {
          type: "geojson",
          data: maskGeoJSON as any,
        });

        map.addLayer({
          id: "world-mask-layer",
          type: "fill",
          source: "world-mask",
          paint: {
            "fill-color": "#E2E8F0", // Soft light slate gray matching the light map
            "fill-opacity": 0.95,
          },
        });

        // 4. Add Pakistan Region Polygons (Harmonized Color Palette)
        map.addSource("pakistan-regions", {
          type: "geojson",
          data: pakData,
        });

        map.addLayer({
          id: "regions-fill",
          type: "fill",
          source: "pakistan-regions",
          paint: {
            "fill-color": [
              "match",
              ["get", "shapeName"],
              "Punjab", "#0284C7",             // Sky Blue
              "Sindh", "#16A34A",              // Forest/Emerald Green
              "Khyber Pakhtunkhwa", "#D97706", // Warm Gold/Amber
              "Balochistan", "#DC2626",        // Terracotta Red
              "Gilgit-Baltistan", "#7C3AED",  // Muted Violet
              "Azad Kashmir", "#DB2777",       // Soft Rose
              "#2563EB",                       // Fallback Blue
            ],
            "fill-opacity": 0.35,              // 35% opacity so roads/terrain stay visible
          },
        });

        // 5. Add Region Outline Borders
        map.addLayer({
          id: "regions-border",
          type: "line",
          source: "pakistan-regions",
          paint: {
            "line-color": "#334155", // Charcoal Slate border for soft contrast
            "line-width": 1.5,
          },
        });

        // 6. Mouse Interactions & Popups
        map.on("mousemove", "regions-fill", () => {
          map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", "regions-fill", () => {
          map.getCanvas().style.cursor = "";
        });

        map.on("click", "regions-fill", (e) => {
          if (!e.features || !e.features[0]) return;
          const name = e.features[0].properties?.shapeName || "Region";

          new maptilersdk.Popup()
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="
                color: #0F172A; 
                font-family: sans-serif; 
                font-weight: 600; 
                font-size: 14px; 
                padding: 4px 6px;
              ">${name}</div>`
            )
            .addTo(map);
        });
      } catch (err) {
        console.error("Error loading regional map boundaries GeoJSON:", err);
      }
    });

    return () => {
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync selected location
  useEffect(() => {
    if (!mapRef.current) return;

    const shouldFly = !isInitialMount.current;
    isInitialMount.current = false;

    // Update marker colors based on selection
    Object.entries(markersRef.current).forEach(([name, marker]) => {
      const element = marker.getElement();
      const pinSvg = element.querySelector('svg path');
      if (pinSvg) {
        if (name === selectedLocation) {
          pinSvg.setAttribute('fill', '#f97316'); // Orange for selected
        } else {
          pinSvg.setAttribute('fill', '#3b82f6'); // Blue for default
        }
      }
    });

    if (selectedLocation === 'National') {
      if (shouldFly) {
        mapRef.current.flyTo({
          center: [69.3451, 30.3753],
          zoom: 5,
          essential: true
        });
      }
      
      // Close all popups
      Object.values(markersRef.current).forEach(marker => {
        const popup = marker.getPopup();
        if (popup && popup.isOpen()) {
          marker.togglePopup();
        }
      });
    } else {
      const coords = STATION_COORDS[selectedLocation];
      if (coords) {
        if (shouldFly) {
          mapRef.current.flyTo({
            center: coords,
            zoom: 8.5,
            essential: true
          });
        }

        // Open popup for selected station
        const marker = markersRef.current[selectedLocation];
        if (marker) {
          const popup = marker.getPopup();
          if (popup && !popup.isOpen()) {
            // Close other open popups first
            Object.entries(markersRef.current).forEach(([name, m]) => {
              if (name !== selectedLocation) {
                const p = m.getPopup();
                if (p && p.isOpen()) m.togglePopup();
              }
            });
            marker.togglePopup();
          }
        }
      }
    }
  }, [selectedLocation]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={mapContainer} id="map" style={{ width: "100%", height: "100%", borderRadius: "8px" }} />
    </div>
  );
}
