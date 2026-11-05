import React from 'react';

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      
      {/* Left Sidebar - Navigation & Workspaces */}
      <aside className="w-64 border-r border-gray-800 bg-[#0a0a0a] flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            NEXA V3
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <NavItem active label="Command Center" icon="⌘" />
          <NavItem label="Job Matches" icon="💼" />
          <NavItem label="Workflows" icon="⚡" />
          <NavItem label="Social (Human-in-Loop)" icon="🌐" />
          <NavItem label="Integrations" icon="🔌" />
        </nav>
        <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
          Status: shell only<br/>
          API: not queried here
        </div>
      </aside>

      {/* Center - Main Content Feed */}
      <main className="flex-1 flex flex-col bg-[#050505] overflow-y-auto">
        <header className="h-16 border-b border-gray-800 flex items-center px-8 justify-between">
          <h2 className="text-lg font-medium text-gray-200">Active Workflow: Daily Job Scan</h2>
          <div className="flex items-center space-x-4">
            <span className="px-3 py-1 bg-gray-900 text-gray-400 rounded-full text-xs font-mono border border-gray-800">
              NOT CONNECTED
            </span>
          </div>
        </header>

        <div className="p-8 space-y-6 flex-1">
          {/* Metrics Row */}
          <div className="bg-[#111] border border-gray-800 rounded-xl p-6 text-sm text-gray-300 space-y-3">
            <h3 className="text-gray-200 font-medium">This route is not connected to the API</h3>
            <p>
              Job counts and company names are not loaded here. The live pipeline, login, and collected jobs are on the home page.
            </p>
            <a href="/" className="inline-block text-cyan-400 hover:text-cyan-300">Open the command center</a>
          </div>
        </div>
      </main>

      {/* Right Sidebar - Nexa Chat & WebGL Orb */}
      <aside className="w-80 border-l border-gray-800 bg-[#0a0a0a] flex flex-col">
        {/* Orb Container (Placeholder for Three.js) */}
        <div className="h-64 border-b border-gray-800 flex items-center justify-center bg-black/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black" />
          <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-400 blur-[2px] animate-pulse flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.5)]">
            {/* Core */}
            <div className="w-24 h-24 rounded-full bg-black/50 backdrop-blur-sm border border-white/10" />
          </div>
          <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-blue-400 font-mono">
            CHAT NOT WIRED
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <p className="text-sm text-gray-400">
            Assistant chat on this page does not call /v1/agent/interact. Use a signed-in client against that endpoint.
          </p>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-800 bg-[#050505]">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Command Nexa..." 
              className="w-full bg-[#111] border border-gray-700 rounded-lg py-2 px-4 text-sm focus:outline-none focus:border-blue-500 text-gray-200"
            />
            <button className="absolute right-2 top-2 text-gray-500 hover:text-white">
              🎤
            </button>
          </div>
        </div>
      </aside>

    </div>
  );
}

// Components
const NavItem = ({ active, label, icon }: { active?: boolean, label: string, icon: string }) => (
  <div className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${active ? 'bg-blue-600/10 text-blue-400' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}`}>
    <span>{icon}</span>
    <span className="text-sm font-medium">{label}</span>
  </div>
);
