import React, { useState } from 'react';
import { useApp } from '../AppContext';
import {
  Menu,
  ChevronDown,
  Bell,
  Search,
  Users,
  Compass,
  Zap,
  TrendingDown
} from 'lucide-react';
import { mockUsers } from '../mockData';

interface HeaderProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ collapsed, setCollapsed }) => {
  const { currentUser, switchUser, expenses, logout } = useApp();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showBellDropdown, setShowBellDropdown] = useState(false);

  // Derive notifications from recent expenses or actions
  const pendingApprovalsCount = expenses.filter(e => e.status === 'Pending Manager' || e.status === 'Pending Finance').length;
  const returnedCount = expenses.filter(e => e.status === 'Returned' && e.employeeId === 'emp_1').length;

  const notifications = [
    ...(returnedCount > 0
      ? [
          {
            id: 'n1',
            title: 'Expense Returned',
            text: 'Your expense JW Marriott Dining Room was returned by Vikram Aditya.',
            type: 'warning'
          }
        ]
      : []),
    ...(pendingApprovalsCount > 0
      ? [
          {
            id: 'n2',
            title: 'Pending Action items',
            text: `You have ${pendingApprovalsCount} expenses awaiting review in approval queue.`,
            type: 'info'
          }
        ]
      : []),
    {
      id: 'n3',
      title: 'Welcome to Kenzo Kore',
      text: 'Your enterprise expense account is successfully set up.',
      type: 'success'
    }
  ];

  return (
    <header className="glass-panel sticky top-0 z-40 w-full border-b border-[#ffffff08] px-6 py-4 flex items-center justify-between h-20">
      <div className="flex items-center gap-4">
        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-white p-2 hover:bg-white/[0.04] rounded-lg transition-colors duration-200"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Workspace indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-gray-500">
          <span>WORKSPACE</span>
          <span className="w-1.5 h-1.5 rounded-full bg-brand-orange-500 animate-pulse" />
          <span className="text-gray-300 font-sans">KENZO INFOSYSTEMS PVT LTD</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Mock Search Palette */}
        <div className="hidden sm:flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-1.5 w-64 text-gray-400 focus-within:border-brand-purple-500/50 transition-colors duration-200">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search dashboard... (CMD+K)"
            className="bg-transparent border-none text-xs w-full placeholder-gray-500 text-white font-sans focus:ring-0"
            disabled
          />
        </div>

        {/* Bell Notification */}
        <div className="relative">
          <button
            onClick={() => setShowBellDropdown(!showBellDropdown)}
            className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all duration-200 relative"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-orange-500 shadow-md ring-2 ring-brand-purple-950" />
            )}
          </button>

          {showBellDropdown && (
            <div className="absolute right-0 mt-3 w-80 rounded-2xl glass-panel border border-[#ffffff0c] shadow-2xl p-4 space-y-3 z-50 text-left">
              <div className="flex justify-between items-center pb-2 border-b border-white/[0.05]">
                <h4 className="text-xs font-semibold text-white">Notifications</h4>
                <button className="text-[10px] text-brand-purple-400 hover:underline">Mark all read</button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs space-y-1 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          n.type === 'warning'
                            ? 'bg-amber-500'
                            : n.type === 'success'
                            ? 'bg-emerald-500'
                            : 'bg-indigo-500'
                        }`}
                      />
                      {n.title}
                    </div>
                    <p className="text-gray-400 font-sans leading-relaxed">{n.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Role Switcher Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-purple-900/30 to-brand-orange-950/10 border border-brand-purple-500/20 hover:border-brand-purple-500/40 rounded-xl px-3 py-1.5 text-xs text-white transition-all duration-200"
          >
            <Zap className="w-3.5 h-3.5 text-brand-orange-400 animate-bounce" />
            <span className="font-semibold hidden md:inline">Demo Switch Role</span>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-3 w-64 rounded-2xl glass-panel border border-[#ffffff0c] shadow-2xl overflow-hidden z-50">
              <div className="bg-white/[0.02] px-4 py-3 border-b border-white/[0.05]">
                <h3 className="text-xs font-semibold text-brand-orange-400 tracking-wider uppercase">
                  Select User Context
                </h3>
                <p className="text-[10px] text-gray-500 font-sans mt-0.5">
                  Dynamically test role configurations and approval permissions.
                </p>
              </div>
              <div className="p-1.5">
                {mockUsers.map(user => {
                  const isSelected = currentUser?.id === user.id;
                  return (
                    <button
                      key={user.id}
                      onClick={() => {
                        switchUser(user.id);
                        setShowUserDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-150 ${
                        isSelected ? 'bg-brand-purple-900/40 text-white border border-brand-purple-500/20' : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
                      }`}
                    >
                      <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold truncate leading-tight">{user.name}</span>
                        <span className="text-[9px] text-gray-500 font-sans truncate">{user.designation} • {user.role}</span>
                      </div>
                    </button>
                  );
                })}
                <div className="border-t border-white/[0.05] mt-1.5 pt-1.5">
                  <button
                    onClick={() => {
                      logout();
                      setShowUserDropdown(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 font-bold transition-all"
                  >
                    Terminate Session (Logout)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
