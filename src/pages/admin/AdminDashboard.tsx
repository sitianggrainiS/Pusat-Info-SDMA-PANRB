import React from 'react';
import { usePolicy } from '../../context/PolicyContext';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { DataStorageManager } from '../../components/admin/DataStorageManager';
import { ROLE_DEFINITIONS } from '../../data/adminUsers';
import { getPolicyDisplayDate, sortPoliciesByInputDate } from '../../utils/dateUtils';
import {
  FileCheck2,
  Tags,
  Sparkles,
  ArrowRight,
  Eye,
  Edit,
  Clock,
  CheckCircle,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'motion/react';

export const AdminDashboard: React.FC = () => {
  const { policies, categories, sources, adminUser, navigateTo } = usePolicy();

  const publishedCount = policies.filter((p) => p.status === 'published').length;
  const draftCount = policies.filter((p) => p.status === 'draft').length;
  const reviewCount = policies.filter((p) => p.status === 'review').length;

  const stats = [
    {
      label: 'Kebijakan Terbit',
      value: publishedCount,
      sub: 'Dapat diakses publik',
      icon: CheckCircle,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200/80',
      accent: 'bg-emerald-500',
    },
    {
      label: 'Draf & Review',
      value: draftCount + reviewCount,
      sub: `${draftCount} draf, ${reviewCount} review`,
      icon: Clock,
      color: 'text-amber-800 bg-amber-50 border-amber-200/80',
      accent: 'bg-amber-500',
    },
    {
      label: 'Kategori Topik',
      value: categories.length,
      sub: 'Rumpun kepegawaian',
      icon: Tags,
      color: 'text-[#07529A] bg-blue-50 border-blue-200/80',
      accent: 'bg-[#07529A]',
    },
    {
      label: 'Dokumen Regulasi',
      value: sources.length,
      sub: 'Rujukan hukum JDIH',
      icon: FileCheck2,
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200/80',
      accent: 'bg-indigo-600',
    },
  ];

  return (
    <AdminLayout activeNav="dashboard">
      <div className="space-y-6 lg:space-y-8 max-w-6xl">
        {/* Role & Access Control (RBAC) Status Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#07529A] text-[#FFD84D] flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    {adminUser?.name || 'Administrator Terotorisasi'}
                  </h2>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border ${
                      adminUser?.role && ROLE_DEFINITIONS[adminUser.role]
                        ? ROLE_DEFINITIONS[adminUser.role].badgeColor
                        : 'bg-blue-50 text-[#07529A] border-blue-200'
                    }`}
                  >
                    {adminUser?.roleTitle ||
                      (adminUser?.role && ROLE_DEFINITIONS[adminUser.role]?.name) ||
                      'Super Admin'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 break-words">
                  {adminUser?.department || 'Kedeputian Bidang SDM Aparatur - Kementerian PANRB'} ·{' '}
                  <span className="font-mono text-slate-600">{adminUser?.email}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {stats.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-[0_12px_28px_-10px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-150 flex items-center justify-between gap-3"
              >
                <div className={`absolute inset-x-0 top-0 h-1 ${s.accent}`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500">{s.label}</p>
                  <p className="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
                    {s.value}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">{s.sub}</p>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${s.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Action Banner for AI Assistant */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#07529A] via-[#0B3C75] to-[#0B1528] rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-[#FFD84D] text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Alur Cepat Draf Kebijakan</span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
              Unggah Peraturan Baru & Ekstrak Intisari dengan AI
            </h3>
            <p className="text-xs sm:text-[13px] text-blue-100/90 leading-relaxed">
              Asisten AI menganalisis teks regulasi (PermenPANRB / SE BKN) untuk menyusun draf ringkasan ramah publik, perbandingan konsep, dan FAQ sebelum Anda tinjau dan publikasikan.
            </p>
          </div>

          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigateTo({ name: 'admin-ai-assistant' })}
            className="shrink-0 self-start md:self-auto px-5 py-3 rounded-xl bg-[#FFD84D] hover:bg-[#ffe066] text-[#07529A] font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <span>Buka AI Document Assistant</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </motion.button>
        </div>

        {/* Permanent Repository Storage & Backup Management */}
        <DataStorageManager />

        {/* Recently Updated Policies Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-200/80 flex items-center justify-between gap-2">
            <h3 className="font-bold text-slate-900 text-sm">
              Konten Kebijakan Terkini
            </h3>
            <button
              type="button"
              onClick={() => navigateTo({ name: 'admin-content' })}
              className="text-xs font-bold text-[#07529A] hover:underline cursor-pointer tabular-nums"
            >
              Kelola Semua ({policies.length})
            </button>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-5 sm:px-6">Judul Kebijakan</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Tanggal Rilis</th>
                  <th className="py-3.5 px-5 sm:px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortPoliciesByInputDate(policies, 'newest')
                  .slice(0, 5)
                  .map((pol) => {
                    const cat = categories.find((c) => c.id === pol.categoryId);
                  return (
                    <tr key={pol.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5 sm:px-6 font-semibold text-slate-900 max-w-xs truncate">
                        {pol.title}
                        {pol.aiAssisted && (
                          <span className="ml-2 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-semibold">
                            AI
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{cat?.name || '-'}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                            pol.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : pol.status === 'review'
                              ? 'bg-blue-50 text-[#07529A] border border-blue-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {pol.status === 'published'
                            ? 'Terbit'
                            : pol.status === 'review'
                            ? 'Review'
                            : 'Draf'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 tabular-nums whitespace-nowrap">
                        {getPolicyDisplayDate(pol)}
                      </td>
                      <td className="py-3.5 px-5 sm:px-6 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => navigateTo({ name: 'policy-detail', slug: pol.slug })}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#07529A] hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Lihat Tampilan Publik"
                        >
                          <Eye className="w-4 h-4 inline" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigateTo({ name: 'admin-editor', policyId: pol.id })}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                          title="Edit Kebijakan"
                        >
                          <Edit className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
