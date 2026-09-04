"use client";
import { Landmark, ShieldCheck, Zap } from 'lucide-react';

export default function Header() {
  return (
    <header className="h-[68px] flex justify-between items-center px-6 py-4 bg-surface border-b border-outline-variant z-10 sticky top-0 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shadow-sm ring-1 ring-blue-400/30">
          <Landmark size={20} className="text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline-sm text-[17px] font-bold text-white leading-tight">Extrato Inteligente</h1>
            <span className="px-2 py-0.5 bg-[#1A2B47] border border-[#3B82F6]/30 text-[#60A5FA] rounded text-[10px] font-bold uppercase tracking-wider">
              Conversor PDF
            </span>
          </div>
          <p className="font-body-sm text-[12px] text-slate-400 hidden sm:block">Conversão nativa de extratos bancários com IA para Excel e CSV</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 bg-[#0B1628] border border-border-subtle px-3 py-1.5 rounded text-[11px] text-slate-300">
          <Zap size={14} className="text-amber-400" />
          <span>OCR & Reconstrução Ativa</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300 bg-[#0F1D32] border border-border-subtle px-2.5 py-1.5 rounded text-[12px]">
          <ShieldCheck size={16} className="text-emerald-400" />
          <span className="hidden sm:inline font-medium">Ambiente Seguro</span>
        </div>
      </div>
    </header>
  );
}

