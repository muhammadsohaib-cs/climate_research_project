"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Thermometer, Globe, Database, Cpu, ArrowRight, Check, Layers, BarChart3 } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pt-28 pb-20 transition-colors duration-200">
      
      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-cyan-700 dark:text-cyan-400 shadow-sm">
          <Globe className="w-3.5 h-3.5" />
          <span>ABOUT PAKISTAN CLIMATE RESEARCH PROJECT</span>
        </div>

        <div className="max-w-3xl space-y-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            Scientific Methodology & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-amber-500 to-rose-600 dark:from-orange-400 dark:via-amber-300 dark:to-rose-500">
              Climate Data Engineering
            </span>
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
            The Pakistan Climate Research Observatory provides an empirical analysis of daily climate records across Pakistan. By combining rigorous data prep, anomaly calculations, and machine learning models, the project models historical trends and forecasts future climate trajectories through 2037.
          </p>
        </div>

        {/* Hero Visual Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-md">
            <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden">
              <Image
                src="/images/pmd_weather_station.png"
                alt="Meteorological Station Observatory in Pakistan"
                fill
                className="object-cover"
              />
            </div>
            <div className="p-3 text-xs font-mono">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">STATION TELEMETRY</span>
              <span className="text-slate-900 dark:text-white font-bold">PMD Observatories (1961–2017)</span>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-md">
            <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden">
              <Image
                src="/images/pakistan_glacier_heatwave.png"
                alt="Pakistan Regional Climate Landscape"
                fill
                className="object-cover"
              />
            </div>
            <div className="p-3 text-xs font-mono">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">ENVIRONMENTAL ZONES</span>
              <span className="text-orange-600 dark:text-orange-400 font-bold">Glacial Basins to Indus Heatwave Plains</span>
            </div>
          </div>
        </div>
      </section>

      {/* METHODOLOGY PIPELINE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <span className="px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-orange-600 dark:text-orange-400 shadow-sm">
            RESEARCH PIPELINE
          </span>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Data Cleaning & Machine Learning Workflow
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Detailed breakdown of our python data prep (`data_prep.py`), trend analysis, and model forecasting (`ml_analysis.py`).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-3 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-orange-600 dark:text-orange-400 font-mono font-bold text-xs">
              01
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Data Cleaning & Quality Control</h3>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              Standardized column structures, replaced invalid entries (`***`, `----`) with NaN, and filtered stations with &gt;15% missing data (dropping Chitral & Dir).
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-3 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-rose-600 dark:text-rose-400 font-mono font-bold text-xs">
              02
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Baseline Climatology Reference</h3>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              Calculated historical baseline averages for the standard 1961–1990 period to compute annual temperature anomalies (°C shift).
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-3 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-cyan-700 dark:text-cyan-400 font-mono font-bold text-xs">
              03
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Trend Quantification</h3>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              Extracted annual maximum (+0.191°C/dec) and minimum (-0.110°C/dec) temperature rates along with 10-year rolling averages.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-3 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs">
              04
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">ML Forecast (2017–2037)</h3>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              Trained Linear, Random Forest, XGBoost, and LightGBM models with 5-Fold TimeSeriesSplit cross-validation to project temperature series through 2037.
            </p>
          </div>

        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 text-center mt-20">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl space-y-4 shadow-md">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Explore the Pakistan Climate Dashboard</h2>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm max-w-md mx-auto">
            View interactive map layers, temperature anomaly charts, and location-specific forecasts.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition-colors shadow-md shadow-orange-600/20"
          >
            <span>Launch Dashboard Platform →</span>
          </Link>
        </div>
      </section>

    </div>
  );
}
