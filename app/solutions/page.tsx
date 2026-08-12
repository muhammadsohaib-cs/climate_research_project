"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Thermometer, Database, Cpu, Globe, ArrowRight, LineChart as LineChartIcon } from 'lucide-react';

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pt-28 pb-20 transition-colors duration-200">
      
      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-orange-600 dark:text-orange-400 shadow-sm">
          <Database className="w-3.5 h-3.5" />
          <span>RESEARCH & METHODOLOGY</span>
        </div>

        <div className="max-w-3xl space-y-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            Pakistan Climate Research <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-amber-500 to-rose-600 dark:from-orange-400 dark:via-amber-300 dark:to-rose-500">
              Data Pipeline & ML Architecture
            </span>
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
            Detailed documentation of the data pipeline, data cleaning procedures, baseline anomaly definitions, and machine learning models used to forecast climate trends in Pakistan.
          </p>
        </div>

        {/* Feature Graphic */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-xl">
          <div className="relative aspect-[21/9] w-full rounded-xl overflow-hidden">
            <Image
              src="/images/pakistan_temperature_chart_preview.png"
              alt="Pakistan Temperature Forecast & Anomaly Research Chart"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent"></div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">VISUALIZATION ENGINE</span>
              <span className="text-slate-900 dark:text-white font-bold">Historical Anomaly & ML Forecast Plotter</span>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>Inspect Interactive Charts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* DETAILED SECTIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20 space-y-8">
        
        {/* Section 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-mono text-orange-600 dark:text-orange-400">
            <Database className="w-4 h-4" />
            <span>PIPELINE STEP 01</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Data Cleaning & Preprocessing (`data_prep.py`)</h3>
          <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
            The raw data originates from PMD daily station records. We structure columns for Maximum Temperature, Minimum Temperature, and Precipitation across all stations. Missing data (`***` and `----`) are replaced with NaNs, and stations with &gt;15% missing data (e.g. Chitral and Dir) are dropped to maintain baseline integrity. Time-based interpolation is applied to impute missing daily values.
          </p>
        </div>

        {/* Section 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-mono text-rose-600 dark:text-rose-400">
            <LineChartIcon className="w-4 h-4" />
            <span>PIPELINE STEP 02</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Baseline Climatology & Anomaly Calculations</h3>
          <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
            Using the standard 1961–1990 climatological baseline period, temperature anomalies are computed annually. 10-year rolling averages are computed to smooth short-term annual oscillations and reveal macro trends.
          </p>
        </div>

        {/* Section 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-700 dark:text-cyan-400">
            <Cpu className="w-4 h-4" />
            <span>PIPELINE STEP 03</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Machine Learning Forecasting (`ml_analysis.py`)</h3>
          <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
            We evaluate multiple regressors: Linear Regression (for robust non-overfitting trend extrapolation), LightGBM, XGBoost, and Random Forest. 5-Fold TimeSeriesSplit cross-validation is used to evaluate CV RMSE and CV MAE metrics, generating forecasts from 2017 through 2037.
          </p>
        </div>

      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 text-center mt-20">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl space-y-4 shadow-md">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Open the Interactive Analytics Dashboard</h2>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm max-w-md mx-auto">
            Interact with the actual data tables, location dropdowns, map visualization, and ML forecast curves.
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
