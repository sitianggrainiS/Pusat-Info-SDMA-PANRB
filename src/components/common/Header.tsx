import React, { useState, useEffect } from 'react';
import { usePolicy, AppRoute } from '../../context/PolicyContext';
import { KompakLogo } from './KompakLogo';
import { Search, Shield, Menu, X, ArrowRight, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSearch }) => {
  const { currentRoute, navigateTo, adminUser, logoutAdmin } = usePolicy();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isNavActive = (key: string) => {
    if (key === 'home' && currentRoute.name === 'home') return true;
    if (
      key === 'policies' &&
      (currentRoute.name === 'policies' ||
        currentRoute.name === 'policy-detail' ||
        currentRoute.name === 'categories' ||
        currentRoute.name === 'category-detail')
    )
      return true;
    if (key === 'about' && currentRoute.name === 'about') return true;
    return false;
  };

  const navItems = [
    { label: 'Beranda', route: { name: 'home' } as AppRoute, key: 'home' },
    { label: 'Jelajahi Konten', route: { name: 'policies' } as AppRoute, key: 'policies' },
    { label: 'Tentang', route: { name: 'about' } as AppRoute, key: 'about' },
  ];

  const handleNavClick = (route: AppRoute) => {
    navigateTo(route);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-all duration-200 border-b ${
          isScrolled
            ? 'bg-white/90 backdrop-blur-xl border-slate-200/90 shadow-[0_6px_24px_-8px_rgba(15,23,42,0.08)]'
            : 'bg-white/95 backdrop-blur-md border-slate-200/70'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 lg:gap-8 h-16">
            {/* Zone 1: Brand Logo */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => handleNavClick({ name: 'home' })}
              className="flex items-center cursor-pointer shrink-0 rounded-lg py-1"
              title="KOMPAK SDMA - Pusat Informasi Kebijakan SDM Aparatur"
            >
              <KompakLogo height={38} />
            </motion.button>

            {/* Zone 2: Primary Navigation with Smooth Active Indicator */}
            <nav
              aria-label="Navigasi Utama"
              className="hidden md:flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/70"
            >
              {navItems.map((item) => {
                const active = isNavActive(item.key);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleNavClick(item.route)}
                    className={`relative px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'text-[#07529A]'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="relative z-10">{item.label}</span>
                    {active && (
                      <motion.div
                        layoutId="activeNavPill"
                        className="absolute inset-0 bg-white rounded-lg shadow-xs border border-slate-200/80"
                        transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Zone 3: Search & Admin Actions */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (onOpenSearch) onOpenSearch();
                  else navigateTo({ name: 'search' });
                }}
                className="group flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-[#07529A] bg-slate-50 hover:bg-blue-50/60 px-3 sm:px-3.5 py-2 rounded-xl border border-slate-200/90 hover:border-[#07529A]/30 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0"
                title="Cari kebijakan (Ctrl+K)"
              >
                <Search className="w-4 h-4 text-slate-400 group-hover:text-[#07529A] transition-colors shrink-0" />
                <span className="hidden sm:inline">Cari kebijakan...</span>
                <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] text-slate-500 bg-white border border-slate-200 rounded-md font-mono shadow-2xs">
                  ⌘K
                </kbd>
              </motion.button>

              {adminUser ? (
                <div className="hidden sm:flex items-center gap-1.5">
                  <motion.button
                    type="button"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleNavClick({ name: 'admin-dashboard' })}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#07529A] rounded-xl hover:bg-[#053d73] transition-colors cursor-pointer shadow-xs whitespace-nowrap shrink-0"
                  >
                    <Shield className="w-3.5 h-3.5 text-[#FFD84D] shrink-0" />
                    <span>Admin Panel</span>
                  </motion.button>
                  <button
                    type="button"
                    onClick={logoutAdmin}
                    className="text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-2 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    title="Keluar dari mode admin"
                  >
                    Keluar
                  </button>
                </div>
              ) : (
                <motion.button
                  type="button"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleNavClick({ name: 'admin-login' })}
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-[#07529A] border border-slate-200/90 hover:border-[#07529A]/35 rounded-xl bg-white hover:bg-blue-50/40 transition-all duration-150 cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
                >
                  <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Portal Admin</span>
                </motion.button>
              )}

              {/* Mobile menu trigger */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden w-10 h-10 flex items-center justify-center text-slate-600 hover:text-[#07529A] hover:bg-slate-100 rounded-xl border border-transparent hover:border-slate-200 transition-colors cursor-pointer shrink-0"
                aria-label="Buka menu navigasi"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden overflow-hidden border-t border-slate-200/90 bg-white/98 backdrop-blur-xl px-4 py-4 space-y-3 shadow-xl relative z-50"
            >
              <nav className="flex flex-col space-y-1">
                {navItems.map((item) => {
                  const active = isNavActive(item.key);
                  return (
                    <button
                      type="button"
                      key={item.key}
                      onClick={() => handleNavClick(item.route)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm text-left transition-all cursor-pointer ${
                        active
                          ? 'bg-[#07529A]/8 text-[#07529A] font-bold border border-[#07529A]/15'
                          : 'text-slate-700 font-medium hover:bg-slate-50'
                      }`}
                    >
                      <span>{item.label}</span>
                      {active && <ArrowRight className="w-4 h-4 text-[#07529A]" />}
                    </button>
                  );
                })}
              </nav>

              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                {adminUser ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleNavClick({ name: 'admin-dashboard' })}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-[#07529A] rounded-xl hover:bg-[#053d73] transition-colors cursor-pointer shadow-xs"
                    >
                      <Shield className="w-4 h-4 text-[#FFD84D]" />
                      <span>Buka Dashboard Admin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        logoutAdmin();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    >
                      Keluar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleNavClick({ name: 'admin-login' })}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    <span>Masuk Portal Tim Konten</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Subtle Mobile Backdrop Overlay when menu is open */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-30 bg-slate-900/25 backdrop-blur-[2px] md:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
    </>
  );
};
