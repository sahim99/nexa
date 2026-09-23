'use client';

import React from 'react';
import { useAgentBoard } from '../../lib/hooks';
import { AgentCard } from '../../lib/api-client';
import { Activity, Bot, Cpu, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';

const LANES = [
  { id: 'DISCOVERY', title: '1. Discovery', icon: <Bot className="w-4 h-4 text-cyan-400" /> },
  { id: 'ENRICHMENT', title: '2. Enrichment', icon: <Cpu className="w-4 h-4 text-purple-400" /> },
  { id: 'DECISION', title: '3. Decision', icon: <Activity className="w-4 h-4 text-emerald-400" /> },
  { id: 'APPLICATION', title: '4. Application', icon: <Clock className="w-4 h-4 text-amber-400" /> },
  { id: 'OUTREACH', title: '5. Outreach', icon: <Bot className="w-4 h-4 text-blue-400" /> },
  { id: 'COMPLETED', title: '6. Completed', icon: <CheckCircle2 className="w-4 h-4 text-teal-400" /> }
] as const;

export function AgentKanban() {
  const { agents, isLoading } = useAgentBoard();

  const getAgentsInLane = (laneId: string): AgentCard[] => {
    return agents.filter((agent) => agent.lane === laneId);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'ALGORITHM':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'LLM':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'HYBRID':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'bg-cyan-500 text-slate-950 animate-pulse';
      case 'WAITING':
        return 'bg-amber-400 text-slate-950';
      case 'COMPLETED':
        return 'bg-emerald-400 text-slate-950';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Bot className="w-5 h-5 text-cyan-400" />
            Autonomous Agent Orchestration Matrix (LifeOS)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            6-stage pipelined agent lifecycle executing in parallel with permission isolation
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {LANES.map((lane) => {
          const laneAgents = getAgentsInLane(lane.id);

          return (
            <div
              key={lane.id}
              className="flex flex-col rounded-xl border border-slate-800/80 bg-[#060c18]/70 p-3 backdrop-blur-sm min-h-[300px]"
            >
              {/* Lane Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-200">
                  {lane.icon}
                  <span>{lane.title}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 font-mono text-slate-400">
                  {laneAgents.length}
                </span>
              </div>

              {/* Lane Cards */}
              <div className="flex flex-col gap-2.5 flex-1">
                {isLoading ? (
                  <div className="text-center py-6 text-xs text-slate-400 animate-pulse">
                    Syncing agents...
                  </div>
                ) : laneAgents.length === 0 ? (
                  <div className="text-center py-8 text-[11px] text-slate-400 border border-dashed border-slate-800/60 rounded-lg">
                    Idle
                  </div>
                ) : (
                  laneAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className="p-3 rounded-lg border border-slate-800 bg-[#040812] hover:border-cyan-500/30 transition-all shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${getStatusBadge(agent.status)}`}>
                          {agent.status}
                        </span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${getTypeBadge(agent.type)}`}>
                          {agent.type}
                        </span>
                      </div>

                      <h5 className="text-xs font-semibold text-slate-200 mb-1 leading-snug">
                        {agent.name}
                      </h5>

                      <p className="text-[10px] text-slate-400 line-clamp-2 bg-slate-900/50 p-1.5 rounded border border-slate-800/40">
                        {agent.lastActivity}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800/60 font-mono">
                        <span>Tasks</span>
                        <span className="text-slate-300 font-bold">{agent.tasksCompleted}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
