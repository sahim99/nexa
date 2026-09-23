import Link from 'next/link';
import { LayoutDashboard, ListTodo, History, Network, Settings, BrainCircuit } from 'lucide-react';

export function Sidebar() {
  const links = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { name: 'Active Tasks', icon: ListTodo, href: '/tasks' },
    { name: 'Approvals', icon: Network, href: '/approvals' },
    { name: 'Memory & Context', icon: BrainCircuit, href: '/memory' },
    { name: 'History', icon: History, href: '/history' },
    { name: 'Settings', icon: Settings, href: '/settings' },
  ];

  return (
    <div className="w-64 h-full border-r border-white/10 bg-white/[0.02] backdrop-blur-md flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <div className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          <BrainCircuit className="w-6 h-6 text-blue-400" />
          Nexa AI
        </div>
      </div>
      
      <div className="flex-1 py-6 flex flex-col gap-2 px-3">
        {links.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
          >
            <link.icon className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
            {link.name}
          </Link>
        ))}
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
          <p className="text-xs font-semibold text-blue-400 mb-1">System Status</p>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse" />
            All Agents Online
          </div>
        </div>
      </div>
    </div>
  );
}
