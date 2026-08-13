"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Thermometer, Database, Globe, Cpu, Check, ExternalLink } from 'lucide-react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/80 pt-14 pb-10 text-slate-600 dark:text-slate-400 text-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-10 border-b border-slate-200 dark:border-slate-800/80">
          
          {/* Col 1: Project Info */}
          <div className="lg:col-span-2 space-y-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 dark:bg-slate-900 border border-orange-500/30 dark:border-slate-800 flex items-center justify-center text-orange-600 dark:text-orange-500">
                <Thermometer className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                PAKISTAN <span className="text-orange-600 dark:text-orange-500">CLIMATE</span> OBSERVATORY
              </span>
            </Link>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm text-xs">
              A comprehensive climate research initiative analyzing historical temperature trends (1961–2017) across 35+ meteorological stations in Pakistan and forecasting future heat scenarios through 2037 using machine learning.
            </p>

            {/* Newsletter */}
            <div className="pt-2 space-y-2">
              <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-300 block">Subscribe to Climate Research Briefings</span>
              {subscribed ? (
                <div className="p-2.5 bg-emerald-50 dark:bg-slate-900 border border-emerald-200 dark:border-slate-800 rounded-lg text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <Check className="w-3.5 h-3.5" />
                  <span>Subscribed to research updates.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-sm">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Researcher or institutional email"
                    required
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500 flex-1"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 shadow-sm text-center"
                  >
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider font-mono">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Project Overview</Link></li>
              <li><Link href="/dashboard" className="text-orange-600 dark:text-orange-400 hover:underline font-semibold flex items-center gap-1">Launch Dashboard <ExternalLink className="w-2.5 h-2.5" /></Link></li>
              <li><Link href="/solutions" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Research & Methodology</Link></li>
              <li><Link href="/about" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">About Project</Link></li>
              <li><Link href="/contact" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Contact & Data Access</Link></li>
            </ul>
          </div>

          {/* Col 3: Dataset Attribution */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider font-mono">Dataset Sources</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5"><Database className="w-3 h-3 text-orange-600 dark:text-orange-400" /> PMD Weather Stations (35+)</li>
              <li className="flex items-center gap-1.5"><Globe className="w-3 h-3 text-orange-600 dark:text-orange-400" /> Baseline Corridor (1961–1990)</li>
              <li className="flex items-center gap-1.5"><Cpu className="w-3 h-3 text-orange-600 dark:text-orange-400" /> LightGBM & XGBoost Models</li>
              <li className="flex items-center gap-1.5"><Thermometer className="w-3 h-3 text-orange-600 dark:text-orange-400" /> Diurnal & Extreme Peak Records</li>
            </ul>
          </div>

          {/* Col 4: Key Research Specs */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider font-mono">Research Metrics</h4>
            <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3 rounded-xl space-y-2 text-xs font-mono shadow-sm">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span className="text-slate-500 dark:text-slate-400">Max Temp Rate:</span>
                <span className="text-orange-600 dark:text-orange-400 font-bold">+0.191°C/dec</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span className="text-slate-500 dark:text-slate-400">Min Temp Rate:</span>
                <span className="text-cyan-700 dark:text-cyan-400 font-bold">-0.110°C/dec</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Peak Record:</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">52.6°C (Jacobabad)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px] text-center sm:text-left">
          <div>
            © {new Date().getFullYear()} Pakistan Climate Change & Temperature Research Observatory.
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4">
            <Link href="/about" className="hover:text-slate-900 dark:hover:text-slate-300">Data Terms</Link>
            <Link href="/solutions" className="hover:text-slate-900 dark:hover:text-slate-300">Methodology Documentation</Link>
            <Link href="/contact" className="hover:text-slate-900 dark:hover:text-slate-300">Data Request</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
