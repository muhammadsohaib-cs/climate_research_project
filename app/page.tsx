"use client";

import React, { useState } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell,
  ComposedChart, Area, ReferenceArea
} from 'recharts';
import { TrendingUp, Thermometer, CloudRain, AlertTriangle } from 'lucide-react';
import climateData from './data/climate.json';

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
  const [activeTab, setActiveTab] = useState('historical');
  const [selectedLocation, setSelectedLocation] = useState('National');
  const [showPeak, setShowPeak] = useState(true);
  const [showSummer, setShowSummer] = useState(true);
  const [showMax, setShowMax] = useState(true);
  const [showMin, setShowMin] = useState(true);
  const [showBands, setShowBands] = useState(true);

  // Ensure data exists for safety
  const locationData = climateData.data[selectedLocation as keyof typeof climateData.data] || climateData.data['National'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { historical, forecast, metrics } = locationData as any;
  const locations = climateData.locations;

  const { baselineMean, baselineStdDev } = React.useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baselineData = historical.filter((h: any) => h.year >= 1961 && h.year <= 1990);
    if (baselineData.length === 0) return { baselineMean: 0, baselineStdDev: 1 };
    
    const mean = baselineData.reduce((sum: number, h: any) => sum + h.maxTemp, 0) / baselineData.length;
    const anomalies = baselineData.map((h: any) => h.anomaly);
    const variance = anomalies.reduce((sum: number, val: number) => sum + val * val, 0) / anomalies.length;
    
    return { baselineMean: mean, baselineStdDev: Math.sqrt(variance) };
  }, [historical]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderZScoreDot = (props: any) => {
    const { cx, cy, payload, value } = props;
    if (value == null || cx == null || cy == null) return null;
    
    let anomaly = payload.anomaly;
    if (anomaly === undefined) {
       anomaly = value - baselineMean;
    }
    
    const zScore = Math.abs(anomaly / baselineStdDev);
    let dotColor = '#cbd5e1'; 
    if (zScore > 2) dotColor = '#dc2626'; 
    else if (zScore > 1) dotColor = '#f59e0b';

    return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={dotColor} stroke="#0f172a" strokeWidth={1.5} />;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-amber-400 to-emerald-400 bg-clip-text text-transparent">
              Climate Change Dashboard
            </h1>
            <p className="text-slate-400 mt-2">Historical & Machine Learning Analysis for Pakistan (1961 - 2037)</p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-md flex items-center gap-4 shadow-lg">
              <div className="bg-orange-500/20 p-3 rounded-lg border border-orange-500/30">
                <Thermometer className="text-orange-400" size={24} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Extreme Peak Trend</p>
                <p className="text-2xl font-bold text-slate-100 mt-0.5">
                  {(metrics.peakTrendPerDecade ?? 0) > 0 ? '+' : ''}{metrics.peakTrendPerDecade ?? 0}°C 
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
                  {(metrics.maxTrendPerDecade ?? 0) > 0 ? '+' : ''}{metrics.maxTrendPerDecade ?? 0}°C 
                  <span className="text-xs font-normal text-slate-500"> / decade</span>
                </p>
              </div>
            </div>
          </div>
        </header>

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
          <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-lg w-fit">
          <button 
            onClick={() => setActiveTab('historical')}
            className={`px-4 py-2 rounded-md transition-all text-sm ${activeTab === 'historical' ? 'bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Historical Trends
          </button>
          <button 
            onClick={() => setActiveTab('anomalies')}
            className={`px-4 py-2 rounded-md transition-all text-sm ${activeTab === 'anomalies' ? 'bg-orange-500/20 text-orange-400 font-semibold border border-orange-500/30' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Temperature Anomalies
          </button>
          <button 
            onClick={() => setActiveTab('forecast')}
            className={`px-4 py-2 rounded-md transition-all text-sm ${activeTab === 'forecast' ? 'bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Machine Learning Forecast
          </button>
        </div>
        </div>

        {/* Content Area */}
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Chart Area */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md h-[520px]">
            {activeTab === 'historical' && (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Thermometer size={20} className="text-orange-400"/> Annual Average & Peak Extreme Temperatures
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
                      <Line type="monotone" dataKey="maxTemp" name="Annual Daily Mean Max" stroke="#ef4444" strokeWidth={2} dot={renderZScoreDot} activeDot={{ r: 8 }} />
                    )}
                    {showMin && (
                      <Line type="monotone" dataKey="minTemp" name="Annual Daily Mean Min" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 8 }} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}

            {activeTab === 'anomalies' && (
              <>
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><AlertTriangle size={20} className="text-orange-400"/> Max Temp Anomalies (vs 1961-1990)</h2>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={historical} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="year" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#cbd5e1" />
                    <Bar dataKey="anomaly" name="Anomaly">
                      {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        historical.map((entry: any, index: number) => {
                          const zScore = Math.abs(entry.anomaly / baselineStdDev);
                          let barColor = '#cbd5e1'; 
                          if (zScore > 2) barColor = '#dc2626'; 
                          else if (zScore > 1) barColor = '#f59e0b';

                          return <Cell key={`cell-${index}`} fill={barColor} />;
                        })
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}

            {activeTab === 'forecast' && (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <TrendingUp size={20} className="text-emerald-400"/> 20-Year Predictive Forecast
                  </h2>
                  <div className="flex flex-wrap gap-2 bg-slate-900/60 p-1 border border-slate-800 rounded-lg">
                    <button 
                      onClick={() => setShowPeak(!showPeak)} 
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all ${showPeak ? 'bg-orange-500/25 text-orange-300 border border-orange-500/30' : 'text-slate-500 hover:text-slate-400 border border-transparent'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${showPeak ? 'bg-orange-400 animate-pulse' : 'bg-slate-700'}`}></span>
                      Extreme Peak Max
                    </button>
                    <button 
                      onClick={() => setShowMax(!showMax)} 
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all ${showMax ? 'bg-red-500/25 text-red-300 border border-red-500/30' : 'text-slate-500 hover:text-slate-400 border border-transparent'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${showMax ? 'bg-red-400 animate-pulse' : 'bg-slate-700'}`}></span>
                      Mean Max Temp
                    </button>
                    <button 
                      onClick={() => setShowMin(!showMin)} 
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all ${showMin ? 'bg-blue-500/25 text-blue-300 border border-blue-500/30' : 'text-slate-500 hover:text-slate-400 border border-transparent'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${showMin ? 'bg-blue-400 animate-pulse' : 'bg-slate-700'}`}></span>
                      Mean Min Temp
                    </button>
                    <button 
                      onClick={() => setShowBands(!showBands)} 
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all ${showBands ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-400 border border-transparent'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${showBands ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`}></span>
                      90% CI Bands
                    </button>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height="88%">
                  <ComposedChart data={forecast} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="maxBandGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.03}/>
                      </linearGradient>
                      <linearGradient id="minBandGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.03}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="year" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {showBands && showMax && (
                      <Area type="monotone" dataKey="forecastMaxRange" stroke="none" fill="url(#maxBandGrad)" name="Max Temp 90% CI" />
                    )}
                    {showBands && showMin && (
                      <Area type="monotone" dataKey="forecastMinRange" stroke="none" fill="url(#minBandGrad)" name="Min Temp 90% CI" />
                    )}
                    {showMax && <ReferenceArea y1={baselineMean - baselineStdDev} y2={baselineMean + baselineStdDev} fill="#94a3b8" fillOpacity={0.15} />}
                    {showMax && <ReferenceLine y={baselineMean} stroke="#94a3b8" strokeDasharray="3 3" opacity={0.4} />}
                    
                    {showPeak && (
                      <Line type="monotone" dataKey="peakMaxTemp" name="Historical Peak Extreme Max" stroke="#f97316" strokeWidth={2} dot={{ r: 2.5, fill: '#f97316' }} />
                    )}
                    {showPeak && (
                      <Line type="monotone" dataKey="forecastPeak" name="Forecast Peak Extreme Max" stroke="#fb923c" strokeWidth={3} strokeDasharray="4 4" dot={{ r: 3, fill: '#fb923c' }} />
                    )}
                    {showMax && (
                      <Line type="monotone" dataKey="historicalMax" name="Historical Daily Mean Max" stroke="#ef4444" strokeWidth={2} dot={renderZScoreDot} />
                    )}
                    {showMax && (
                      <Line type="monotone" dataKey="forecastMax" name="Forecast Daily Mean Max" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" dot={renderZScoreDot} />
                    )}
                    {showMin && (
                      <Line type="monotone" dataKey="historicalMin" name="Historical Daily Mean Min" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    )}
                    {showMin && (
                      <Line type="monotone" dataKey="forecastMin" name="Forecast Daily Mean Min" stroke="#0ea5e9" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </>
            )}
          </div>

          {/* Explanation Area */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col">
            <h3 className="text-xl font-semibold mb-4 text-slate-100">Insights & Analysis</h3>
            
            {/* Markers Explanation (Common) */}
            <div className="mb-6 p-4 bg-slate-900/60 border border-slate-700/50 rounded-lg text-sm shadow-sm">
              <h4 className="text-slate-200 font-semibold mb-3">Chart Key & Baseline Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-slate-400">
                <div className="flex items-center gap-2"><span className="w-4 h-0.5 bg-orange-500"></span> <span><b>Extreme Peak Max:</b> Peak summer heat</span></div>
                <div className="flex items-center gap-2"><span className="w-4 h-0.5 bg-red-500"></span> <span><b>Mean Max Temp:</b> Daily average max</span></div>
                <div className="flex items-center gap-2"><span className="w-4 h-0.5 bg-blue-500"></span> <span><b>Min Temp:</b> Daily average min</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-600"></span> <span><b>Red Dot:</b> Extreme anomaly</span></div>
                <div className="flex items-center gap-2"><span className="w-4 h-0 border-t-2 border-slate-400 border-dashed"></span> <span><b>Dotted Line:</b> Baseline Mean</span></div>
                <div className="flex items-center gap-2"><span className="w-4 h-0 border-t-2 border-orange-500 border-dashed"></span> <span><b>Forecast Trend:</b> ML Projection</span></div>
              </div>
            </div>

            {activeTab === 'historical' && (
              <div className="space-y-4 text-slate-400 leading-relaxed">
                <p>
                  The historical dataset spans 1961 to 2017 across Pakistan weather stations.
                </p>
                <p>
                  We observe high inter-annual variability, with extreme peak temperatures regularly reaching <b>48°C – 52.6°C</b> in stations like Sibi and Nokkundi.
                </p>
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
                  <p className="text-blue-300 font-medium mb-1">The Baseline Corridor</p>
                  <p className="text-sm">The subtle shaded background band represents normal temperature bounds based on the 1961-1990 baseline mean (±1 std dev).</p>
                </div>
              </div>
            )}

            {activeTab === 'anomalies' && (
              <div className="space-y-4 text-slate-400 leading-relaxed">
                <p>
                  Temperature anomalies map how much warmer or cooler a specific year was compared to the 30-year baseline period (1961 - 1990).
                </p>
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <p className="text-slate-300 font-medium mb-3">Z-Score Color Baseline</p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-slate-300"></span> Neutral (|Z| ≤ 1)</li>
                    <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span> Mild variation (1 &lt; |Z| ≤ 2)</li>
                    <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#dc2626]"></span> Extreme anomaly (|Z| &gt; 2)</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'forecast' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Model Configuration</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                    <div>
                      <p className="text-slate-500">Selected Pipeline</p>
                      <p className="text-slate-200 font-semibold mt-0.5">Ensemble Auto-ML</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Cross-Validation</p>
                      <p className="text-slate-200 font-semibold mt-0.5">5-Fold TimeSeriesSplit</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">2037 Projected Temperature Bounds</h4>
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 p-3 rounded-lg border border-orange-500/20">
                      <p className="text-xs text-orange-400/80 font-medium">Extreme Peak Max Projection (2037)</p>
                      <div className="flex justify-between items-baseline mt-1">
                        <span className="text-xl font-bold text-orange-100">
                          {forecast && forecast.length > 0 ? `${forecast[forecast.length - 1].forecastPeak}°C` : 'N/A'}
                        </span>
                        <span className="text-xs text-orange-400">
                          Trend: {metrics.peakTrendPerDecade > 0 ? '+' : ''}{metrics.peakTrendPerDecade}°C/dec
                        </span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 p-3 rounded-lg border border-red-500/20">
                      <p className="text-xs text-red-400/80 font-medium">Daily Mean Max Projection (2037)</p>
                      <div className="flex justify-between items-baseline mt-1">
                        <span className="text-xl font-bold text-red-100">
                          {forecast && forecast.length > 0 ? `${forecast[forecast.length - 1].forecastMax}°C` : 'N/A'}
                        </span>
                        <span className="text-xs text-red-400">
                          90% CI: {forecast && forecast.length > 0 ? `[${forecast[forecast.length - 1].forecastMaxLower}°C - ${forecast[forecast.length - 1].forecastMaxUpper}°C]` : ''}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-blue-500/10 to-sky-500/10 p-3 rounded-lg border border-blue-500/20">
                      <p className="text-xs text-blue-400/80 font-medium">Daily Mean Min Projection (2037)</p>
                      <div className="flex justify-between items-baseline mt-1">
                        <span className="text-xl font-bold text-blue-100">
                          {forecast && forecast.length > 0 ? `${forecast[forecast.length - 1].forecastMin}°C` : 'N/A'}
                        </span>
                        <span className="text-xs text-blue-400">
                          90% CI: {forecast && forecast.length > 0 ? `[${forecast[forecast.length - 1].forecastMinLower}°C - ${forecast[forecast.length - 1].forecastMinUpper}°C]` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
