"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Thermometer, Menu, X, ArrowRight, Sun, Moon, BarChart3 } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Research & Methodology', href: '/solutions' },
    { name: 'About Project', href: '/about' },
    { name: 'Contact & Data Access', href: '/contact' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 py-3 shadow-md'
            : 'bg-white/70 dark:bg-slate-950/70 backdrop-blur-sm border-b border-slate-200/40 dark:border-slate-800/40 py-3.5 sm:py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            
            {/* Brand Logo */}
            <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-500/10 dark:bg-slate-900 border border-orange-500/30 dark:border-slate-800 flex items-center justify-center text-orange-600 dark:text-orange-500 group-hover:border-orange-500 transition-colors shadow-sm shrink-0">
                <Thermometer className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs sm:text-base tracking-tight text-slate-900 dark:text-white">
                    PAKISTAN <span className="text-orange-600 dark:text-orange-500">CLIMATE</span>
                  </span>
                </div>
                <span className="text-[8px] sm:text-[10px] tracking-wider text-slate-500 dark:text-slate-400 font-mono uppercase hidden xs:block">
                  Temperature Research Observatory
                </span>
              </div>
            </Link>

            {/* Navigation Links (Desktop: lg screens and up) */}
            <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-full px-3.5 py-1.5 backdrop-blur-md">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm border border-orange-500/30'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right Section: Dataset Badge + Theme Switcher + CTA (Desktop: lg screens and up) */}
            <div className="hidden lg:flex items-center gap-3">
              
              {/* Telemetry Dataset Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-slate-400 dark:text-slate-400">DATASET:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">1961–2037</span>
              </div>

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                aria-label="Toggle Theme"
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400" />
                )}
              </button>

              {/* Launch Dashboard Button */}
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-full bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs transition-all duration-200 flex items-center gap-1.5 shadow-md shadow-orange-600/20"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Launch Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mobile / Tablet Actions (Theme Toggle + Compact Dashboard + Hamburger Button) */}
            <div className="flex lg:hidden items-center gap-1.5 sm:gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-orange-600 transition-colors"
                aria-label="Toggle Theme"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
              </button>

              <Link
                href="/dashboard"
                className="px-3 py-1.5 text-xs font-semibold rounded-full bg-orange-600 hover:bg-orange-500 text-white shadow-sm transition-colors flex items-center gap-1"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Dashboard</span>
              </Link>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-orange-600 transition-colors"
                aria-label="Toggle Mobile Menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden px-3.5 sm:px-6 pt-3 pb-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl transition-all animate-in slide-in-from-top duration-200 shadow-2xl">
            <div className="max-w-7xl mx-auto space-y-3">
              
              {/* Telemetry Dataset Status Badge */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-slate-500 dark:text-slate-400">DATASET:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">1961–2037</span>
                </div>
                <span className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase">Live Telemetry</span>
              </div>

              {/* Navigation Link List */}
              <div className="flex flex-col space-y-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-between ${
                        isActive
                          ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                      }`}
                    >
                      <span>{link.name}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-orange-600 dark:bg-orange-400"></span>}
                    </Link>
                  );
                })}
              </div>

              {/* Drawer Controls */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <button
                  onClick={toggleTheme}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 hover:text-orange-600 transition-colors"
                >
                  {theme === 'light' ? (
                    <>
                      <Moon className="w-4 h-4" />
                      <span>Dark Mode</span>
                    </>
                  ) : (
                    <>
                      <Sun className="w-4 h-4 text-amber-400" />
                      <span>Light Mode</span>
                    </>
                  )}
                </button>

                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-center text-xs shadow-md flex items-center justify-center gap-1.5 transition-colors"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Launch Dashboard →</span>
                </Link>
              </div>

            </div>
          </div>
        )}
      </header>

      {/* Backdrop overlay for mobile menu */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}
    </>
  );
}

