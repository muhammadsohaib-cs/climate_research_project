"use client";

import React, { useEffect, useRef } from 'react';
import { Map, MapStyle, config, Marker, Popup } from '@maptiler/sdk';

config.apiKey = '6EJobKlrqbFsfxl8gZlh';

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
  const mapInstance = useRef<Map | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Initialize the map centered on Pakistan
    const map = new Map({
      container: 'map',
      style: MapStyle.STREETS,
      center: [69.3451, 30.3753],
      zoom: 5
    });

    mapInstance.current = map;

    // Plot all 55 weather stations
    Object.entries(STATION_COORDS).forEach(([name, coords]) => {
      const popup = new Popup({ offset: 25 }).setHTML(
        `<div style="color: #0f172a; padding: 4px;">
          <h4 style="margin: 0; font-weight: 700; font-size: 13px;">${name}</h4>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #475569;">Weather Station</p>
         </div>`
      );

      const marker = new Marker({
        color: name === selectedLocation ? '#f97316' : '#3b82f6'
      })
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map);

      // Listen for click event to update the selected station in dashboard
      marker.getElement().addEventListener('click', (e) => {
        // Prevent map click handler (if any)
        e.stopPropagation();
        setSelectedLocation(name);
      });

      markersRef.current[name] = marker;
    });

    // Cleanup map on unmount
    return () => {
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update marker colors and pan to selection when selectedLocation changes
  useEffect(() => {
    if (!mapInstance.current) return;

    // Skip the flyTo on mount to respect the initial center
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
        mapInstance.current.flyTo({
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
          mapInstance.current.flyTo({
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
    <div className="w-full h-full relative">
      <div id="map" className="w-full h-full rounded-2xl" />
    </div>
  );
}
