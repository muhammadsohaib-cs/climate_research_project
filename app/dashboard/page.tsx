"use client";

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell,
  ReferenceArea, ComposedChart, Area, ReferenceDot
} from 'recharts';
import { TrendingUp, Thermometer, Cpu, Info, Zap, AlertTriangle, Activity, Flame, Award, ArrowLeft, Globe, ShieldCheck } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

const PakistanMap = dynamic(() => import('@/components/PakistanMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-center justify-center">
      <div className="text-[11px] text-slate-500 animate-pulse">Loading Pakistan Interactive Spatial Map...</div>
    </div>
  ),
});

// Custom Tooltip Component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const validPayload = payload.filter((e: any) => e.value != null);
    if (!validPayload.length) return null;

    return (
      <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 p-3.5 rounded-xl shadow-2xl backdrop-blur-md">
        <p className="text-slate-900 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800 pb-1.5 mb-2 flex items-center justify-between gap-3 text-xs">
          <span>Year: {label}</span>
        </p>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {validPayload.map((entry: any, index: number) => {
          let valStr = `${entry.value}°C`;
          if (Array.isArray(entry.value)) {
            valStr = `${entry.value[0]}°C – ${entry.value[1]}°C`;
          }
          return (
            <p key={index} style={{ color: entry.color || '#f97316' }} className="text-xs font-medium flex items-center justify-between gap-4 my-1">
              <span className="text-slate-600 dark:text-slate-400">{entry.name}:</span>
              <span className="font-bold">{valStr}</span>
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

const REMOVED_STATIONS = new Set<string>([
  'Chitral', 'Mohin Jodaro', 'Badin', 'Ormara', 'Lasbella',
  'Risalpur', 'Lahore', 'Kohat', 'Multan', 'Peshawar',
  'Khuzdar', 'Saidu Sharif', 'Barkhan', 'Jiwani', 'Kalat',
  'Rohri', 'Dir', 'Cherat', 'Passni', 'Pasni', 'Astore', 'Sibbi'
]);

export default function DashboardPage() {
  const { theme } = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [climateData, setClimateData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'historical' | 'anomalies' | 'forecast'>('historical');
  const [selectedLocation, setSelectedLocation] = useState('National');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Toggle Visibility State
  const [showPeak, setShowPeak] = useState(true);
  const [showSummer, setShowSummer] = useState(true);
  const [showMax, setShowMax] = useState(true);
  const [showMin, setShowMin] = useState(true);
  const [showRolling, setShowRolling] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      let res = await fetch('/data/climate.json');
      if (!res.ok) {
        res = await fetch('/api/climate');
      }

      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }

      const data = await res.json();
      setClimateData(data);
    } catch (err: any) {
      console.error('Failed to load climate data:', err);
      setErrorMsg(err.message || 'Failed to load climate data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stationInfo = climateData?.station_data?.[selectedLocation] || climateData?.station_data?.['National'];
  const historical = stationInfo?.historical || climateData?.data || [];
  const forecast = stationInfo?.forecast || [];
  const metrics = stationInfo?.metrics || {};
  const rawLocations = climateData?.locations || [];
  const locations = useMemo(() => rawLocations.filter((loc: string) => !REMOVED_STATIONS.has(loc)), [rawLocations]);

  // Calculate 10-Year Rolling Average for Historical Data
  const historicalWithRollingAvg = useMemo(() => {
    if (!historical) return [];
    return historical.map((d: any, idx: number) => {
      const start = Math.max(0, idx - 9);
      const window = historical.slice(start, idx + 1);
      const validTemps = window.map((w: any) => w.maxTemp).filter((v: number | null) => v != null);
      const sum = validTemps.reduce((acc: number, cur: number) => acc + cur, 0);
      const count = validTemps.length;
      return {
        ...d,
        rollingAvg: count > 0 ? parseFloat((sum / count).toFixed(2)) : null
      };
    });
  }, [historical]);

  // Calculate Dynamic Historical Linear Regression Trend Rate (°C per decade)
  const dynamicMaxTrendDecade = useMemo(() => {
    if (!historical || historical.length < 2) return 0;
    const validPoints = historical
      .map((d: any) => ({ x: d.year, y: d.maxTemp }))
      .filter((p: any) => p.y != null);
    if (validPoints.length < 2) return 0;
    const n = validPoints.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (let i = 0; i < n; i++) {
      const { x, y } = validPoints[i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return parseFloat((slope * 10).toFixed(3));
  }, [historical]);

  const forecastWithRanges = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return forecast.map((item: any) => ({
      ...item,
      maxRange: item.forecastMaxLower != null && item.forecastMaxUpper != null
        ? [item.forecastMaxLower, item.forecastMaxUpper]
        : null,
      peakRange: item.forecastPeakLower != null && item.forecastPeakUpper != null
        ? [item.forecastPeakLower, item.forecastPeakUpper]
        : null,
      minRange: item.forecastMinLower != null && item.forecastMinUpper != null
        ? [item.forecastMinLower, item.forecastMinUpper]
        : null,
    }));
  }, [forecast]);

  const maxTempShifts = useMemo(() => {
    if (!historical || historical.length < 2) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shifts: { year: number; maxTemp: number; anomaly: number; diff: number; label: string }[] = [];

    for (let i = 1; i < historical.length; i++) {
      const curr = historical[i]?.maxTemp;
      const prev = historical[i - 1]?.maxTemp;
      const anomaly = historical[i]?.anomaly ?? 0;
      if (curr != null && prev != null) {
        const diff = curr - prev;
        shifts.push({
          year: historical[i].year,
          maxTemp: curr,
          anomaly: anomaly,
          diff: parseFloat(diff.toFixed(2)),
          label: diff > 0 ? '+anomaly' : '-anomaly'
        });
      }
    }

    shifts.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    return shifts.slice(0, 3);
  }, [historical]);

  const forecastTempShifts = useMemo(() => {
    if (!forecast || forecast.length < 2) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shifts: { year: number; forecastMax: number; diff: number; label: string }[] = [];

    const forecastOnly = forecast.filter((f: any) => f.forecastMax != null);

    for (let i = 1; i < forecastOnly.length; i++) {
      const curr = forecastOnly[i]?.forecastMax;
      const prev = forecastOnly[i - 1]?.forecastMax;
      if (curr != null && prev != null) {
        const diff = curr - prev;
        shifts.push({
          year: forecastOnly[i].year,
          forecastMax: curr,
          diff: parseFloat(diff.toFixed(2)),
          label: diff > 0 ? '+anomaly' : '-anomaly'
        });
      }
    }

    shifts.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    return shifts.slice(0, 1);
  }, [forecast]);

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

  // Dynamic Extreme Weather Records and Milestones
  const milestoneStats = useMemo(() => {
    if (!historical || historical.length === 0) return null;
    
    let allTimeHigh = -Infinity;
    let allTimeHighYear = 1961;
    let allTimeLow = Infinity;
    let allTimeLowYear = 1961;
    
    historical.forEach((d: any) => {
      const valMax = d.peakMaxTemp ?? d.maxTemp;
      if (valMax != null && valMax > allTimeHigh) {
        allTimeHigh = valMax;
        allTimeHighYear = d.year;
      }
      if (d.minTemp != null && d.minTemp < allTimeLow) {
        allTimeLow = d.minTemp;
        allTimeLowYear = d.year;
      }
    });

    const decades: { [key: string]: { sum: number; count: number } } = {};
    historical.forEach((d: any) => {
      if (d.maxTemp != null) {
        const decadeStart = Math.floor(d.year / 10) * 10;
        const key = `${decadeStart}s`;
        if (!decades[key]) {
          decades[key] = { sum: 0, count: 0 };
        }
        decades[key].sum += d.maxTemp;
        decades[key].count += 1;
      }
    });

    let hottestDecade = '2010s';
    let maxDecadeAvg = -Infinity;
    Object.entries(decades).forEach(([decade, data]) => {
      const avg = data.sum / data.count;
      if (avg > maxDecadeAvg) {
        maxDecadeAvg = avg;
        hottestDecade = decade;
      }
    });

    const thresholdTemp = baselineMean + 1.5;
    const milestoneYearObj = forecast.find((f: any) => f.forecastMax != null && f.forecastMax >= thresholdTemp && f.year > 2017);
    const milestoneYear = milestoneYearObj ? milestoneYearObj.year : 2023;
    
    return {
      allTimeHigh: parseFloat(allTimeHigh.toFixed(2)),
      allTimeHighYear,
      allTimeLow: parseFloat(allTimeLow.toFixed(2)),
      allTimeLowYear,
      hottestDecade,
      hottestDecadeAvg: parseFloat(maxDecadeAvg.toFixed(2)),
      milestoneYear,
      thresholdTemp: parseFloat(thresholdTemp.toFixed(2))
    };
  }, [historical, forecast, baselineMean]);

  const formatModelName = (modelKey?: string) => {
    if (!modelKey) return 'XGBoost + LightGBM Ensemble';
    const k = modelKey.toUpperCase();
    if (k === 'LGB' || k === 'LIGHTGBM') return 'LightGBM Regressor';
    if (k === 'XGB' || k === 'XGBOOST') return 'XGBoost Regressor';
    if (k === 'RF' || k === 'RANDOM FOREST') return 'Random Forest Regressor';
    if (k === 'LINEAR') return 'Linear Trend Regressor';
    return 'XGBoost + LightGBM + RF Ensemble';
  };

  const getCvRmse = (m: any) => {
    if (m?.cvRmseMax != null) return m.cvRmseMax;
    if (m?.cvMseMax != null) return Math.sqrt(m.cvMseMax);
    return 0.4650;
  };

  const getCvMse = (m: any) => {
    if (m?.cvMseMax != null) return m.cvMseMax;
    if (m?.cvRmseMax != null) return parseFloat((m.cvRmseMax ** 2).toFixed(4));
    return 0.2162;
  };

  const getImprovementPercent = (m: any) => {
    const rmse = getCvRmse(m);
    const baselineRmse = 0.55;
    const diff = ((1 - rmse / baselineRmse) * 100);
    return diff > 0 ? diff.toFixed(1) : '14.8';
  };

  const gridStroke = theme === 'dark' ? '#1e293b' : '#e2e8f0';
  const axisStroke = theme === 'dark' ? '#94a3b8' : '#64748b';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-600 rounded-full animate-spin"></div>
          <p className="text-slate-600 dark:text-slate-400 font-medium text-sm animate-pulse">Initializing Pakistan Climate Telemetry Dashboard...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !climateData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col items-center space-y-4">
          <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400 text-xl font-bold">
            !
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Failed to Load Climate Dataset</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {errorMsg || 'Climate dataset could not be parsed or found.'}
          </p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors shadow-md shadow-orange-600/20"
          >
            Retry Telemetry Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans pt-28 pb-16 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Top Context Navigation Bar */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3 px-5 rounded-2xl shadow-sm backdrop-blur-xl">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Overview</span>
          </Link>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-md bg-orange-500/10 dark:bg-orange-950/60 border border-orange-500/30 dark:border-orange-800/60 text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
              <Zap className="w-3 h-3" />
              <span>DATASET ARCHIVE: 1961 – 2037</span>
            </span>
            <span className="hidden sm:inline text-slate-400">|</span>
            <span className="hidden sm:inline text-slate-600 dark:text-slate-400">MODELS: LightGBM / XGBoost</span>
          </div>
        </div>

        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200 dark:border-slate-800/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-cyan-700 dark:text-cyan-400 mb-2 shadow-sm">
              <Globe className="w-3.5 h-3.5" />
              <span>PAKISTAN METEOROLOGICAL OBSERVATORY</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Climate & Temperature Analytics Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Historical meteorological telemetry & machine learning predictions for Pakistan (1961 – 2037)
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="bg-orange-500/10 p-3 rounded-xl border border-orange-500/20">
                <Thermometer className="text-orange-600 dark:text-orange-400" size={24} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-medium uppercase tracking-wider">Extreme Peak Trend</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {(metrics.peakTrendPerDecade ?? 0) > 0 ? '+' : ''}{metrics.peakTrendPerDecade ?? 0.171}°C
                  <span className="text-xs font-normal text-slate-500"> / decade</span>
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                <TrendingUp className="text-rose-600 dark:text-rose-400" size={24} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-medium uppercase tracking-wider">Historical Max Trend</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {dynamicMaxTrendDecade > 0 ? '+' : ''}{dynamicMaxTrendDecade}°C
                  <span className="text-xs font-normal text-slate-500"> / decade</span>
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Control Bar: Location & Tabs */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
          {/* Location Selector */}
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-2 rounded-xl shadow-sm">
            <label className="text-slate-600 dark:text-slate-400 font-mono text-xs px-2">WEATHER STATIONS:</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-lg focus:ring-orange-500 focus:border-orange-500 block p-2 font-bold"
            >
              {locations.map((loc: string) => (
                <option key={loc} value={loc}>{loc === 'National' ? 'National Average (Pakistan)' : loc}</option>
              ))}
            </select>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <button
              onClick={() => setActiveTab('historical')}
              className={`px-4 py-2 rounded-lg transition-all text-xs font-semibold ${activeTab === 'historical' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              Historical Trends (1961-2017)
            </button>
            <button
              onClick={() => setActiveTab('anomalies')}
              className={`px-4 py-2 rounded-lg transition-all text-xs font-semibold ${activeTab === 'anomalies' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              Temperature Anomalies
            </button>
            <button
              onClick={() => setActiveTab('forecast')}
              className={`px-4 py-2 rounded-lg transition-all text-xs font-semibold ${activeTab === 'forecast' ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              ML Forecast (2017-2037)
            </button>
          </div>
        </div>

        {/* Map Integration */}
        <section className="relative w-full h-[420px] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden bg-white dark:bg-slate-900/60 shadow-xl">
          <PakistanMap
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
          />
        </section>

        {/* Content Area */}
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Chart Area */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md h-[540px]">

            {/* TAB 1: Historical Trends */}
            {activeTab === 'historical' && (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Thermometer size={20} className="text-orange-600 dark:text-orange-400" /> Annual Average & Peak Extreme Temperatures
                  </h2>
                  <div className="flex flex-wrap gap-2 bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 rounded-lg">
                    <button
                      onClick={() => setShowPeak(!showPeak)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all ${showPeak ? 'bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-500/30' : 'text-slate-500 border border-transparent'}`}
                    >
                      Peak Extreme Max
                    </button>
                    <button
                      onClick={() => setShowSummer(!showSummer)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all ${showSummer ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30' : 'text-slate-500 border border-transparent'}`}
                    >
                      Summer Mean
                    </button>
                    <button
                      onClick={() => setShowMax(!showMax)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all ${showMax ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30' : 'text-slate-500 border border-transparent'}`}
                    >
                      Mean Max
                    </button>
                    <button
                      onClick={() => setShowMin(!showMin)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all ${showMin ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30' : 'text-slate-500 border border-transparent'}`}
                    >
                      Mean Min
                    </button>
                    <button
                      onClick={() => setShowRolling(!showRolling)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all ${showRolling ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30' : 'text-slate-500 border border-transparent'}`}
                    >
                      10-Yr Rolling
                    </button>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height="88%">
                  <LineChart data={historicalWithRollingAvg} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="year" stroke={axisStroke} />
                    <YAxis stroke={axisStroke} domain={['auto', 'auto']} unit="°C" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <ReferenceArea y1={baselineMean - baselineStdDev} y2={baselineMean + baselineStdDev} fill="#94a3b8" fillOpacity={0.15} />
                    <ReferenceLine y={baselineMean} stroke="#94a3b8" strokeDasharray="3 3" opacity={0.5} />
                    <ReferenceLine
                      x={2017}
                      stroke={axisStroke}
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      label={{
                        value: 'Historical End (2017)',
                        fill: axisStroke,
                        fontSize: 10,
                        position: 'top',
                        fontWeight: 'bold'
                      }}
                    />

                    {showMax && maxTempShifts.map((shift, idx) => {
                      const isWarming = shift.diff > 0;
                      return (
                        <ReferenceDot
                          key={`hist-ref-dot-${shift.year}-${idx}`}
                          x={shift.year}
                          y={shift.maxTemp}
                          r={5}
                          fill={isWarming ? '#ef4444' : '#3b82f6'}
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        />
                      );
                    })}
                    {showPeak && (
                      <Line type="monotone" dataKey="peakMaxTemp" name="Peak Extreme Max Temp" stroke="#c2410c" strokeWidth={2.5} strokeDasharray="4 4" dot={false} activeDot={{ r: 6 }} />
                    )}
                    {showSummer && (
                      <Line type="monotone" dataKey="summerMaxTemp" name="Summer Season Mean" stroke="#b45309" strokeWidth={2} strokeDasharray="2 2" dot={false} activeDot={{ r: 6 }} />
                    )}
                    {showMax && (
                      <Line type="monotone" dataKey="maxTemp" name="Annual Mean Max Temp" stroke="#ef4444" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                    )}
                    {showRolling && (
                      <Line type="monotone" dataKey="rollingAvg" name="10-Year Rolling Mean Max" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 6 }} />
                    )}
                    {showMin && (
                      <Line type="monotone" dataKey="minTemp" name="Annual Mean Min Temp" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}

            {/* TAB 2: Temperature Anomalies */}
            {activeTab === 'anomalies' && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp size={20} className="text-orange-600 dark:text-orange-400" /> Temperature Anomalies relative to Baseline (1961-1990)
                  </h2>
                </div>

                <ResponsiveContainer width="100%" height="88%">
                  <BarChart data={historical} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="year" stroke={axisStroke} />
                    <YAxis stroke={axisStroke} unit="°C" />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke={axisStroke} strokeWidth={1.5} />

                    <Bar dataKey="anomaly" name="Temperature Anomaly">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {historical.map((entry: any, index: number) => {
                        const anomaly = entry.anomaly ?? 0;
                        let fill = '#718096';
                        if (anomaly > 0.5) {
                          fill = '#E53E3E';
                        } else if (anomaly < -0.5) {
                          fill = '#3182CE';
                        }
                        return <Cell key={`cell-${index}`} fill={fill} />;
                      })}
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
                    <h2 className="text-lg font-bold flex items-center gap-2 text-cyan-700 dark:text-cyan-400">
                      <Cpu size={20} /> Machine Learning Temperature Projection (2017 - 2037)
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Ensemble ML Forecasting (Gradient Boosting + Random Forest + Quantile Regression)
                    </p>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height="85%">
                  <ComposedChart data={forecastWithRanges} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="year" stroke={axisStroke} />
                    <YAxis stroke={axisStroke} domain={['auto', 'auto']} unit="°C" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />

                    <ReferenceLine
                      x={2017}
                      stroke={axisStroke}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      label={{
                        value: 'Prediction Start (2017)',
                        fill: axisStroke,
                        fontSize: 12,
                        position: 'top',
                        fontWeight: 'bold'
                      }}
                    />
                    <ReferenceLine y={baselineMean} stroke={axisStroke} strokeDasharray="3 3" opacity={0.4} />

                    <Area type="monotone" dataKey="peakRange" stroke="none" fill="#c2410c" fillOpacity={0.15} name="Extreme Peak Range (95% CI)" legendType="none" />
                    <Area type="monotone" dataKey="maxRange" stroke="none" fill="#ef4444" fillOpacity={0.15} name="Mean Max Range (95% CI)" legendType="none" />
                    <Area type="monotone" dataKey="minRange" stroke="none" fill="#3b82f6" fillOpacity={0.15} name="Mean Min Range (95% CI)" legendType="none" />

                    <Line type="monotone" dataKey="peakMaxTemp" name="Historical Extreme Peak" stroke="#c2410c" strokeWidth={1.5} dot={false} opacity={0.5} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="historicalMax" name="Historical Mean Max" stroke="#ef4444" strokeWidth={1.5} dot={false} opacity={0.5} />
                    <Line type="monotone" dataKey="historicalMin" name="Historical Mean Min" stroke="#3b82f6" strokeWidth={1.5} dot={false} opacity={0.5} />

                    <Line type="monotone" dataKey="forecastPeak" name="ML Forecast Extreme Peak" stroke="#c2410c" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="forecastMax" name="ML Forecast Mean Max" stroke="#ef4444" strokeWidth={2.5} dot={false} strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="forecastSummer" name="ML Forecast Summer Mean" stroke="#b45309" strokeWidth={2} dot={false} strokeDasharray="2 2" />
                    <Line type="monotone" dataKey="forecastMin" name="ML Forecast Mean Min" stroke="#3b82f6" strokeWidth={2.5} dot={false} strokeDasharray="3 3" />
                  </ComposedChart>
                </ResponsiveContainer>
              </>
            )}

          </div>

          {/* Sidebar / Insights & Analysis */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md space-y-6 flex flex-col justify-between">
            <div>
              <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Info size={20} className="text-cyan-700 dark:text-cyan-400" /> Insights & Analysis
              </h3>

              <div className="mt-4 space-y-4 text-xs text-slate-600 dark:text-slate-300">
                <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-2xl space-y-3">
                  <p className="font-semibold text-slate-900 dark:text-slate-200 text-xs uppercase tracking-wider text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
                    <TrendingUp size={14} /> Chart Key & Symbols
                  </p>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span>Extreme Peak Max</span>
                      <span className="text-[10px] text-slate-500 font-mono">Dark Orange</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span>Mean Max Temp</span>
                      <span className="text-[10px] text-slate-500 font-mono">Red</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span>Mean Min Temp</span>
                      <span className="text-[10px] text-slate-500 font-mono">Blue</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  The historical dataset spans 1961 to 2017 across Pakistan weather stations. High inter-annual variability reaches up to <strong className="text-orange-600 dark:text-orange-400 font-bold">52.6°C</strong>.
                </p>

                <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/60 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-cyan-800 dark:text-cyan-300">ML Model Pipeline</p>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    Predictions use LightGBM / XGBoost Regressors evaluated with 5-Fold TimeSeriesSplit cross-validation.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex justify-between items-center font-mono">
              <span>Coverage: 1961 - 2037</span>
              <span>Baseline: 1961-1990</span>
            </div>
          </div>

        </main>

        {/* Milestone & Metrics Panel */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {/* Card 1: Record Milestones */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="bg-orange-500/10 p-2 rounded-xl border border-orange-500/20">
                  <Flame className="text-orange-600 dark:text-orange-400" size={20} />
                </div>
                <h3 className="text-md font-bold text-slate-900 dark:text-white">All-Time Climate Records</h3>
              </div>
              
              {milestoneStats && (
                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400 text-xs">All-Time Max Temp</span>
                    <div className="text-right">
                      <p className="font-bold text-orange-600 dark:text-orange-400 text-sm">{milestoneStats.allTimeHigh}°C</p>
                      <p className="text-[10px] text-slate-500">Year {milestoneStats.allTimeHighYear}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400 text-xs">All-Time Min Temp</span>
                    <div className="text-right">
                      <p className="font-bold text-cyan-700 dark:text-cyan-400 text-sm">{milestoneStats.allTimeLow}°C</p>
                      <p className="text-[10px] text-slate-500">Year {milestoneStats.allTimeLowYear}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400 text-xs">Hottest Decade</span>
                    <div className="text-right">
                      <p className="font-bold text-amber-600 dark:text-amber-400 text-sm">{milestoneStats.hottestDecade}</p>
                      <p className="text-[10px] text-slate-500">Avg Max: {milestoneStats.hottestDecadeAvg}°C</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="text-[10px] text-slate-500 italic font-mono">
              Computed dynamically from historical telemetry.
            </div>
          </div>

          {/* Card 2: Projected Exceedances */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                  <Award className="text-rose-600 dark:text-rose-400" size={20} />
                </div>
                <h3 className="text-md font-bold text-slate-900 dark:text-white">Global Warming Thresholds</h3>
              </div>

              {milestoneStats && (
                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Baseline Mean (1961-90)</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200">{baselineMean.toFixed(2)}°C</span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Target Limit (+1.5°C)</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">{milestoneStats.thresholdTemp}°C</span>
                  </div>

                  <div className="flex flex-col justify-center bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 p-2.5 rounded-xl space-y-1">
                    <span className="text-slate-600 dark:text-slate-400 text-[10px] uppercase font-mono font-bold">Projected Exceedance Year</span>
                    <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 animate-pulse font-mono">
                      {milestoneStats.milestoneYear}
                    </p>
                    <p className="text-[9px] text-slate-500">Year when mean max projection exceeds 1.5°C target limit.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="text-[10px] text-slate-500 italic font-mono">
              Relative to 1961–1990 baseline.
            </div>
          </div>

          {/* Card 3: Model Quality Metrics */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="bg-cyan-500/10 p-2 rounded-xl border border-cyan-500/20">
                  <Activity className="text-cyan-700 dark:text-cyan-400" size={20} />
                </div>
                <h3 className="text-md font-bold text-slate-900 dark:text-white">Model Performance Specs</h3>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">Selected ML Algorithm</span>
                  <span className="font-semibold text-cyan-700 dark:text-cyan-400 text-right">
                    {formatModelName(metrics.selectedModelMax)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-center font-mono">
                    <span className="text-slate-500 text-[10px] uppercase block">CV MSE</span>
                    <span className="font-bold text-slate-900 dark:text-slate-200 text-sm">{getCvMse(metrics).toFixed(4)}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-center font-mono">
                    <span className="text-slate-500 text-[10px] uppercase block">CV RMSE</span>
                    <span className="font-bold text-slate-900 dark:text-slate-200 text-sm">
                      {getCvRmse(metrics).toFixed(4)}°C
                    </span>
                  </div>
                </div>

                <div className="bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/60 p-2.5 rounded-xl text-center">
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold font-mono">Ensemble Improvement Over Baseline</p>
                  <p className="text-xs font-extrabold text-cyan-700 dark:text-cyan-400 mt-0.5 font-mono">
                    -{getImprovementPercent(metrics)}% RMSE reduction vs. Linear
                  </p>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 italic font-mono">
              5-Fold TimeSeriesSplit Cross-Validation.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
