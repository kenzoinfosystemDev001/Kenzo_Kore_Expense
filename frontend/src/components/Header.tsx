import React, { useState } from 'react';
import { useApp, API_BASE_URL } from '../AppContext';
import {
  Menu,
  Bell,
  Search,
  LogOut,
  UploadCloud
} from 'lucide-react';

interface HeaderProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ collapsed, setCollapsed }) => {
  const { currentUser, expenses, logout, updateUserAvatar } = useApp();
  const [showBellDropdown, setShowBellDropdown] = useState(false);

  const handleHeaderAvatarUpload = async (file: File) => {
    if (!currentUser) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE_URL}/receipts/upload`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.fileUrl) {
          await updateUserAvatar(currentUser.id, data.fileUrl);
        }
      }
    } catch (err) {
      console.error('Header avatar upload error:', err);
    }
  };

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
    <header className="glass-panel sticky top-0 z-40 w-full border-b border-[#00C8FF]/15 px-4 md:px-6 py-4 flex items-center justify-between h-20">
      <div className="flex items-center gap-4">
        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-white p-2 hover:bg-white/[0.04] rounded-lg transition-colors duration-200"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative hidden sm:block">
          <Search className="w-4 h-4 text-[#00C8FF] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search dashboard... (CMD+K)"
            className="pl-9 pr-4 py-1.5 w-64 bg-[#030712]/60 border border-[#00C8FF]/15 focus:border-[#00C8FF] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none transition-all duration-200"
          />
        </div>
      </div>

      {/* Right section: Profile info & Logout */}
      <div className="flex items-center gap-3">
        {/* Active User Badge with Device Photo Upload */}
        {currentUser && (
          <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 bg-[#030712]/60 border border-[#00C8FF]/15 rounded-xl">
            <input
              type="file"
              id="header-user-avatar-input"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleHeaderAvatarUpload(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => document.getElementById('header-user-avatar-input')?.click()}
              className="relative group cursor-pointer"
              title="Click to upload profile photo from device"
            >
              <img src={currentUser.avatar} alt={currentUser.name} className="w-6.5 h-6.5 rounded-full object-cover border border-[#00C8FF]/30 group-hover:opacity-75 transition-opacity" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <UploadCloud className="w-3 h-3 text-white" />
              </div>
            </button>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-white leading-tight">{currentUser.name}</span>
              <span className="text-[9px] text-[#00C8FF] uppercase tracking-wider font-semibold">{currentUser.role}</span>
            </div>
          </div>
        )}

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowBellDropdown(!showBellDropdown)}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-orange-500 animate-ping" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-orange-500" />
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

        {/* Direct Log Out Button */}
        <button
          onClick={logout}
          className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40 rounded-xl px-3.5 py-1.5 text-xs text-rose-400 font-semibold transition-all duration-200 shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </header>
  );
};
