"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { Maximize2, Compass, Sparkles, Eye, MapPin, X, ChevronDown, ChevronUp, Layers } from 'lucide-react';

const REMOVED_STATIONS = new Set<string>([
  'Chitral', 'Mohin Jodaro', 'Badin', 'Ormara', 'Lasbella',
  'Risalpur', 'Lahore', 'Kohat', 'Multan', 'Peshawar',
  'Khuzdar', 'Saidu Sharif', 'Barkhan', 'Jiwani', 'Kalat',
  'Rohri', 'Dir', 'Cherat', 'Passni', 'Pasni', 'Astore', 'Sibbi'
]);

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

// High-Contrast Climate Classification & Microclimate Colors
const STATION_CLIMATE_COLORS: Record<string, string> = {
  // 1. COLD DROUGHT / COLD ALPINE ZONE (#c026d3 — Electric Magenta)
  'Astore': '#c026d3',
  'Skardu': '#c026d3',
  'Gupis': '#c026d3',
  'Kalat': '#c026d3',
  'Murree': '#c026d3',

  // 2. WET LAND / HIGH PRECIPITATION (#0284c7 — Deep Cyan Blue)
  'Gilgit': '#0284c7',
  'Chilas': '#0284c7',
  'Chitral': '#0284c7',
  'Darosh': '#0284c7',
  'Dir': '#0284c7',
  'Kakul': '#0284c7',
  'Parachinar': '#0284c7',
  'Muzaffarabad': '#0284c7',
  'Bunji': '#0284c7',

  // 3. HUMID ZONE (#10b981 — Vibrant Emerald Green)
  'Quetta': '#10b981',
  'Zhob': '#10b981',
  'Balakot': '#10b981',
  'Ghari Dupatta': '#10b981',
  'Saidu Sharif': '#10b981',
  'Cherat': '#10b981',
  'Islamabad': '#10b981',
  'Jhelum': '#10b981',
  'Barkhan': '#10b981',
  'Kotli': '#10b981',

  // 4. ARID / SEMI-ARID ZONE (#eab308 — Golden Yellow)
  'Peshawar': '#eab308',
  'Kohat': '#eab308',
  'Risalpur': '#eab308',
  'Sialkot': '#eab308',
  'Pasni': '#eab308',
  'Ormara': '#eab308',
  'Jiwani': '#eab308',
  'Lahore': '#eab308',
  'Faisalabad': '#eab308',
  'Sargodha': '#eab308',
  'Mianwali': '#eab308',
  'Karachi': '#eab308',

  // 5. DROUGHT / EXTREME HEAT ZONE (#dc2626 — Deep Crimson Red)
  'Sibbi': '#dc2626',
  'Jacobabad': '#dc2626',
  'Nawabshah': '#dc2626',
  'Rohri': '#dc2626',
  'Mohin Jodaro': '#dc2626',
  'Padidan': '#dc2626',
  'Hyderabad': '#dc2626',
  'Badin': '#dc2626',
  'Chhor': '#dc2626',
  'D.I Khan': '#dc2626',
  'Multan': '#dc2626',
  'Bahawalpur': '#dc2626',
  'Bahawalnagar': '#dc2626',
  'Khanpur': '#dc2626',
  'Dalbandin': '#dc2626',
  'Nokkundi': '#dc2626',
  'Panjgur': '#dc2626',
  'Khuzdar': '#dc2626',
  'Lasbella': '#dc2626'
};

// Microclimate Scientific Explanations
const CITY_MICROCLIMATE_EXPLANATION: Record<string, { label: string; range: string; note: string }> = {
  'Islamabad': {
    label: 'Humid Sub-Tropical Oasis',
    range: '24°C – 34°C (1,200mm Rain)',
    note: 'Humid Green 🟩 microclimate inside the Arid Yellow 🟨 Punjab plain due to Margalla foothill rainfall & dense forest.'
  },
  'Murree': {
    label: 'Alpine Cold Hill Station',
    range: '12°C – 22°C (Sub-Zero Snow)',
    note: 'Cold Alpine Magenta 🟪 microclimate isolated high above the warm Punjab agricultural plains.'
  },
  'Quetta': {
    label: 'High Mountain Valley Oasis',
    range: '15°C – 31°C (1,680m Elevation)',
    note: 'Humid Green 🟩 valley climate isolated inside the surrounding dry desert plateau of Balochistan.'
  },
  'Kalat': {
    label: 'High-Elevation Cold Plateau',
    range: '10°C – 26°C (2,000m Elevation)',
    note: 'Cold Magenta 🟪 plateau climate standing out distinctly against hot Balochistan deserts.'
  },
  'Jhelum': {
    label: 'Sub-Himalayan Humid Belt',
    range: '25°C – 36°C (850mm Rain)',
    note: 'Humid Green 🟩 microclimate transition at the northern edge of Punjab plains.'
  },
  'Jacobabad': {
    label: 'Global Heat Epicenter',
    range: '38°C – 52°C Peak',
    note: 'Deep Crimson Red 🟥 extreme heat zone recording Asia’s highest summer surface heat index.'
  },
  'Skardu': {
    label: 'Karakoram Glacial Valley',
    range: '5°C – 20°C (Frozen Winters)',
    note: 'Cold Alpine Magenta 🟪 glacial valley surrounded by 7,000m snow peaks.'
  },
  'Muzaffarabad': {
    label: 'Montane Wetland Corridor',
    range: '18°C – 28°C (1,400mm Rain)',
    note: 'Wet Land Blue 🟦 climate corridor benefiting from heavy monsoon moisture.'
  }
};

// Province Metadata
const PROVINCE_CLIMATE_META: Record<string, {
  tempRange: string;
  avgMax: string;
  zoneName: string;
  color: string;
  description: string;
}> = {
  'Sindh': {
    tempRange: '38°C – 48°C',
    avgMax: '43.2°C',
    zoneName: 'Drought & Extreme Heat Belt',
    color: '#dc2626',
    description: 'Lower Indus basin characterized by severe summer thermal stress and low annual precipitation.'
  },
  'Balochistan': {
    tempRange: '32°C – 46°C',
    avgMax: '40.5°C',
    zoneName: 'Arid Desert Plateau',
    color: '#b91c1c',
    description: 'Vast rocky plateau & desert terrain with extreme daily temperature swings and dry desert winds.'
  },
  'Punjab': {
    tempRange: '30°C – 41°C',
    avgMax: '36.8°C',
    zoneName: 'Arid / Semi-Arid Agricultural Plains',
    color: '#eab308',
    description: 'Alluvial plains receiving warm summer sun and seasonal monsoons. Contains Humid (Islamabad) & Cold (Murree) microclimates.'
  },
  'Khyber Pakhtunkhwa': {
    tempRange: '24°C – 35°C',
    avgMax: '31.2°C',
    zoneName: 'Humid & Sub-Himalayan Foothills',
    color: '#10b981',
    description: 'Montane terrain benefiting from high monsoon precipitation and river basin corridors.'
  },
  'Azad Kashmir': {
    tempRange: '18°C – 28°C',
    avgMax: '24.5°C',
    zoneName: 'Wet Land / Sub-Alpine Corridor',
    color: '#0284c7',
    description: 'High precipitation montane valleys with rich temperate forests and abundant rivers.'
  },
  'Gilgit-Baltistan': {
    tempRange: '10°C – 22°C',
    avgMax: '17.8°C',
    zoneName: 'Cold Alpine & Glacial Zone',
    color: '#c026d3',
    description: 'High Karakoram range with massive glaciers, sub-zero winters, and alpine cold drought.'
  },
  'Islamabad Capital Territory': {
    tempRange: '26°C – 36°C',
    avgMax: '32.1°C',
    zoneName: 'Humid Sub-Tropical Foothill Island',
    color: '#10b981',
    description: 'Margalla hills foothill zone enjoying 1,200mm annual precipitation, creating a green Humid Oasis.'
  }
};

const getClimateLabel = (color: string | undefined): string => {
  switch (color) {
    case '#dc2626': return 'Drought / Extreme Heat (>42°C)';
    case '#eab308': return 'Arid / Semi-Arid (Plains)';
    case '#10b981': return 'Humid Zone (Foothills)';
    case '#0284c7': return 'Wet Land / High Precip';
    case '#c026d3': return 'Cold Drought / Alpine';
    default: return 'Humid Zone';
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

  // Layout UI states
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [showMicroclimateHalos, setShowMicroclimateHalos] = useState<boolean>(true);
  const [showCityLabels, setShowCityLabels] = useState<boolean>(true);
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(true);
  const [dismissCard, setDismissCard] = useState<boolean>(false);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY || '6EJobKlrqbFsfxl8gZlh';
    maptilersdk.config.apiKey = apiKey;

    // Use CartoDB Dark Matter vector style as primary/fallback for 100% guaranteed loading
    const defaultStyle = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

    let map: maptilersdk.Map;
    try {
      map = new maptilersdk.Map({
        container: mapContainer.current,
        style: defaultStyle,
        center: [69.3451, 30.3753],
        zoom: 4.8,
        minZoom: 2.0,
        maxBounds: [
          [35.0, 5.0],
          [100.0, 50.0],
        ],
      });
    } catch (e) {
      console.warn("MapTiler init fallback:", e);
      map = new maptilersdk.Map({
        container: mapContainer.current,
        style: defaultStyle,
        center: [69.3451, 30.3753],
        zoom: 4.8,
        minZoom: 2.0,
      });
    }

    map.addControl(new maptilersdk.NavigationControl({ visualizePitch: true }), 'top-right');
    mapRef.current = map;

    // Suppress minor style warnings while maintaining resilience
    map.on("error", (e) => {
      console.warn("Map status event:", e);
    });

    const initMapLayersAndMarkers = async () => {
      if (!mapRef.current) return;

      // Force canvas resize for dynamic container
      mapRef.current.resize();
      setTimeout(() => {
        if (mapRef.current) mapRef.current.resize();
      }, 250);

      // Add Markers for Weather Stations
      Object.entries(STATION_COORDS)
        .filter(([name]) => !REMOVED_STATIONS.has(name))
        .forEach(([name, coords]) => {
          if (markersRef.current[name]) return; // avoid duplicate

          const color = STATION_CLIMATE_COLORS[name] || '#10b981';
          const microInfo = CITY_MICROCLIMATE_EXPLANATION[name];

          const popupHtml = `
            <div style="color: #0f172a; padding: 8px; font-family: system-ui, sans-serif; max-width: 220px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <h4 style="margin: 0; font-weight: 800; font-size: 14px; color: #0f172a;">${name}</h4>
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${color}; border: 1px solid #fff;"></span>
              </div>
              <div style="font-size: 11px; font-weight: 700; color: ${color}; margin-bottom: 4px;">
                ${getClimateLabel(color)}
              </div>
              ${microInfo ? `
                <div style="background-color: #f1f5f9; border-left: 3px solid ${color}; padding: 4px 6px; border-radius: 4px; margin-top: 6px; font-size: 10px; color: #334155; line-height: 1.3;">
                  <strong>Microclimate:</strong> ${microInfo.note}
                </div>
              ` : ''}
            </div>
          `;

          const popup = new maptilersdk.Popup({ offset: 25, closeButton: false }).setHTML(popupHtml);

          const marker = new maptilersdk.Marker({ color })
            .setLngLat(coords)
            .setPopup(popup)
            .addTo(mapRef.current!);

          const pinSvg = marker.getElement().querySelector('svg path');
          if (pinSvg) {
            if (name === selectedLocation) {
              pinSvg.setAttribute('stroke', '#ffffff');
              pinSvg.setAttribute('stroke-width', '3.5');
            } else {
              pinSvg.setAttribute('stroke', '#090d16');
              pinSvg.setAttribute('stroke-width', '1.5');
            }
          }

          marker.getElement().addEventListener('click', (e) => {
            e.stopPropagation();
            setDismissCard(false);
            setSelectedLocation(name);
          });

          markersRef.current[name] = marker;
        });

      // Load Pakistan GeoJSON Boundaries
      try {
        const pakData = await fetch("/pakistan-adm1.json").then((res) => res.json());
        if (!mapRef.current) return;

        // Build World Mask Safely for Polygon and MultiPolygon Geometries
        const pakHoles: any[] = [];
        if (pakData && Array.isArray(pakData.features)) {
          pakData.features.forEach((feature: any) => {
            if (!feature || !feature.geometry || !feature.geometry.coordinates) return;
            if (feature.geometry.type === "Polygon" && feature.geometry.coordinates[0]) {
              pakHoles.push(feature.geometry.coordinates[0]);
            } else if (feature.geometry.type === "MultiPolygon") {
              feature.geometry.coordinates.forEach((poly: any) => {
                if (poly && poly[0]) {
                  pakHoles.push(poly[0]);
                }
              });
            }
          });
        }

        const maskGeoJSON = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [-180, -90],
                    [180, -90],
                    [180, 90],
                    [-180, 90],
                    [-180, -90],
                  ],
                  ...pakHoles,
                ],
              },
            },
          ],
        };

        if (!mapRef.current.getSource("world-mask")) {
          mapRef.current.addSource("world-mask", {
            type: "geojson",
            data: maskGeoJSON as any,
          });

          mapRef.current.addLayer({
            id: "world-mask-layer",
            type: "fill",
            source: "world-mask",
            paint: {
              "fill-color": "#090d16",
              "fill-opacity": 0.85,
            },
          });
        }

        // Add Regional Polygon Layer
        if (!mapRef.current.getSource("pakistan-regions")) {
          mapRef.current.addSource("pakistan-regions", {
            type: "geojson",
            data: pakData,
          });

          mapRef.current.addLayer({
            id: "regions-fill",
            type: "fill",
            source: "pakistan-regions",
            paint: {
              "fill-color": [
                "match",
                ["get", "shapeName"],
                "Gilgit-Baltistan", "#c026d3",           // Cold Alpine -> Magenta
                "Azad Kashmir", "#0284c7",               // Wet Land -> Blue
                "Khyber Pakhtunkhwa", "#10b981",         // Humid -> Emerald Green
                "Islamabad Capital Territory", "#10b981",// Humid -> Emerald Green
                "Punjab", "#eab308",                     // Warm / Arid -> Golden Yellow
                "Sindh", "#dc2626",                      // Extreme Heat -> Crimson Red
                "Balochistan", "#b91c1c",                // Extreme Heat -> Dark Crimson Red
                "#10b981",
              ],
              "fill-opacity": 0.58,
            },
          });

          mapRef.current.addLayer({
            id: "regions-border",
            type: "line",
            source: "pakistan-regions",
            paint: {
              "line-color": "rgba(255, 255, 255, 0.85)",
              "line-width": 1.6,
            },
          });
        }

        // Add Station Microclimate Glow Aura & Label Layers
        const stationPointFeatures = Object.entries(STATION_COORDS)
          .filter(([name]) => !REMOVED_STATIONS.has(name))
          .map(([name, coords]) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: coords },
            properties: {
              name,
              color: STATION_CLIMATE_COLORS[name] || '#10b981',
              isMicroclimate: !!CITY_MICROCLIMATE_EXPLANATION[name],
            }
          }));

        if (!mapRef.current.getSource("station-glow-source")) {
          mapRef.current.addSource("station-glow-source", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: stationPointFeatures
            } as any
          });

          mapRef.current.addLayer({
            id: "station-glow-layer",
            type: "circle",
            source: "station-glow-source",
            paint: {
              "circle-color": ["get", "color"],
              "circle-radius": [
                "case",
                ["get", "isMicroclimate"], 14, 9
              ],
              "circle-opacity": 0.65,
              "circle-blur": 0.4,
              "circle-stroke-width": [
                "case",
                ["get", "isMicroclimate"], 2.5, 1.0
              ],
              "circle-stroke-color": "#ffffff"
            }
          });

          mapRef.current.addLayer({
            id: "station-city-labels-layer",
            type: "symbol",
            source: "station-glow-source",
            layout: {
              "text-field": ["get", "name"],
              "text-size": [
                "interpolate", ["linear"], ["zoom"],
                4.5, 9.5,
                7, 12,
                10, 14
              ],
              "text-offset": [0, 1.15],
              "text-anchor": "top",
              "text-allow-overlap": false,
              "text-ignore-placement": false
            },
            paint: {
              "text-color": "#ffffff",
              "text-halo-color": "#000000",
              "text-halo-width": 2.5,
              "text-halo-blur": 0.5
            }
          });
        }

        // Mouse Hover & Click Events
        mapRef.current.on("mousemove", "regions-fill", (e) => {
          if (mapRef.current) mapRef.current.getCanvas().style.cursor = "pointer";
          if (e.features && e.features[0]) {
            const name = e.features[0].properties?.shapeName;
            if (name) setActiveRegion(name);
          }
        });

        mapRef.current.on("mouseleave", "regions-fill", () => {
          if (mapRef.current) mapRef.current.getCanvas().style.cursor = "";
        });

        mapRef.current.on("click", "regions-fill", (e) => {
          if (!e.features || !e.features[0]) return;
          const name = e.features[0].properties?.shapeName;
          if (name) {
            setDismissCard(false);
            setActiveRegion(name);
          }
        });

      } catch (err) {
        console.error("Error loading regional map GeoJSON:", err);
      }
    };

    if (map.loaded()) {
      initMapLayersAndMarkers();
    } else {
      map.on("load", initMapLayersAndMarkers);
    }

    return () => {
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync selected location & visibility properties
  useEffect(() => {
    if (!mapRef.current) return;

    const shouldFly = !isInitialMount.current;
    isInitialMount.current = false;

    // Toggle Station Glow Layer Visibility
    if (mapRef.current.getLayer("station-glow-layer")) {
      mapRef.current.setLayoutProperty(
        "station-glow-layer",
        "visibility",
        showMicroclimateHalos ? "visible" : "none"
      );
    }

    // Toggle City Labels Visibility
    if (mapRef.current.getLayer("station-city-labels-layer")) {
      mapRef.current.setLayoutProperty(
        "station-city-labels-layer",
        "visibility",
        showCityLabels ? "visible" : "none"
      );
    }

    // Update marker strokes
    Object.entries(markersRef.current).forEach(([name, marker]) => {
      const element = marker.getElement();
      const pinSvg = element.querySelector('svg path');
      if (pinSvg) {
        const markerColor = STATION_CLIMATE_COLORS[name] || '#10b981';
        pinSvg.setAttribute('fill', markerColor);
        
        if (name === selectedLocation) {
          pinSvg.setAttribute('stroke', '#ffffff');
          pinSvg.setAttribute('stroke-width', '3.5');
        } else {
          pinSvg.setAttribute('stroke', '#090d16');
          pinSvg.setAttribute('stroke-width', '1.5');
        }
      }
    });

    if (selectedLocation === 'National') {
      if (shouldFly) {
        mapRef.current.flyTo({
          center: [69.3451, 30.3753],
          zoom: 4.8,
          essential: true
        });
      }
      
      Object.values(markersRef.current).forEach(marker => {
        const popup = marker.getPopup();
        if (popup && popup.isOpen()) marker.togglePopup();
      });
    } else {
      const coords = STATION_COORDS[selectedLocation];
      if (coords) {
        if (shouldFly) {
          mapRef.current.flyTo({
            center: coords,
            zoom: 8.2,
            essential: true
          });
        }

        const marker = markersRef.current[selectedLocation];
        if (marker) {
          const popup = marker.getPopup();
          if (popup && !popup.isOpen()) {
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
  }, [selectedLocation, showMicroclimateHalos, showCityLabels]);

  // Reset Zoom Handler
  const handleResetZoom = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [69.3451, 30.3753],
      zoom: 4.8,
      essential: true
    });
    setSelectedLocation('National');
    setActiveRegion(null);
    setDismissCard(false);
  };

  const selectedMicroInfo = CITY_MICROCLIMATE_EXPLANATION[selectedLocation];
  const activeRegionMeta = activeRegion ? PROVINCE_CLIMATE_META[activeRegion] : null;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      {/* Map Container Ref Canvas Element */}
      <div ref={mapContainer} style={{ width: "100%", height: "100%", position: "absolute", inset: 0, borderRadius: "1.5rem" }} />

      {/* Top Left Slim Glassmorphism Toolbar (Non-Overlapping Single Line Bar) */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        zIndex: 10,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '8px',
        padding: '5px 8px',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.6)',
        flexWrap: 'wrap',
        maxWidth: 'calc(100% - 60px)',
      }}>
        {/* Scope Indicator Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', borderRight: '1px solid rgba(255,255,255,0.15)', paddingRight: '8px' }}>
          <MapPin size={12} className="text-emerald-400 shrink-0" />
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }} className="truncate max-w-[110px] sm:max-w-none">
            {selectedLocation === 'National' ? 'National' : selectedLocation}
          </span>
          <span style={{ 
            width: '7px', 
            height: '7px', 
            borderRadius: '50%', 
            backgroundColor: selectedLocation === 'National' ? '#eab308' : (STATION_CLIMATE_COLORS[selectedLocation] || '#10b981'),
            boxShadow: '0 0 6px rgba(255,255,255,0.6)'
          }}></span>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={handleResetZoom}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '5px',
              padding: '3px 7px',
              color: '#38bdf8',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Zoom out fully to view full Pakistan map"
          >
            <Maximize2 size={10} />
            <span className="hidden xs:inline">Fit Country</span>
          </button>

          <button
            onClick={() => setShowMicroclimateHalos(!showMicroclimateHalos)}
            style={{
              backgroundColor: showMicroclimateHalos ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              border: showMicroclimateHalos ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '5px',
              padding: '3px 7px',
              color: showMicroclimateHalos ? '#34d399' : '#94a3b8',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Toggle city microclimate glowing halos"
          >
            <Eye size={10} />
            <span className="hidden xs:inline">{showMicroclimateHalos ? 'Glow ON' : 'Glow OFF'}</span>
          </button>

          <button
            onClick={() => setShowCityLabels(!showCityLabels)}
            style={{
              backgroundColor: showCityLabels ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              border: showCityLabels ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '5px',
              padding: '3px 7px',
              color: showCityLabels ? '#38bdf8' : '#94a3b8',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Toggle bold city names on map"
          >
            <Sparkles size={10} />
            <span className="hidden xs:inline">{showCityLabels ? 'Labels ON' : 'Labels OFF'}</span>
          </button>
        </div>
      </div>

      {/* Bottom-Left Floating Explainer Card */}
      {!dismissCard && (selectedMicroInfo || activeRegionMeta) && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          zIndex: 10,
          maxWidth: 'calc(100% - 20px)',
          width: '290px',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          border: `1px solid ${selectedMicroInfo ? (STATION_CLIMATE_COLORS[selectedLocation] || '#10b981') : (activeRegionMeta?.color || '#38bdf8')}`,
          borderRadius: '8px',
          padding: '8px 10px',
          color: '#f8fafc',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
        }}>
          {/* Dismiss Close Button */}
          <button
            onClick={() => setDismissCard(true)}
            style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '2px',
            }}
            title="Dismiss Explainer Card"
          >
            <X size={14} />
          </button>

          {selectedMicroInfo ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: STATION_CLIMATE_COLORS[selectedLocation] }}>
                <Sparkles size={12} />
                <strong style={{ fontSize: '11.5px' }}>{selectedLocation}: {selectedMicroInfo.label}</strong>
              </div>
              <div style={{ fontSize: '9.5px', color: '#cbd5e1', marginTop: '2px', fontWeight: 600 }}>
                Temp & Precip: {selectedMicroInfo.range}
              </div>
              <div style={{ marginTop: '5px', fontSize: '10px', color: '#e2e8f0', lineHeight: 1.3, backgroundColor: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '4px' }}>
                {selectedMicroInfo.note}
              </div>
            </div>
          ) : activeRegionMeta ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '16px' }}>
                <strong style={{ fontSize: '11.5px', color: '#ffffff' }}>{activeRegion} Region</strong>
                <span style={{ fontSize: '10px', fontWeight: 700, color: activeRegionMeta.color }}>
                  {activeRegionMeta.avgMax} Avg Max
                </span>
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '9.5px', marginTop: '2px', fontWeight: 600 }}>
                Zone: {activeRegionMeta.zoneName} ({activeRegionMeta.tempRange})
              </div>
              <div style={{ marginTop: '5px', fontSize: '9.5px', color: '#94a3b8', lineHeight: 1.3 }}>
                {activeRegionMeta.description}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Bottom-Right Collapsible Climate Scale & Legend */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        backgroundColor: 'rgba(11, 17, 32, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '8px',
        padding: isLegendOpen ? '8px 12px' : '5px 8px',
        color: '#f8fafc',
        fontFamily: 'sans-serif',
        fontSize: '10px',
        zIndex: 10,
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        maxWidth: 'calc(100% - 20px)',
        width: isLegendOpen ? '260px' : 'auto',
        transition: 'all 0.2s ease',
      }}>
        {/* Legend Header & Collapse Toggle */}
        <div 
          onClick={() => setIsLegendOpen(!isLegendOpen)}
          style={{ 
            fontWeight: 'bold', 
            marginBottom: isLegendOpen ? '6px' : '0px', 
            borderBottom: isLegendOpen ? '1px solid rgba(255, 255, 255, 0.15)' : 'none', 
            paddingBottom: isLegendOpen ? '3px' : '0px', 
            fontSize: '10px', 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em',
            color: '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Compass size={11} className="text-amber-400" />
            <span className="truncate">{isLegendOpen ? 'Climate Scale' : 'Scale'}</span>
          </div>
          <button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>
            {isLegendOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
        </div>

        {isLegendOpen && (
          <>
            {/* Vertical Gradient Bar & Labels */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{
                width: '8px',
                height: '120px',
                borderRadius: '3px',
                background: 'linear-gradient(to top, #c026d3 0%, #0284c7 25%, #10b981 50%, #eab308 75%, #dc2626 100%)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 0 6px rgba(0,0,0,0.5)',
                flexShrink: 0,
              }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 700, color: '#f87171', fontSize: '9.5px' }}>EXTREME HEAT (&gt;42°C)</span>
                  <span style={{ color: '#94a3b8', fontSize: '8px' }}>Sindh & Balochistan (Red 🟥)</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 700, color: '#facc15', fontSize: '9.5px' }}>WARM PLAINS (30–41°C)</span>
                  <span style={{ color: '#94a3b8', fontSize: '8px' }}>Punjab Plains (Yellow 🟨)</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 700, color: '#34d399', fontSize: '9.5px' }}>HUMID ZONE (24–35°C)</span>
                  <span style={{ color: '#94a3b8', fontSize: '8px' }}>Islamabad & KP (Green 🟩)</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: '9.5px' }}>WET LAND (18–28°C)</span>
                  <span style={{ color: '#94a3b8', fontSize: '8px' }}>Kashmir Valleys (Blue 🟦)</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 700, color: '#e879f9', fontSize: '9.5px' }}>COLD ALPINE (10–22°C)</span>
                  <span style={{ color: '#94a3b8', fontSize: '8px' }}>Gilgit & Murree (Magenta 🟪)</span>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '5px',
              paddingTop: '3px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '8px',
              color: '#94a3b8',
              lineHeight: 1.2,
            }}>
              💡 White labels & halos highlight microclimates.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
