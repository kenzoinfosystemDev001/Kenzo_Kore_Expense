import React from 'react';
import { useApp } from '../AppContext';
import {
  LayoutDashboard,
  Receipt,
  FileText,
  CheckSquare,
  BarChart3,
  Settings,
  ShieldCheck,
  CreditCard,
  History,
  TrendingUp
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const { currentTab, setCurrentTab, currentUser } = useApp();

  const employeeNavItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'expenses', name: 'My Expenses', icon: Receipt },
    { id: 'new-expense', name: 'New Expense', icon: FileText },
  ];

  const adminNavItems = [
    { id: 'dashboard', name: 'Overview', icon: LayoutDashboard },
    { id: 'expenses', name: 'Expense Database', icon: Receipt },
    { id: 'approvals', name: 'Approval Queue', icon: CheckSquare },
    { id: 'reimbursements', name: 'Reimbursements', icon: CreditCard },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
    { id: 'audit-logs', name: 'Audit Logs', icon: ShieldCheck },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  const navItems = currentUser.role === 'Employee' ? employeeNavItems : adminNavItems;

  return (
    <aside
      className={`glass-panel border-r border-[#ffffff0a] flex flex-col transition-all duration-300 
      fixed inset-y-0 left-0 z-50 md:sticky md:top-0 h-screen bg-[#090A0F]/95 md:bg-transparent backdrop-blur-md md:backdrop-blur-none
      ${collapsed ? '-translate-x-full md:translate-x-0 md:w-20' : 'translate-x-0 w-64'} 
      shrink-0`}
    >
      {/* Brand Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-[#ffffff08] overflow-hidden">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-purple-600 to-brand-orange-500 flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg">
          K
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-brand-purple-300 font-sans tracking-tight leading-none text-base">
              Kenzo Kore
            </span>
            <span className="text-[10px] text-brand-orange-400 font-medium tracking-widest uppercase mt-0.5">
              Expense
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? 'bg-gradient-to-r from-brand-purple-900/40 to-brand-purple-800/10 border border-brand-purple-500/20 text-white font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${
                  isActive ? 'text-brand-purple-400' : 'text-gray-400 group-hover:text-brand-purple-300'
                }`}
              />
              {!collapsed && <span className="text-sm font-sans tracking-wide">{item.name}</span>}

              {/* Active Indicator Pin */}
              {isActive && (
                <div className="absolute right-0 top-1/4 bottom-1/4 w-1 bg-gradient-to-b from-brand-purple-400 to-brand-orange-500 rounded-l-md" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Quick Info */}
      <div className="p-4 border-t border-[#ffffff08] overflow-hidden">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-10 h-10 rounded-full border border-brand-purple-500/20 object-cover shadow-sm ring-2 ring-brand-purple-900/30"
          />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white truncate leading-tight">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-gray-500 truncate mt-0.5 uppercase tracking-wide">
                {currentUser.role}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
