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

const STATION_CLIMATE_COLORS: Record<string, string> = {
  // 1. Extreme Min & Min Zone (#00E5FF & #0088FF — Cyan / Cobalt)
  'Astore': '#00E5FF',
  'Skardu': '#00E5FF',
  'Gupis': '#00E5FF',
  'Kalat': '#00E5FF',
  'Murree': '#00E5FF',
  'Gilgit': '#0088FF',
  'Chilas': '#0088FF',
  'Chitral': '#0088FF',
  'Darosh': '#0088FF',
  'Dir': '#0088FF',
  'Kakul': '#0088FF',
  'Parachinar': '#0088FF',
  'Muzaffarabad': '#0088FF',
  'Bunji': '#0088FF',

  // 2. Mild / Moderate Zone (#00C853 — Emerald Green)
  'Quetta': '#00C853',
  'Zhob': '#00C853',
  'Balakot': '#00C853',
  'Ghari Dupatta': '#00C853',
  'Saidu Sharif': '#00C853',
  'Cherat': '#00C853',
  'Islamabad': '#00C853',
  'Jhelum': '#00C853',
  'Barkhan': '#00C853',
  'Kotli': '#00C853',

  // 3. Warm / High Zone (#FFD600 & #FF6D00 — Gold / Orange)
  'Peshawar': '#FFD600',
  'Kohat': '#FFD600',
  'Risalpur': '#FFD600',
  'Sialkot': '#FFD600',
  'Pasni': '#FFD600',
  'Ormara': '#FFD600',
  'Jiwani': '#FFD600',
  'Lahore': '#FF6D00',
  'Faisalabad': '#FF6D00',
  'Sargodha': '#FF6D00',
  'Mianwali': '#FF6D00',
  'Karachi': '#FF6D00',

  // 4. Extreme Max Zone (#D50000 — Crimson Red)
  'Sibbi': '#D50000',
  'Jacobabad': '#D50000',
  'Nawabshah': '#D50000',
  'Rohri': '#D50000',
  'Mohin Jodaro': '#D50000',
  'Padidan': '#D50000',
  'Hyderabad': '#D50000',
  'Badin': '#D50000',
  'Chhor': '#D50000',
  'D.I Khan': '#D50000',
  'Multan': '#D50000',
  'Bahawalpur': '#D50000',
  'Bahawalnagar': '#D50000',
  'Khanpur': '#D50000',
  'Dalbandin': '#D50000',
  'Nokkundi': '#D50000',
  'Panjgur': '#D50000',
  'Khuzdar': '#D50000',
  'Lasbella': '#D50000'
};

const getClimateLabel = (color: string | undefined): string => {
  switch (color) {
    case '#D50000': return 'Extreme Max (>42°C)';
    case '#FF6D00': return 'High Temp (Plains)';
    case '#FFD600': return 'Warm Temp (Plains/Coast)';
    case '#00C853': return 'Mild / Moderate';
    case '#0088FF': return 'Min Low (Alpine)';
    case '#00E5FF': return 'Extreme Min (Sub-Zero)';
    default: return 'Mild / Moderate';
  }
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

    const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY || '6EJobKlrqbFsfxl8gZlh';

    // Set MapTiler API Key
    maptilersdk.config.apiKey = apiKey;

    // Initialize Map with Streets style
    const map = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle.STREETS, // Streets style
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

      const markerColor = STATION_CLIMATE_COLORS[name] || '#00C853';
      const marker = new maptilersdk.Marker({
        color: markerColor
      })
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map);

      const pinSvg = marker.getElement().querySelector('svg path');
      if (pinSvg) {
        if (name === selectedLocation) {
          pinSvg.setAttribute('stroke', '#1e293b'); // Dark Slate border for selected
          pinSvg.setAttribute('stroke-width', '3');
        } else {
          pinSvg.setAttribute('stroke', '#ffffff'); // White border for default
          pinSvg.setAttribute('stroke-width', '1.5');
        }
      }

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
        // 1. Fetch GeoJSON for Pakistan Administrative Regions locally
        const pakData = await fetch(
          "/pakistan-adm1.json"
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
              "Punjab", "#FF6D00",                      // Warm/High -> Blaze Orange
              "Islamabad Capital Territory", "#00C853", // Mild/Moderate -> Emerald Green
              "Sindh", "#D50000",                       // Extreme Max -> Crimson Red
              "Balochistan", "#D50000",                 // Extreme Max -> Crimson Red (Sibi/Dalbandin/etc.)
              "Khyber Pakhtunkhwa", "#0088FF",          // Min (Low) -> Cobalt Blue
              "Azad Kashmir", "#0088FF",                // Min (Low) -> Cobalt Blue
              "Gilgit-Baltistan", "#00E5FF",            // Extreme Min -> Electric Cyan
              "#00C853",                                // Fallback Mild/Moderate -> Emerald Green
            ],
            "fill-opacity": 0.6,               // 60% opacity for clear, distinct coloring
          },
        });

        // 5. Add Region Outline Borders
        map.addLayer({
          id: "regions-border",
          type: "line",
          source: "pakistan-regions",
          paint: {
            "line-color": "rgba(255, 255, 255, 0.7)", // Semi-transparent White border for premium visual separation
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
        const markerColor = STATION_CLIMATE_COLORS[name] || '#00C853';
        pinSvg.setAttribute('fill', markerColor); // Fill stays its climate color
        
        if (name === selectedLocation) {
          pinSvg.setAttribute('stroke', '#1e293b'); // Dark Slate border for selected
          pinSvg.setAttribute('stroke-width', '3');
        } else {
          pinSvg.setAttribute('stroke', '#ffffff'); // White border for default
          pinSvg.setAttribute('stroke-width', '1.5');
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
      
      {/* Selected Location Card */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        backgroundColor: '#1E293B',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '8px 12px',
        color: '#f8fafc',
        fontFamily: 'sans-serif',
        fontSize: '11px',
        zIndex: 10,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{ color: '#94a3b8', fontSize: '9px', textTransform: 'uppercase', fontWeight: 600 }}>Active Scope</div>
        <div style={{ fontWeight: 'bold', fontSize: '13px', marginTop: '2px' }}>
          {selectedLocation === 'National' ? 'National Average' : selectedLocation}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          <span style={{ 
            display: 'inline-block', 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: selectedLocation === 'National' ? '#FFD600' : (STATION_CLIMATE_COLORS[selectedLocation] || '#00C853') 
          }}></span>
          <span style={{ fontSize: '10px', color: '#cbd5e1' }}>
            {selectedLocation === 'National' 
              ? 'Warm Zone (Country Average)' 
              : getClimateLabel(STATION_CLIMATE_COLORS[selectedLocation])}
          </span>
        </div>
      </div>

      {/* Map Legend Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '10px 12px',
        color: '#f8fafc',
        fontFamily: 'sans-serif',
        fontSize: '10px',
        zIndex: 10,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'none',
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '4px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Climate Zones
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#D50000', border: '1px solid #fff' }}></span>
            <span>Extreme Max (&gt;42°C+)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#FF6D00', border: '1px solid #fff' }}></span>
            <span>High Temp (Plains)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#FFD600', border: '1px solid #fff' }}></span>
            <span>Warm Temp (Plains/Coast)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#00C853', border: '1px solid #fff' }}></span>
            <span>Mild / Moderate</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0088FF', border: '1px solid #fff' }}></span>
            <span>Min (Low / alpine)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#00E5FF', border: '1px solid #fff' }}></span>
            <span>Extreme Min (Sub-Zero)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
