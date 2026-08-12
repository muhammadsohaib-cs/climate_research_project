"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Thermometer, ArrowRight, BarChart3, Globe, Database, Cpu, TrendingUp, Check
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      
      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 overflow-hidden border-b border-slate-200 dark:border-slate-800/80">
        
        {/* Subtle Background Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-orange-600 dark:text-orange-400 shadow-sm">
                <Globe className="w-3.5 h-3.5" />
                <span>PAKISTAN CLIMATE RESEARCH PROJECT (1961 – 2037)</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-slate-900 dark:text-white">
                Historical Analysis & <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-amber-500 to-rose-600 dark:from-orange-400 dark:via-amber-300 dark:to-rose-500">
                  ML Temperature Forecasts for Pakistan
                </span>
              </h1>

              <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
                Analyzing historical meteorological telemetry across 35+ weather stations in Pakistan to extract climate warming trends, identify extreme heatwave records, and forecast temperature trajectories through 2037 using machine learning.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  href="/dashboard"
                  className="px-6 py-3.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold shadow-md shadow-orange-600/20 transition-all flex items-center gap-2 group"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Launch Interactive Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/solutions"
                  className="px-5 py-3.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-semibold transition-colors shadow-sm"
                >
                  Research & Methodology
                </Link>
              </div>

              {/* Empirical Quick Stats */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-3 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase">Historical Coverage</span>
                  <span className="text-slate-900 dark:text-white font-bold text-sm">1961 – 2017</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase">Warming Rate</span>
                  <span className="text-orange-600 dark:text-orange-400 font-bold text-sm">+0.191°C / dec</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase">Forecast Horizon</span>
                  <span className="text-cyan-700 dark:text-cyan-400 font-bold text-sm">2017 – 2037</span>
                </div>
              </div>

            </div>

            {/* Right Map Visual Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-xl">
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                  <Image
                    src="/images/pakistan_climate_map_preview.png"
                    alt="Pakistan Weather Station Network & Heat Anomaly GIS Map"
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent"></div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-rose-600 dark:text-rose-500" />
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">PEAK RECORD (JACOBABAD)</span>
                      <span className="text-rose-600 dark:text-rose-400 font-bold">52.6°C Recorded</span>
                    </div>
                  </div>
                  <Link href="/dashboard" className="text-orange-600 dark:text-orange-400 hover:underline font-bold text-[11px] flex items-center gap-1">
                    <span>Open Map</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 2: EMPIRICAL METRICS BAR */}
      <section className="bg-white dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-orange-600 dark:text-orange-400 font-mono">
                +0.191 °C
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Max Temp Rate per Decade</p>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-cyan-700 dark:text-cyan-400 font-mono">
                -0.110 °C
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Min Temp Rate per Decade</p>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                52.6 °C
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">All-Time Peak Recorded Heat</p>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                35+
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Weather Stations Analyzed</p>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 3: REAL DATASET & CHART PREVIEW */}
      <section className="py-20 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Visual Column */}
            <div className="lg:col-span-6">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-xl">
                <div className="relative aspect-[16/10] rounded-xl overflow-hidden">
                  <Image
                    src="/images/pakistan_temperature_chart_preview.png"
                    alt="Pakistan Annual Temperature & Anomaly Chart Preview"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent"></div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-600 dark:text-slate-400">BASELINE CORRIDOR: 1961 – 1990</span>
                  <span className="text-orange-600 dark:text-orange-400 font-bold">10-Year Rolling Mean</span>
                </div>
              </div>
            </div>

            {/* Text Column */}
            <div className="lg:col-span-6 space-y-5">
              <span className="px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-orange-600 dark:text-orange-400 shadow-sm">
                DATASET INSIGHTS
              </span>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Historical Trends & Machine Learning Forecasts
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                The dataset aggregates daily observational records from Pakistan Meteorological Department (PMD) stations across Pakistan. We calculate anomalies against the 1961–1990 baseline to observe macro climate shifts.
              </p>

              <div className="space-y-3 pt-2 text-xs text-slate-700 dark:text-slate-300">
                <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 shadow-sm">
                  <span className="font-bold text-slate-900 dark:text-white block">Maximum Temperature Trend (+0.191°C/dec)</span>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">Steady upward warming trajectory across Indus plain and coastal urban stations.</p>
                </div>

                <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 shadow-sm">
                  <span className="font-bold text-slate-900 dark:text-white block">Minimum Temperature Trend (-0.110°C/dec)</span>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">Cooling night-time minimum trend leading to widening diurnal temperature ranges.</p>
                </div>

                <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 shadow-sm">
                  <span className="font-bold text-slate-900 dark:text-white block">Ensemble ML Models (LightGBM, XGBoost, Random Forest)</span>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">Evaluated via 5-Fold TimeSeriesSplit cross-validation to project values up to 2037.</p>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/dashboard"
                  className="px-5 py-3 rounded-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all inline-flex items-center gap-2 shadow-md shadow-orange-600/20"
                >
                  <span>Explore Interactive Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* SECTION 4: STATION NETWORK & RESEARCH SCOPE */}
      <section className="py-20 bg-slate-100/60 dark:bg-slate-900/40 relative border-b border-slate-200 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-cyan-700 dark:text-cyan-400 shadow-sm">
              STATION COVERAGE
            </span>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              35+ Meteorological Observatories Across Pakistan
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Extensive spatial coverage across all climate zones in Pakistan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Region 1 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-700 dark:text-cyan-400">
                <Globe className="w-4 h-4" />
                <span>NORTHERN & MOUNTAIN ZONE</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Gilgit, Skardu, Astore, Chilas</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                Monitoring high-altitude temperature shifts, glacier melt risks, and diurnal thermal oscillations in Karakoram and Himalayan basins.
              </p>
            </div>

            {/* Region 2 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-mono text-rose-600 dark:text-rose-400">
                <Thermometer className="w-4 h-4" />
                <span>ARID & EXTREME HEAT ZONE</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Jacobabad, Nokkundi, Sibi, Dalbandin</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                Tracking extreme summer heat spikes where temperatures regularly cross 48°C to 52.6°C, representing severe heatwave vulnerability.
              </p>
            </div>

            {/* Region 3 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-mono text-orange-600 dark:text-orange-400">
                <BarChart3 className="w-4 h-4" />
                <span>URBAN & INDUS PLAINS ZONE</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Karachi, Islamabad, Lahore, Multan</h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                Evaluating urban heat island effects, summer seasonal means, and long-term population thermal exposure.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* SECTION 5: CTA BANNER */}
      <section className="py-16 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 rounded-3xl space-y-5 shadow-lg">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Launch the Interactive Climate Dashboard
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
              Select any station location, compare historical anomalies, view 10-year rolling averages, and inspect machine learning projections up to 2037.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="px-7 py-3.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/20 inline-flex items-center gap-2"
              >
                <span>Open Dashboard Platform →</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
