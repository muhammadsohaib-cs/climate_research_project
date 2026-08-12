"use client";

import React, { useState } from 'react';
import { Flame, ShieldCheck, Thermometer, ArrowRight, Zap, RefreshCw, CheckCircle2 } from 'lucide-react';

interface MaterialOption {
  id: string;
  name: string;
  category: string;
  albedo: number;
  tempReduction: number;
  radiationDrop: string;
  comfortGain: string;
  color: string;
  description: string;
}

const MATERIALS: MaterialOption[] = [
  {
    id: 'asphalt',
    name: 'Standard Dark Asphalt',
    category: 'Baseline Infrastructure',
    albedo: 0.08,
    tempReduction: 0.0,
    radiationDrop: '0%',
    comfortGain: 'Extreme Heat Danger',
    color: 'border-rose-500/50 bg-rose-950/20 text-rose-400',
    description: 'High thermal mass absorbs solar radiation throughout daytime, contributing heavily to urban heat island effect.'
  },
  {
    id: 'cool_pavement',
    name: 'Reflective Cool Coating',
    category: 'Surface Modification',
    albedo: 0.45,
    tempReduction: -4.8,
    radiationDrop: '-32%',
    comfortGain: 'Moderate Cooling',
    color: 'border-amber-500/50 bg-amber-950/20 text-amber-400',
    description: 'Specialized solar reflective coating redirects UV and infrared radiation away from ground surface.'
  },
  {
    id: 'urban_canopy',
    name: 'Dense Tree Canopy Cover',
    category: 'Biophilic Cooling',
    albedo: 0.25,
    tempReduction: -7.2,
    radiationDrop: '-58%',
    comfortGain: 'Optimal Comfort Zone',
    color: 'border-emerald-500/50 bg-emerald-950/20 text-emerald-400',
    description: 'Combines direct shade obstruction with evapotranspiration process to cool ambient air significantly.'
  },
  {
    id: 'green_roof',
    name: 'Integrated Solar Green Roof',
    category: 'Architectural Tech',
    albedo: 0.35,
    tempReduction: -6.1,
    radiationDrop: '-46%',
    comfortGain: 'High Efficiency',
    color: 'border-cyan-500/50 bg-cyan-950/20 text-cyan-400',
    description: 'Sub-layer vegetation prevents heat transfer into building envelopes while absorbing ambient greenhouse warmth.'
  }
];

export default function InteractiveHeatSim() {
  const [selectedMat, setSelectedMat] = useState<MaterialOption>(MATERIALS[0]);
  const [ambientTemp, setAmbientTemp] = useState<number>(38.5);

  const calculatedSurfaceTemp = (ambientTemp + 12.0 + (selectedMat.id === 'asphalt' ? 4.0 : selectedMat.tempReduction)).toFixed(1);
  const baselineTemp = (ambientTemp + 16.0).toFixed(1);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      {/* Top Accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-rose-500 to-cyan-500"></div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Control Panel */}
        <div className="w-full lg:w-1/2 space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-950/60 border border-orange-800/60 text-orange-400 text-xs font-mono mb-3">
              <Zap className="w-3.5 h-3.5" />
              <span>LIVE THERMAL MITIGATION SIMULATOR</span>
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Surface Intervention Impact
            </h3>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              Select an urban material or biophilic cooling strategy to observe simulated micro-climate temperature reductions.
            </p>
          </div>

          {/* Ambient Temperature Slider */}
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Ambient Peak Air Temp:</span>
              <span className="text-orange-400 font-mono font-bold text-sm">{ambientTemp.toFixed(1)}°C</span>
            </div>
            <input
              type="range"
              min="30"
              max="48"
              step="0.5"
              value={ambientTemp}
              onChange={(e) => setAmbientTemp(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>30°C (Mild)</span>
              <span>40°C (Hot)</span>
              <span>48°C (Extreme Heatwave)</span>
            </div>
          </div>

          {/* Material Selectors */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
              Select Surface Material / Strategy:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MATERIALS.map((mat) => {
                const isSelected = selectedMat.id === mat.id;
                return (
                  <button
                    key={mat.id}
                    onClick={() => setSelectedMat(mat)}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? `${mat.color} ring-2 ring-orange-500/40 shadow-lg`
                        : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase font-mono tracking-wider opacity-75">{mat.category}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />}
                      </div>
                      <h4 className="text-xs font-bold mt-1 text-white">{mat.name}</h4>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] font-mono border-t border-slate-800/80 pt-2">
                      <span className="text-slate-400">Albedo: {mat.albedo}</span>
                      <span className={mat.tempReduction < 0 ? 'text-cyan-400 font-bold' : 'text-rose-400 font-bold'}>
                        {mat.tempReduction === 0 ? 'Baseline' : `${mat.tempReduction}°C`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Output HUD */}
        <div className="w-full lg:w-1/2 bg-slate-950/90 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Simulation Output</span>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-orange-400" />
                {selectedMat.name}
              </h4>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
              SOLAR REFLECTANCE: {(selectedMat.albedo * 100).toFixed(0)}%
            </span>
          </div>

          {/* Temperature Comparison Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-xl">
              <span className="text-[10px] font-mono text-slate-400 block mb-1">Standard Surface Temp</span>
              <div className="text-2xl font-black text-rose-500 font-mono">{baselineTemp}°C</div>
              <span className="text-[10px] text-slate-500">Unmitigated asphalt</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-xl">
              <span className="text-[10px] font-mono text-slate-400 block mb-1">Intervention Temp</span>
              <div className="text-2xl font-black text-cyan-400 font-mono">{calculatedSurfaceTemp}°C</div>
              <span className="text-[10px] text-cyan-500/80 font-medium">
                {selectedMat.tempReduction < 0 ? `Saved ${Math.abs(selectedMat.tempReduction)}°C Heat` : 'Baseline benchmark'}
              </span>
            </div>
          </div>

          {/* Description & Impact */}
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl space-y-3">
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedMat.description}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs font-mono">
              <div>
                <span className="text-slate-500 text-[10px] block">Radiation Obstruction:</span>
                <span className="text-orange-400 font-semibold">{selectedMat.radiationDrop}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Thermal Safety Rating:</span>
                <span className="text-cyan-400 font-semibold">{selectedMat.comfortGain}</span>
              </div>
            </div>
          </div>

          {/* Bottom Note */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-2">
            <span>MODEL: Surface Thermal Infrared (STIR-v2)</span>
            <span className="text-orange-400 flex items-center gap-1">
              Live Interactive Demo
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}
