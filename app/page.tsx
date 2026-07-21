"use client";

import React, { useState } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell,
  ComposedChart, Area
} from 'recharts';
import { TrendingUp, Thermometer, CloudRain, AlertTriangle } from 'lucide-react';
import climateData from './data/climate.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
        <p className="text-slate-300 font-semibold mb-2">{label}</p>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((entry: any, index: number) => {
          let valStr = `${entry.value}°C`;
          if (Array.isArray(entry.value)) {
            valStr = `${entry.value[0]}°C - ${entry.value[1]}°C`;
          }
          return (
            <p key={index} style={{ color: entry.color || '#cbd5e1' }} className="text-sm">
              {entry.name}: {valStr}
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
  const [showMax, setShowMax] = useState(true);
  const [showMin, setShowMin] = useState(true);
  const [showBands, setShowBands] = useState(true);

  // Ensure data exists for safety
  const locationData = climateData.data[selectedLocation as keyof typeof climateData.data] || climateData.data['National'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { historical, forecast, metrics } = locationData as any;
  const locations = climateData.locations;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Climate Change Dashboard
            </h1>
            <p className="text-slate-400 mt-2">Analysis of Pakistan&apos;s weather stations (1961 - 2037)</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-md flex items-center gap-4">
              <div className="bg-red-500/20 p-3 rounded-lg">
                <TrendingUp className="text-red-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-400">Max Temp Trend</p>
                <p className="text-2xl font-bold text-slate-100">
                  {metrics.maxTrendPerDecade > 0 ? '+' : ''}{metrics.maxTrendPerDecade}°C 
                  <span className="text-sm font-normal text-slate-500"> / decade</span>
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
          {/* Location Selector */}
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-lg backdrop-blur-md">
            <label className="text-slate-400 font-medium px-2">Location:</label>
            <select 
              value={selectedLocation} 
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2"
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
            className={`px-4 py-2 rounded-md transition-all ${activeTab === 'historical' ? 'bg-blue-500/20 text-blue-400 font-medium' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Historical Trends
          </button>
          <button 
            onClick={() => setActiveTab('anomalies')}
            className={`px-4 py-2 rounded-md transition-all ${activeTab === 'anomalies' ? 'bg-orange-500/20 text-orange-400 font-medium' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Temperature Anomalies
          </button>
          <button 
            onClick={() => setActiveTab('forecast')}
            className={`px-4 py-2 rounded-md transition-all ${activeTab === 'forecast' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Machine Learning Forecast
          </button>
        </div>
        </div>

        {/* Content Area */}
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Chart Area */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md h-[500px]">
            {activeTab === 'historical' && (
              <>
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><Thermometer size={20} className="text-blue-400"/> Average Annual Temperatures</h2>
                <ResponsiveContainer width="100%" height="90%">
                  <LineChart data={historical} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="year" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="maxTemp" name="Max Temp" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="minTemp" name="Min Temp" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 8 }} />
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
                        historical.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.anomaly > 0 ? '#ef4444' : '#3b82f6'} />
                        ))
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
                      onClick={() => setShowMax(!showMax)} 
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all ${showMax ? 'bg-red-500/25 text-red-300 border border-red-500/30' : 'text-slate-500 hover:text-slate-400 border border-transparent'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${showMax ? 'bg-red-400 animate-pulse' : 'bg-slate-700'}`}></span>
                      Max Temp
                    </button>
                    <button 
                      onClick={() => setShowMin(!showMin)} 
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all ${showMin ? 'bg-blue-500/25 text-blue-300 border border-blue-500/30' : 'text-slate-500 hover:text-slate-400 border border-transparent'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${showMin ? 'bg-blue-400 animate-pulse' : 'bg-slate-700'}`}></span>
                      Min Temp
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
                    {showMax && (
                      <Line type="monotone" dataKey="historicalMax" name="Historical Max" stroke="#ef4444" strokeWidth={2} dot={false} />
                    )}
                    {showMax && (
                      <Line type="monotone" dataKey="forecastMax" name="Forecast Max" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                    )}
                    {showMin && (
                      <Line type="monotone" dataKey="historicalMin" name="Historical Min" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    )}
                    {showMin && (
                      <Line type="monotone" dataKey="forecastMin" name="Forecast Min" stroke="#0ea5e9" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </>
            )}
          </div>

          {/* Explanation Area */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <h3 className="text-xl font-semibold mb-4 text-slate-100">Insights & Analysis</h3>
            
            {activeTab === 'historical' && (
              <div className="space-y-4 text-slate-400 leading-relaxed">
                <p>
                  The historical data spans over half a century (1961 - 2017) across 11 key weather stations.
                </p>
                <p>
                  We observe high inter-annual variability, yet a steady upward trajectory in the maximum temperatures. This indicates a consistent shift towards a hotter climate overall.
                </p>
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-blue-300 font-medium">Notice how minimum temperatures have remained relatively stable compared to the sharp rise in maximums.</p>
                </div>
              </div>
            )}

            {activeTab === 'anomalies' && (
              <div className="space-y-4 text-slate-400 leading-relaxed">
                <p>
                  Temperature anomalies map how much warmer or cooler a specific year was compared to the 30-year baseline period (1961 - 1990).
                </p>
                <p>
                  The sea of red bars on the right side of the chart visually confirms that nearly every year since 1995 has been significantly hotter than the historical average.
                </p>
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <p className="text-orange-300 font-medium">This acceleration of positive anomalies is a primary hallmark of global warming.</p>
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
                    <div className="col-span-2 border-t border-slate-800 pt-2 mt-1">
                      <p className="text-slate-500">Integrated Driver Features</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="bg-slate-850 text-slate-300 px-1.5 py-0.5 rounded text-[10px] border border-slate-800">CO2 (ppm)</span>
                        <span className="bg-slate-850 text-slate-300 px-1.5 py-0.5 rounded text-[10px] border border-slate-800">Aerosols (SAOD)</span>
                        <span className="bg-slate-850 text-slate-300 px-1.5 py-0.5 rounded text-[10px] border border-slate-800">ENSO (ONI)</span>
                        <span className="bg-slate-850 text-slate-300 px-1.5 py-0.5 rounded text-[10px] border border-slate-800">Lags (t-1, t-2)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">2037 Projected Temperature Bounds</h4>
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 p-3 rounded-lg border border-red-500/20">
                      <p className="text-xs text-red-400/80 font-medium">Max Temp Projection</p>
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
                      <p className="text-xs text-blue-400/80 font-medium">Min Temp Projection</p>
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

                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs leading-relaxed text-slate-400">
                  <p className="text-emerald-300 font-medium mb-1">Decadal Trends</p>
                  Maximum temperatures are predicted to trend at <span className="text-slate-100 font-semibold">{metrics.maxTrendPerDecade > 0 ? '+' : ''}{metrics.maxTrendPerDecade}°C</span> per decade. Use the toggles to isolate trend lines and confidence bands for detailed validation.
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
