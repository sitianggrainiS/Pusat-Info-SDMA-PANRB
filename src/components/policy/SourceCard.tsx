import React from 'react';
import { SourceDocument } from '../../types';
import { FileText, ExternalLink, ShieldCheck } from 'lucide-react';

interface SourceCardProps {
  source: SourceDocument;
}

export const SourceCard: React.FC<SourceCardProps> = ({ source }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs hover:border-[#07529A]/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#07529A] shrink-0 mt-0.5">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span className="font-semibold text-[#07529A]">
                {source.regulationType || 'Regulasi Resmi'}
              </span>
              <span aria-hidden="true">·</span>
              <span>Tahun {source.year}</span>
              {source.isVerified && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Terverifikasi JDIH
                  </span>
                </>
              )}
            </div>

            <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
              {source.title}
            </h4>

            {source.articles && (
              <p className="text-xs text-slate-600 mt-2 font-mono bg-slate-50 inline-block px-2 py-1 rounded border border-slate-200/60">
                Pasal Rujukan: {source.articles}
              </p>
            )}

            {source.description && (
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {source.description}
              </p>
            )}
          </div>
        </div>

        {source.fileUrl && (
          <a
            href={source.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#07529A] bg-blue-50 hover:bg-blue-100/80 rounded-lg transition-colors border border-blue-200/70"
            title="Buka dokumen resmi di JDIH"
          >
            <span>Lihat Dokumen Resmi</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
};
