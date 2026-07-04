"use client";

import React, { useState } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell 
} from 'recharts';
import { TrendingUp, Thermometer, CloudRain, AlertTriangle } from 'lucide-react';
import climateData from './data/climate.json';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('historical');
  const [selectedLocation, setSelectedLocation] = useState('National');

  // Ensure data exists for safety
  const locationData = climateData.data[selectedLocation as keyof typeof climateData.data] || climateData.data['National'];
  const { historical, forecast, metrics } = locationData as any;
  const locations = climateData.locations;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
          <p className="text-slate-300 font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}°C
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Climate Change Dashboard
            </h1>
            <p className="text-slate-400 mt-2">Analysis of Pakistan's weather stations (1961 - 2037)</p>
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
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-emerald-400"/> 20-Year Predictive Forecast</h2>
                <ResponsiveContainer width="100%" height="90%">
                  <LineChart data={forecast} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="year" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="historicalMax" name="Historical Max" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="forecastMax" name="Forecast Max" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                  </LineChart>
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
              <div className="space-y-4 text-slate-400 leading-relaxed">
                <p>
                  Using machine learning regression models, we projected the historical patterns into the future (2018 - 2037).
                </p>
                <p>
                  The dashed orange line represents the forecasted maximum temperatures. The model predicts a continuation of the +0.292°C per decade trend.
                </p>
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-emerald-300 font-medium">If this trend holds, by 2037 average maximum temperatures will routinely sit nearly 1°C higher than the 1961 baseline.</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
