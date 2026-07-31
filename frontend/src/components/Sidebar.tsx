import React from 'react';
import { useApp } from '../AppContext';
import { KenzoLogo } from './KenzoLogo';
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

  if (!currentUser) return null;

  const navItems = currentUser?.role === 'Employee' ? employeeNavItems : adminNavItems;

  return (
    <aside
      className={`glass-panel border-r border-[#ffffff0a] flex flex-col transition-all duration-300 
      fixed inset-y-0 left-0 z-50 md:sticky md:top-0 h-screen bg-[#090A0F]/95 md:bg-transparent backdrop-blur-md md:backdrop-blur-none
      ${collapsed ? '-translate-x-full md:translate-x-0 md:w-20' : 'translate-x-0 w-64'} 
      shrink-0`}
    >
      {/* Brand Logo */}
      <div className="p-5 flex items-center gap-3 border-b border-[#00C8FF]/15 overflow-hidden">
        <KenzoLogo size={36} className="w-9 h-9" />
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-extrabold text-white font-sans tracking-widest leading-none text-base">
              KENZO
            </span>
            <span className="text-[9px] text-[#00C8FF] font-semibold tracking-widest uppercase mt-0.5">
              INFOSYSTEMS
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentTab(item.id);
                if (window.innerWidth < 768) setCollapsed(true);
              }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 group relative cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#00A3FF]/20 via-[#00C8FF]/10 to-transparent border border-[#00C8FF]/30 text-white font-semibold shadow-[0_0_15px_rgba(0,163,255,0.15)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${
                  isActive ? 'text-[#00C8FF]' : 'text-gray-400 group-hover:text-[#00C8FF]'
                }`}
              />
              {!collapsed && <span className="text-xs font-sans tracking-wide">{item.name}</span>}

              {/* Active Indicator Pin */}
              {isActive && (
                <div className="absolute right-0 top-1/4 bottom-1/4 w-1 bg-gradient-to-b from-[#00A3FF] to-[#00E0FF] rounded-l-md shadow-[0_0_8px_#00C8FF]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Quick Info */}
      <div className="p-4 border-t border-[#00C8FF]/10 overflow-hidden shrink-0">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-8 h-8 rounded-full object-cover border border-[#00C8FF]/30 shrink-0"
            style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px', maxWidth: '32px', maxHeight: '32px' }}
          />
          {!collapsed && (
            <div className="flex flex-col text-left min-w-0">
              <span className="text-xs font-bold text-white truncate">{currentUser.name}</span>
              <span className="text-[10px] text-[#00C8FF] uppercase tracking-wider truncate font-semibold">{currentUser.role}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
