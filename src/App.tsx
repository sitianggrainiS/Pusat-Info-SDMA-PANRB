/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { PolicyProvider, usePolicy } from './context/PolicyContext';
import { FirestoreErrorBoundary } from './components/common/FirestoreErrorBoundary';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { SearchModal } from './components/search/SearchModal';
import { HomePage } from './pages/HomePage';
import { PolicyListPage } from './pages/PolicyListPage';
import { PolicyDetailPage } from './pages/PolicyDetailPage';
import { CategoryListPage } from './pages/CategoryListPage';
import { CategoryDetailPage } from './pages/CategoryDetailPage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { AboutPage } from './pages/AboutPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminContentList } from './pages/admin/AdminContentList';
import { AdminContentEditor } from './pages/admin/AdminContentEditor';
import { AdminAIAssistant } from './pages/admin/AdminAIAssistant';
import { AdminCategoryManager } from './pages/admin/AdminCategoryManager';
import { AdminSourceManager } from './pages/admin/AdminSourceManager';
import { AdminAboutManager } from './pages/admin/AdminAboutManager';

function AppContent() {
  const {
    currentRoute,
    adminUser,
    isAuthReady,
    isDataStale,
    syncStatusMessage,
    isRetryingFirestore,
    retryFirestoreConnection,
  } = usePolicy();
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const isAdminRoute = currentRoute.name.startsWith('admin-') && currentRoute.name !== 'admin-login';

  // Ensure smooth scroll to top whenever route changes
  const routeKey =
    currentRoute.name +
    ('slug' in currentRoute && currentRoute.slug ? `:${currentRoute.slug}` : '') +
    ('policyId' in currentRoute && currentRoute.policyId ? `:${currentRoute.policyId}` : '');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [routeKey]);

  // Global keyboard shortcut Cmd+K / Ctrl+K to open search modal
  useEffect(() => {
    const handleGlobalSearchShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalSearchShortcut);
    return () => window.removeEventListener('keydown', handleGlobalSearchShortcut);
  }, []);

  if (isAdminRoute && !isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-slate-600 text-xs font-semibold">
        Memverifikasi sesi Firebase Authentication...
      </div>
    );
  }

  // Route Guard: enforce that only authenticated users with authorized role can access admin portal
  if (isAdminRoute && !adminUser) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
        <Header onOpenSearch={() => setSearchModalOpen(true)} />
        <main className="flex-1">
          <AdminLoginPage notice="Akses Terbatas: Anda harus masuk menggunakan akun kedinasan yang memiliki role otorisasi resmi untuk mengakses Portal Admin SDM Aparatur." />
        </main>
        <Footer />
        <SearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {!isAdminRoute && <Header onOpenSearch={() => setSearchModalOpen(true)} />}

      {!isAdminRoute && isDataStale && syncStatusMessage && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 lg:px-8 py-2 text-xs text-amber-950">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>{syncStatusMessage}</span>
            </div>
            <button
              type="button"
              disabled={isRetryingFirestore}
              onClick={() => retryFirestoreConnection()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[11px] transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3 h-3 ${isRetryingFirestore ? 'animate-spin' : ''}`} />
              <span>{isRetryingFirestore ? 'Menyinkronkan...' : 'Muat Ulang Data'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Dynamic View with Lightweight Compositor Route Transition */}
      <main className="flex-1 flex flex-col min-w-0">
        {isAdminRoute ? (
          (() => {
            switch (currentRoute.name) {
              case 'admin-dashboard':
                return <AdminDashboard />;
              case 'admin-content':
                return <AdminContentList initialTab={currentRoute.initialTab} />;
              case 'admin-editor':
                return <AdminContentEditor policyId={currentRoute.policyId} />;
              case 'admin-ai-assistant':
                return <AdminAIAssistant />;
              case 'admin-categories':
                return <AdminCategoryManager />;
              case 'admin-sources':
                return <AdminSourceManager />;
              case 'admin-about':
                return <AdminAboutManager />;
              default:
                return <AdminDashboard />;
            }
          })()
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={routeKey}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col"
            >
              {(() => {
                switch (currentRoute.name) {
                  case 'home':
                    return <HomePage onSearchFocus={() => setSearchModalOpen(true)} />;
                  case 'policies':
                    return <PolicyListPage initialCategoryFilter={currentRoute.categoryFilter} />;
                  case 'policy-detail':
                    return <PolicyDetailPage slug={currentRoute.slug} />;
                  case 'categories':
                    return <CategoryListPage />;
                  case 'category-detail':
                    return <CategoryDetailPage slug={currentRoute.slug} />;
                  case 'search':
                    return <SearchResultsPage initialQuery={currentRoute.query} />;
                  case 'about':
                    return <AboutPage />;
                  case 'admin-login':
                    return <AdminLoginPage />;
                  default:
                    return <HomePage onSearchFocus={() => setSearchModalOpen(true)} />;
                }
              })()}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {!isAdminRoute && <Footer />}

      {/* Global Quick Search Modal (Cmd+K / Ctrl+K) */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <FirestoreErrorBoundary>
      <PolicyProvider>
        <AppContent />
      </PolicyProvider>
    </FirestoreErrorBoundary>
  );
}
