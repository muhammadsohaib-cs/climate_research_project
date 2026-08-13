"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Send, CheckCircle2, Globe, Mail, MapPin, Thermometer, Database } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    org: '',
    category: 'Research Collaboration',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pt-24 sm:pt-28 pb-20 px-3.5 sm:px-0 transition-colors duration-200">
      
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* HEADER */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-cyan-700 dark:text-cyan-400 shadow-sm">
            <Mail className="w-3.5 h-3.5" />
            <span>CONTACT & DATA ACCESS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Pakistan Climate Research <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-amber-500 to-rose-600 dark:from-orange-400 dark:via-amber-300 dark:to-rose-500">
              Data Request & Collaboration
            </span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            Reach out to access station raw datasets (`cleaned_climate_data.csv`), discuss methodology, or request custom ML time-series forecasts for specific regions in Pakistan.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start max-w-5xl mx-auto">
          
          {/* LEFT: FORM */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl space-y-5 shadow-md">
            
            {submitted ? (
              <div className="p-8 bg-emerald-50 dark:bg-slate-950 border border-emerald-200 dark:border-slate-800 rounded-2xl text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Data Request Submitted</h3>
                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed max-w-md mx-auto">
                  Thank you for your interest in the Pakistan Climate Research Project. Our research team will get back to you shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  Submit Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Inquiry & Data Request Form</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono text-slate-600 dark:text-slate-400 block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Dr. Ahmed Khan"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 rounded-xl p-3 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono text-slate-600 dark:text-slate-400 block mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="ahmed@university.edu.pk"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 rounded-xl p-3 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono text-slate-600 dark:text-slate-400 block mb-1">Institution / Organization</label>
                    <input
                      type="text"
                      value={formData.org}
                      onChange={(e) => setFormData({ ...formData, org: e.target.value })}
                      placeholder="NUST / PMD / Climate Lab"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 rounded-xl p-3 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono text-slate-600 dark:text-slate-400 block mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white rounded-xl p-3 focus:outline-none focus:border-orange-500 font-semibold"
                    >
                      <option value="Research Collaboration">Academic Research Access</option>
                      <option value="Dataset Access">Raw Station CSV Data Access</option>
                      <option value="ML Forecasts">Machine Learning Model Specs</option>
                      <option value="General">General Inquiry</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-600 dark:text-slate-400 block mb-1">Message / Request Details</label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Specify station region or research data scope..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 rounded-xl p-3 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-600/20 transition-colors flex items-center justify-center gap-2"
                >
                  <span>Submit Request</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

          </div>

          {/* RIGHT: DETAILS */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-orange-600 dark:text-orange-500" />
                Pakistan Climate Research Desk
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                Direct queries regarding data pipelines, daily temperature metrics, precipitation aggregates, and ML forecast evaluations.
              </p>

              <div className="space-y-3 pt-2 text-xs font-mono">
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <Mail className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                  <span>research@climate-pakistan.org</span>
                </div>
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                  <span>Islamabad, Pakistan</span>
                </div>
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <Database className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                  <span>PMD Dataset: 1961 – 2037</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl text-xs space-y-2 shadow-sm">
              <span className="text-orange-600 dark:text-orange-400 font-mono font-bold block text-[10px] uppercase">OPEN DATASET ACCESS</span>
              <h4 className="text-slate-900 dark:text-white font-bold">Open Climate Science</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                All cleaned station daily datasets and annual aggregation JSONs are formatted for research, academic, and climate policy use.
              </p>
            </div>

          </div>

        </div>

      </section>

    </div>
  );
}
