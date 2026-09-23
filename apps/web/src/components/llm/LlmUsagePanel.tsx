'use client';

import React from 'react';
import { useLlmStats } from '../../lib/hooks';
import { Cpu, Zap, Database, DollarSign, Layers } from 'lucide-react';

export function LlmUsagePanel() {
  const { stats, isLoading } = useLlmStats();

  return (
    <div className="rounded-xl border border-slate-800 bg-[#060c18]/80 p-6 backdrop-blur-md shadow-2xl">
      <div className="flex items-center justify-between pb-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-base">LLM & Algorithm Efficiency Engine</h3>
            <p className="text-xs text-slate-400">Deterministic fallback cascade & algorithm-first routing</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Zero-Cost Architecture
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        {/* Cache Hit Rate */}
        <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800/60">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Cache Hit Rate</span>
            <Database className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {isLoading ? '...' : `${stats.cacheHitRatePercent}%`}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.cacheHits} cached responses served
          </p>
        </div>

        {/* Algorithm Savings */}
        <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800/60">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Algorithm-First Share</span>
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {isLoading ? '...' : `${stats.algorithmPercentage}%`}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.algorithmSavedCalls} calls saved (<span className="text-emerald-300">&lt;5ms</span>)
          </p>
        </div>

        {/* Live LLM Calls */}
        <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800/60">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>LLM Calls Executed</span>
            <Layers className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {isLoading ? '...' : stats.totalCalls}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Free-tier routed across cascade
          </p>
        </div>

        {/* Total Cost */}
        <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800/60">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Compute Cost</span>
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            ${stats.totalCostUsd.toFixed(2)}
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-1">
            100% Free Tiers & Local Inference
          </p>
        </div>
      </div>

      {/* Provider Distribution Bar */}
      <div className="mt-5 pt-4 border-t border-slate-800/60">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Provider Cascade Routing Distribution</span>
          <span className="text-slate-300 font-mono text-[11px]">Groq · OpenRouter · Ollama · Template</span>
        </div>
        <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-slate-800">
          <div className="bg-cyan-500 transition-all" style={{ width: '40%' }} title="Groq: 40%" />
          <div className="bg-purple-500 transition-all" style={{ width: '35%' }} title="OpenRouter: 35%" />
          <div className="bg-emerald-500 transition-all" style={{ width: '15%' }} title="Ollama Local: 15%" />
          <div className="bg-slate-500 transition-all" style={{ width: '10%' }} title="Template Fallback: 10%" />
        </div>
        <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2 font-mono">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-500" /> Groq (Llama-3.1-8B)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /> OpenRouter (Llama-3.3-70B)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Ollama (Local)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500" /> Deterministic Template</span>
        </div>
      </div>
    </div>
  );
}
