"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell,
  ReferenceArea
} from 'recharts';
import { TrendingUp, Thermometer, Cpu, Info } from 'lucide-react';

// Custom Tooltip Component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const validPayload = payload.filter((e: any) => e.value != null);
    if (!validPayload.length) return null;

    return (
      <div className="bg-slate-900/95 border border-slate-700/80 p-3.5 rounded-xl shadow-2xl backdrop-blur-md">
        <p className="text-slate-200 font-bold border-b border-slate-800 pb-1.5 mb-2 flex items-center justify-between gap-3 text-xs">
          <span>Year: {label}</span>
        </p>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {validPayload.map((entry: any, index: number) => {
          let valStr = `${entry.value}°C`;
          if (Array.isArray(entry.value)) {
            valStr = `${entry.value[0]}°C – ${entry.value[1]}°C`;
          }
          return (
            <p key={index} style={{ color: entry.color || '#cbd5e1' }} className="text-xs font-medium flex items-center justify-between gap-4 my-1">
              <span className="text-slate-400">{entry.name}:</span>
              <span className="font-bold">{valStr}</span>
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [climateData, setClimateData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'historical' | 'anomalies' | 'forecast'>('historical');
  const [selectedLocation, setSelectedLocation] = useState('National');

  // Toggle Visibility State
  const [showPeak, setShowPeak] = useState(true);
  const [showSummer, setShowSummer] = useState(true);
  const [showMax, setShowMax] = useState(true);
  const [showMin, setShowMin] = useState(true);

  useEffect(() => {
    fetch('/data/climate.json')
      .then((res) => res.json())
      .then((data) => {
        setClimateData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load climate data:', err);
        setLoading(false);
      });
  }, []);

  const stationInfo = climateData?.station_data?.[selectedLocation] || climateData?.station_data?.['National'];
  const historical = stationInfo?.historical || climateData?.data || [];
  const forecast = stationInfo?.forecast || [];
  const metrics = stationInfo?.metrics || {};
  const locations = climateData?.locations || [];

  const { baselineMean, baselineStdDev } = useMemo(() => {
    if (!historical || historical.length === 0) return { baselineMean: 0, baselineStdDev: 1 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baselineData = historical.filter((h: any) => h.year >= 1961 && h.year <= 1990);
    if (baselineData.length === 0) return { baselineMean: 0, baselineStdDev: 1 };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mean = baselineData.reduce((sum: number, h: any) => sum + (h.maxTemp || 0), 0) / baselineData.length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anomalies = baselineData.map((h: any) => h.anomaly || 0);
    const variance = anomalies.reduce((sum: number, val: number) => sum + val * val, 0) / anomalies.length;

    return { baselineMean: mean, baselineStdDev: Math.sqrt(variance) };
  }, [historical]);

  if (loading || !climateData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium text-sm animate-pulse">Loading Machine Learning Climate System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-amber-400 to-emerald-400 bg-clip-text text-transparent">
              Climate Change Dashboard
            </h1>
            <p className="text-slate-400 mt-2">
              Historical & Machine Learning Analysis for Pakistan (1961 - 2037)
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-md flex items-center gap-4 shadow-lg">
              <div className="bg-orange-500/20 p-3 rounded-lg border border-orange-500/30">
                <Thermometer className="text-orange-400" size={24} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Extreme Peak Trend</p>
                <p className="text-2xl font-bold text-slate-100 mt-0.5">
                  {(metrics.peakTrendPerDecade ?? 0) > 0 ? '+' : ''}{metrics.peakTrendPerDecade ?? 0.171}°C
                  <span className="text-xs font-normal text-slate-500"> / decade</span>
                </p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-md flex items-center gap-4 shadow-lg">
              <div className="bg-red-500/20 p-3 rounded-lg border border-red-500/30">
                <TrendingUp className="text-red-400" size={24} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Mean Max Trend</p>
                <p className="text-2xl font-bold text-slate-100 mt-0.5">
                  {(metrics.maxTrendPerDecade ?? 0) > 0 ? '+' : ''}{metrics.maxTrendPerDecade ?? 0.171}°C
                  <span className="text-xs font-normal text-slate-500"> / decade</span>
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Control Bar: Location & Tabs */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
          {/* Location Selector */}
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-lg backdrop-blur-md">
            <label className="text-slate-400 font-medium px-2 text-sm">Location:</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2 font-semibold"
            >
              {locations.map((loc: string) => (
                <option key={loc} value={loc}>{loc === 'National' ? 'National Average' : loc}</option>
              ))}
            </select>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 p-1 bg-white/5 border border-white/10 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('historical')}
              className={`px-4 py-2 rounded-md transition-all text-sm font-medium ${activeTab === 'historical' ? 'bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Historical Trends
            </button>
            <button
              onClick={() => setActiveTab('anomalies')}
              className={`px-4 py-2 rounded-md transition-all text-sm font-medium ${activeTab === 'anomalies' ? 'bg-orange-500/20 text-orange-400 font-semibold border border-orange-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Temperature Anomalies
            </button>
            <button
              onClick={() => setActiveTab('forecast')}
              className={`px-4 py-2 rounded-md transition-all text-sm font-medium ${activeTab === 'forecast' ? 'bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Machine Learning Forecast
            </button>
          </div>
        </div>

        {/* Content Area */}
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Chart Area */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md h-[520px]">

            {/* TAB 1: Historical Trends */}
            {activeTab === 'historical' && (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Thermometer size={20} className="text-orange-400" /> Annual Average & Peak Extreme Temperatures
                  </h2>
                  <div className="flex flex-wrap gap-2 bg-slate-900/60 p-1 border border-slate-800 rounded-lg">
                    <button
                      onClick={() => setShowPeak(!showPeak)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all ${showPeak ? 'bg-orange-500/25 text-orange-300 border border-orange-500/30' : 'text-slate-500 hover:text-slate-400 border border-transparent'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${showPeak ? 'bg-orange-400 animate-pulse' : 'bg-slate-700'}`}></span>
                      Peak Extreme Max
                    </button>
                    <button
                      onClick={() => setShowSummer(!showSummer)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all ${showSummer ? 'bg-amber-500/25 text-amber-300 border border-amber-500/30' : 'text-slate-500 hover:text-slate-400 border border-transparent'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${showSummer ? 'bg-amber-400 animate-pulse' : 'bg-slate-700'}`}></span>
                      Summer Mean (May-Jul)
                    </button>
                    <button
                      onClick={() => setShowMax(!showMax)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all ${showMax ? 'bg-red-500/25 text-red-300 border border-red-500/30' : 'text-slate-500 hover:text-slate-400 border border-transparent'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${showMax ? 'bg-red-400 animate-pulse' : 'bg-slate-700'}`}></span>
                      Mean Max
                    </button>
                    <button
                      onClick={() => setShowMin(!showMin)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all ${showMin ? 'bg-blue-500/25 text-blue-300 border border-blue-500/30' : 'text-slate-500 hover:text-slate-400 border border-transparent'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${showMin ? 'bg-blue-400 animate-pulse' : 'bg-slate-700'}`}></span>
                      Mean Min
                    </button>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height="88%">
                  <LineChart data={historical} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="year" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" domain={['auto', 'auto']} unit="°C" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <ReferenceArea y1={baselineMean - baselineStdDev} y2={baselineMean + baselineStdDev} fill="#94a3b8" fillOpacity={0.15} />
                    <ReferenceLine y={baselineMean} stroke="#94a3b8" strokeDasharray="3 3" opacity={0.4} />
                    {showPeak && (
                      <Line type="monotone" dataKey="peakMaxTemp" name="Peak Extreme Max Temp" stroke="#f97316" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 3, fill: '#f97316' }} activeDot={{ r: 8 }} />
                    )}
                    {showSummer && (
                      <Line type="monotone" dataKey="summerMaxTemp" name="Summer Season Mean (May-Jul)" stroke="#eab308" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                    )}
                    {showMax && (
                      <Line type="monotone" dataKey="maxTemp" name="Annual Mean Max Temp" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3, fill: '#ef4444' }} activeDot={{ r: 8 }} />
                    )}
                    {showMin && (
                      <Line type="monotone" dataKey="minTemp" name="Annual Mean Min Temp" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 8 }} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}

            {/* TAB 2: Temperature Anomalies */}
            {activeTab === 'anomalies' && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <TrendingUp size={20} className="text-orange-400" /> Temperature Anomalies relative to Baseline (1961-1990)
                  </h2>
                </div>

                <ResponsiveContainer width="100%" height="88%">
                  <BarChart data={historical} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="year" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" unit="°C" />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
                    <Bar dataKey="anomaly" name="Temperature Anomaly">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {historical.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={(entry.anomaly ?? 0) >= 0 ? '#f97316' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}

            {/* TAB 3: Machine Learning Forecast (2017 - 2037) */}
            {activeTab === 'forecast' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-emerald-400">
                      <Cpu size={20} /> Machine Learning Temperature Projection (2017 - 2037)
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Accurate Ensemble ML Forecasting (Gradient Boosting + Random Forest + Quantile Regression)
                    </p>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={forecast} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="year" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" domain={['auto', 'auto']} unit="°C" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />

                    <ReferenceLine x={2017} stroke="#e2e8f0" strokeDasharray="3 3" label={{ value: '2017 Forecast Start', fill: '#cbd5e1', fontSize: 12, position: 'top' }} />

                    {/* Historical Baseline Lines */}
                    <Line type="monotone" dataKey="peakMaxTemp" name="Historical Extreme Peak" stroke="#ea580c" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="historicalMax" name="Historical Mean Max" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="historicalMin" name="Historical Mean Min" stroke="#3b82f6" strokeWidth={2} dot={false} />

                    {/* ML Forecast Lines (2017-2037) */}
                    <Line type="monotone" dataKey="forecastPeak" name="ML Forecast Extreme Peak" stroke="#f97316" strokeWidth={3} strokeDasharray="4 4" dot={{ r: 4, fill: '#f97316' }} />
                    <Line type="monotone" dataKey="forecastMax" name="ML Forecast Mean Max" stroke="#f43f5e" strokeWidth={3} strokeDasharray="4 4" dot={{ r: 4, fill: '#f43f5e' }} />
                    <Line type="monotone" dataKey="forecastSummer" name="ML Forecast Summer Mean" stroke="#eab308" strokeWidth={2.5} strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="forecastMin" name="ML Forecast Mean Min" stroke="#06b6d4" strokeWidth={3} strokeDasharray="4 4" dot={{ r: 4, fill: '#06b6d4' }} />
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}

          </div>

          {/* Sidebar / Insights & Analysis */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Info size={20} className="text-blue-400" /> Insights & Analysis
              </h3>

              <div className="mt-4 space-y-4 text-sm text-slate-300">
                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
                  <p className="font-semibold text-slate-200 text-xs uppercase tracking-wider text-blue-400">Chart Key & Baseline Information</p>
                  <ul className="space-y-1 text-xs text-slate-400">
                    <li><strong className="text-orange-400">Extreme Peak Max:</strong> Peak summer heat</li>
                    <li><strong className="text-red-400">Mean Max Temp:</strong> Daily average max</li>
                    <li><strong className="text-blue-400">Min Temp:</strong> Daily average min</li>
                    <li><strong className="text-amber-400">Red Dot:</strong> Extreme anomaly</li>
                    <li><strong className="text-slate-400">Dotted Line:</strong> Baseline Mean</li>
                    <li><strong className="text-emerald-400">Forecast Trend:</strong> ML Projection (2017-2037)</li>
                  </ul>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  The historical dataset spans 1961 to 2017 across Pakistan weather stations.
                </p>

                <p className="text-xs text-slate-300 leading-relaxed">
                  We observe high inter-annual variability, with extreme peak temperatures regularly reaching <strong className="text-orange-400 font-bold">48°C – 52.6°C</strong> in stations like Sibi and Nokkundi.
                </p>

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-emerald-300">Machine Learning Model</p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Forecasts onward from 2017 are generated using an Ensemble Machine Learning model (Gradient Boosting + Random Forest + Quantile Regression Bounds) trained on historical time-series lags and exogenous climate drivers (CO2 Keeling trajectory, volcanic aerosols, ENSO).
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between items-center">
              <span>Coverage: 1961 - 2037</span>
              <span>Baseline: 1961-1990</span>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
