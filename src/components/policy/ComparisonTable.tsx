import React from 'react';
import { PolicyComparison } from '../../types';
import { Check, Sparkles, Scale } from 'lucide-react';

interface ComparisonTableProps {
  comparison: PolicyComparison;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ comparison }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden my-8">
      {/* Table Header Banner */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-[#07529A]" />
          <h4 className="font-bold text-slate-900 text-base">
            Tabel Komparasi: {comparison.titleA} vs {comparison.titleB}
          </h4>
        </div>
        <span className="text-xs text-slate-500 hidden sm:inline">
          Perbedaan Prinsip Yuridis & Mekanisme
        </span>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/60">
              <th className="py-3.5 px-6 font-semibold text-slate-700 w-1/4">
                Aspek Pembeda
              </th>
              <th className="py-3.5 px-6 font-bold text-[#07529A] bg-blue-50/60 w-3/8 border-l border-r border-slate-200">
                {comparison.titleA}
              </th>
              <th className="py-3.5 px-6 font-bold text-slate-800 bg-amber-50/60 w-3/8">
                {comparison.titleB}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {comparison.rows.map((row, index) => (
              <tr
                key={index}
                className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40 hover:bg-slate-50 transition-colors'}
              >
                <td className="py-4 px-6 font-medium text-slate-900 align-top">
                  {row.attribute}
                </td>
                <td className="py-4 px-6 text-slate-700 leading-relaxed bg-blue-50/20 border-l border-r border-slate-100 align-top">
                  {row.itemA}
                </td>
                <td className="py-4 px-6 text-slate-700 leading-relaxed bg-amber-50/20 align-top">
                  {row.itemB}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Card View */}
      <div className="md:hidden divide-y divide-slate-200">
        {comparison.rows.map((row, index) => (
          <div key={index} className="p-4 space-y-3">
            <h5 className="font-semibold text-xs uppercase tracking-wider text-slate-500">
              {row.attribute}
            </h5>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs">
                <span className="font-bold text-[#07529A] block mb-1">
                  {comparison.titleA}
                </span>
                <p className="text-slate-700 leading-relaxed">{row.itemA}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100 text-xs">
                <span className="font-bold text-amber-900 block mb-1">
                  {comparison.titleB}
                </span>
                <p className="text-slate-700 leading-relaxed">{row.itemB}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
