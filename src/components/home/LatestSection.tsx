import React from 'react';
import { usePolicy } from '../../context/PolicyContext';
import { PolicyCard } from '../policy/PolicyCard';
import { ArrowRight, Newspaper } from 'lucide-react';

export const LatestSection: React.FC = () => {
  const { policies, navigateTo } = usePolicy();
  const publishedPolicies = policies.filter((p) => p.status === 'published');

  return (
    <section className="py-16 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#07529A] uppercase tracking-wider mb-2">
              <Newspaper className="w-4 h-4" />
              <span>Publikasi Edukasi Terkini</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Informasi Terbaru
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-xl">
              Ulasan mendalam seputar topik kebijakan SDM Aparatur yang baru saja diterbitkan dan terhubung dengan infografis media sosial resmi.
            </p>
          </div>

          <button
            onClick={() => navigateTo({ name: 'policies' })}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#07529A] hover:text-[#053d73] transition-colors self-start sm:self-auto cursor-pointer"
          >
            <span>Lihat Semua Kebijakan</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {publishedPolicies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {publishedPolicies.map((policy) => (
              <PolicyCard key={policy.id} policy={policy} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <p className="text-slate-600 font-medium">Belum ada kebijakan yang dipublikasikan.</p>
          </div>
        )}
      </div>
    </section>
  );
};
