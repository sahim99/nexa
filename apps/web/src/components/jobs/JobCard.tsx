'use client';

import React from 'react';
import { JobItem } from '../../lib/api-client';
import { Building2, MapPin, ExternalLink, CheckCircle2, AlertCircle, XCircle, Send } from 'lucide-react';

interface JobCardProps {
  job: JobItem;
  onApply?: (job: JobItem) => void;
}

export function JobCard({ job, onApply }: JobCardProps) {
  const getBadgeStyle = (decision?: string) => {
    switch (decision) {
      case 'APPLY':
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          label: 'AUTO-APPLY'
        };
      case 'REVIEW':
        return {
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          label: 'NEEDS REVIEW'
        };
      case 'SKIP':
        return {
          bg: 'bg-slate-500/15 border-slate-500/30 text-slate-400',
          icon: <XCircle className="w-3.5 h-3.5" />,
          label: 'SKIPPED'
        };
      case 'APPLIED':
        return {
          bg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
          icon: <Send className="w-3.5 h-3.5" />,
          label: 'APPLIED'
        };
      default:
        return {
          bg: 'bg-slate-800 border-slate-700 text-slate-300',
          icon: null,
          label: decision || 'PENDING'
        };
    }
  };

  const badge = getBadgeStyle(job.decision);
  const score = job.score ?? 80;

  return (
    <div className="group rounded-xl border border-slate-800/80 bg-[#060c18]/90 p-5 hover:border-cyan-500/40 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-950/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-medium text-slate-300 text-sm flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {job.company}
            </span>
            {job.companyStage && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase tracking-wider font-mono">
                {job.companyStage}
              </span>
            )}
          </div>
          <h4 className="text-base font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors">
            {job.title}
          </h4>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {job.location || 'Remote'}
            </span>
          </div>
        </div>

        {/* Score & Decision Badge */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-slate-400">Match</span>
            <span className={`text-base font-bold font-mono ${score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-slate-400'}`}>
              {score}%
            </span>
          </div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.bg}`}>
            {badge.icon}
            {badge.label}
          </span>
        </div>
      </div>

      {/* Match Reason */}
      {job.reason && (
        <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60 mt-3 line-clamp-2">
          <span className="text-cyan-400 font-medium">Evaluation: </span>
          {job.reason}
        </p>
      )}

      {/* Skills Chips */}
      {job.skills && job.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3.5">
          {job.skills.slice(0, 5).map((skill, idx) => (
            <span
              key={idx}
              className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 border border-slate-700/50"
            >
              {skill}
            </span>
          ))}
          {job.skills.length > 5 && (
            <span className="text-[11px] px-1.5 py-0.5 text-slate-400">
              +{job.skills.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/80">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
        >
          View Posting
          <ExternalLink className="w-3 h-3" />
        </a>

        {job.decision === 'APPLY' && onApply && (
          <button
            onClick={() => onApply(job)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition-colors shadow-sm shadow-emerald-500/20"
          >
            Deploy Application
          </button>
        )}
      </div>
    </div>
  );
}
