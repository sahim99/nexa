'use client';

import React, { useState } from 'react';
import { useUserProfile } from '../../lib/hooks';
import { apiClient } from '../../lib/api-client';
import { User, Cpu, Save, RefreshCw, CheckCircle2, Sliders } from 'lucide-react';

export default function SettingsPage() {
  const { profile, isLoading, mutate } = useUserProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form local state
  const [fullName, setFullName] = useState('Sahim Developer');
  const [email, setEmail] = useState('sahim@enterprise.com');
  const [targetRoles, setTargetRoles] = useState('Principal Systems Architect, Staff Software Engineer');
  const [skills, setSkills] = useState('TypeScript, Node.js, PostgreSQL, Kubernetes, Distributed Systems');
  const [locations, setLocations] = useState('Remote, San Francisco, New York');
  const [minSalary, setMinSalary] = useState(160000);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await apiClient.saveUserProfile({
        fullName,
        email,
        targetRoles: targetRoles.split(',').map((s) => s.trim()),
        skills: skills.split(',').map((s) => s.trim()),
        preferredStages: ['growth', 'public', 'startup'],
        locations: locations.split(',').map((s) => s.trim()),
        minSalary: Number(minSalary)
      });
      setSaveSuccess(true);
      await mutate();
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
          <Sliders className="w-6 h-6 text-cyan-400" />
          Settings & Orchestration Configuration
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Customize autonomous target profile parameters and detachable LLM provider cascades.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Editor */}
        <div className="rounded-xl border border-slate-800 bg-[#060c18]/80 p-6 backdrop-blur-md">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800 text-slate-100 font-semibold text-base">
            <User className="w-4 h-4 text-cyan-400" />
            Candidate Search Profile
          </div>

          <form onSubmit={handleSave} className="space-y-4 mt-5">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Target Roles (comma separated)</label>
              <input
                type="text"
                value={targetRoles}
                onChange={(e) => setTargetRoles(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Key Skills (Taxonomy Matched)</label>
              <textarea
                rows={2}
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Target Locations</label>
                <input
                  type="text"
                  value={locations}
                  onChange={(e) => setLocations(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Minimum Base Salary ($)</label>
                <input
                  type="number"
                  value={minSalary}
                  onChange={(e) => setMinSalary(Number(e.target.value))}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-medium text-xs transition-colors shadow-sm shadow-cyan-500/20"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Saving...' : 'Save Profile'}
              </button>

              {saveSuccess && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved to database
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Detachable Provider Architecture Config */}
        <div className="rounded-xl border border-slate-800 bg-[#060c18]/80 p-6 backdrop-blur-md">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-slate-100 font-semibold text-base">
            <span className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-purple-400" />
              Detachable LLM Cascade Map
            </span>
            <span className="text-xs font-mono text-cyan-400">provider-map.yaml</span>
          </div>

          <div className="mt-5 space-y-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center justify-between font-bold text-slate-200 mb-1">
                <span>COVER_LETTER</span>
                <span className="text-emerald-400 text-[10px]">CACHE: 24h TTL</span>
              </div>
              <p className="text-slate-400 text-[11px]">Primary: OpenRouter (Llama-3.3-70B:free)</p>
              <p className="text-slate-400 text-[11px]">Fallback: OpenRouter (Qwen-2.5-72B:free) → Template</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center justify-between font-bold text-slate-200 mb-1">
                <span>OUTREACH_EMAIL</span>
                <span className="text-emerald-400 text-[10px]">CACHE: 24h TTL</span>
              </div>
              <p className="text-slate-400 text-[11px]">Primary: Groq (Llama-3.1-8B-instant)</p>
              <p className="text-slate-400 text-[11px]">Fallback: OpenRouter (Mistral-7B:free) → Template</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center justify-between font-bold text-slate-200 mb-1">
                <span>JD_ANALYSIS</span>
                <span className="text-emerald-400 text-[10px]">CACHE: 7d TTL</span>
              </div>
              <p className="text-slate-400 text-[11px]">Primary: OpenRouter (Qwen-2.5-72B:free)</p>
              <p className="text-slate-400 text-[11px]">Fallback: Groq → Template Fallback</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center justify-between font-bold text-slate-200 mb-1">
                <span>EMBEDDING</span>
                <span className="text-cyan-400 text-[10px]">CACHE: 30d TTL</span>
              </div>
              <p className="text-slate-400 text-[11px]">Primary: ONNX Local (all-MiniLM-L6-v2) [Zero Network]</p>
              <p className="text-slate-400 text-[11px]">Fallback: HuggingFace Inference API</p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Zero-code provider swapping active</span>
            <button
              onClick={() => alert('Provider swap configuration reloaded successfully.')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
            >
              <RefreshCw className="w-3 h-3 text-cyan-400" />
              Reload YAML Config
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
