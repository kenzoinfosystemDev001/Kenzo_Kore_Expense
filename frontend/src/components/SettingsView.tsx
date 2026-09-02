import React, { useState } from 'react';
import { useApp, API_BASE_URL } from '../AppContext';
import { ChangePasswordModal } from './ChangePasswordModal';
import {
  Sliders,
  Database,
  Plus,
  Trash2,
  Users,
  Briefcase,
  Mail,
  Shield,
  Key,
  Info,
  UploadCloud,
  Lock,
  Image as ImageIcon,
  Sun,
  Moon,
  Building2
} from 'lucide-react';
import { UserRole } from '../types';

export const SettingsView: React.FC = () => {
  const { policies, budgets, updatePolicy, users, addUser, deleteUser, updateUserAvatar, currentUser, openPasswordModal, theme, toggleTheme } = useApp();

  // Add User Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Employee' | 'Admin'>('Employee');
  const [designation, setDesignation] = useState('');
  const [departmentId, setDepartmentId] = useState('dept_eng');
  const [avatar, setAvatar] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleDeviceAvatarUpload = async (userId: string, file: File) => {
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
          await updateUserAvatar(userId, data.fileUrl);
        }
      }
    } catch (err) {
      console.error('Avatar device upload error:', err);
    }
  };

  const handleFormAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
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
          setAvatar(data.fileUrl);
        }
      }
    } catch (err) {
      console.error('Form avatar upload error:', err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleTogglePolicy = (id: string, currentLimit: number, enabled: boolean) => {
    updatePolicy(id, currentLimit, !enabled);
  };

  const handleLimitChange = (id: string, limit: number, enabled: boolean) => {
    updatePolicy(id, limit, enabled);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !designation) {
      alert('Please fill in Name, Email, and Designation.');
      return;
    }
    const res = await addUser({
      name,
      email,
      password: password || 'Kenzo@2026',
      role,
      designation,
      departmentId,
      avatar: avatar && avatar.trim() ? avatar.trim() : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
    });

    if (res.success) {
      setName('');
      setEmail('');
      setPassword('');
      setDesignation('');
      setAvatar('');
      setShowAddForm(false);
      alert(`Employee ${name} created successfully with active credentials! They can log in immediately.`);
    } else {
      alert(`Error creating employee: ${res.message || 'Failed to register employee'}`);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (currentUser?.id === userId) {
      alert('Error: You cannot delete your own active session user profile.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete employee ${userName}? All their records will be removed, and if they log in again, full account activation will be required.`)) {
      const res = await deleteUser(userId);
      if (res?.success) {
        alert(`Employee ${userName} successfully removed from the system. If they rejoin or sign in, full account activation is required.`);
      } else {
        alert(`Failed to delete employee: ${res?.message || 'Error occurred'}`);
      }
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white">System Settings</h2>
        <p className="text-gray-400 text-xs mt-1">
          Configure approval workflows, budgets limits, compliance policies, and employee permissions.
        </p>
      </div>

      {/* Personal Security & Credentials Panel */}
      {currentUser && (
        <div className="glass-panel p-6 rounded-3xl border border-[#00C8FF]/25 bg-gradient-to-r from-[#00A3FF]/10 via-[#00C8FF]/5 to-transparent space-y-4 shadow-[0_0_30px_rgba(0,163,255,0.15)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#00A3FF]/15 border border-[#00C8FF]/30 flex items-center justify-center text-[#00E0FF]">
                <Key className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-white tracking-wide">My Security & Password Settings</h3>
                  <span className="text-[10px] bg-[#00C8FF]/10 text-[#00C8FF] border border-[#00C8FF]/20 px-2 py-0.5 rounded-full font-bold uppercase">
                    Self Service
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-sans">
                  Active User: <strong className="text-white">{currentUser.name}</strong> ({currentUser.email})
                </p>
              </div>
            </div>

            <button
              onClick={openPasswordModal}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#0077B6] via-[#00A3FF] to-[#00C8FF] hover:from-[#0088FF] hover:to-[#00E0FF] text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,163,255,0.3)] transition-all cursor-pointer flex items-center gap-2 shrink-0 self-start sm:self-auto"
            >
              <Lock className="w-4 h-4" />
              <span>Change My Password</span>
            </button>
          </div>
        </div>
      )}

      {/* Master Directory & SCIM Synchronization Status */}
      <div className="glass-panel p-5 rounded-3xl border border-[#00C8FF]/20 bg-gradient-to-r from-[#00A3FF]/10 to-transparent space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#00E0FF]">
            <Building2 className="w-4.5 h-4.5" />
            <h4 className="text-xs font-bold uppercase tracking-widest">Master Identity & SCIM 2.0 Directory Status</h4>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Synchronized
          </span>
        </div>
        <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
          Employee onboarding and lifecycle states are authoritatively synchronized with Google Workspace Directory and SCIM 2.0 provisioning. All passwords are protected using 12 salt rounds Bcrypt hashing.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl text-[10px] space-y-1">
            <span className="text-gray-400 block uppercase">Directory Source</span>
            <span className="font-bold text-white block">Google Workspace</span>
          </div>
          <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl text-[10px] space-y-1">
            <span className="text-gray-400 block uppercase">Provisioning Protocol</span>
            <span className="font-bold text-[#00E0FF] block">SCIM 2.0 / RFC 7644</span>
          </div>
          <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl text-[10px] space-y-1">
            <span className="text-gray-400 block uppercase">Security Standard</span>
            <span className="font-bold text-emerald-400 block">Argon2 / Bcrypt-12</span>
          </div>
          <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl text-[10px] space-y-1">
            <span className="text-gray-400 block uppercase">Active App Users</span>
            <span className="font-bold text-white block">{users.length} Employees</span>
          </div>
        </div>
      </div>

      {/* Grid Settings Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Policies Panel */}
        <div className="glass-panel p-6 rounded-3xl space-y-6">
          <div className="flex justify-between items-center border-b border-white/[0.06] pb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4.5 h-4.5 text-brand-purple-400" />
              Corporate Expense Policies
            </h3>
            <span className="text-[10px] text-brand-orange-400 font-bold font-mono">SOC-2 GATEWAY</span>
          </div>

          <div className="space-y-4">
            {policies.map(pol => (
              <div key={pol.id} className="p-4 bg-white/[0.01] border border-white/[0.04] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-xs">
                  <h4 className="text-xs font-bold text-white">{pol.name}</h4>
                  <p className="text-[10px] text-gray-500 font-sans leading-normal">{pol.description}</p>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] px-2 py-1 rounded-xl text-xs text-white">
                    <span>$</span>
                    <input
                      type="number"
                      value={pol.limitAmount}
                      onChange={e => handleLimitChange(pol.id, parseFloat(e.target.value) || 0, pol.isEnabled)}
                      className="bg-transparent border-none w-16 text-right focus:ring-0 p-0 text-xs text-white font-sans font-bold"
                    />
                  </div>

                  <button
                    onClick={() => handleTogglePolicy(pol.id, pol.limitAmount, pol.isEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      pol.isEnabled ? 'bg-brand-purple-600' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                        pol.isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Budgets Management */}
        <div className="glass-panel p-6 rounded-3xl space-y-6">
          <div className="flex justify-between items-center border-b border-white/[0.06] pb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-4.5 h-4.5 text-brand-orange-500" />
              Q3 Budget Clearances
            </h3>
            <button className="text-[10px] text-brand-purple-400 font-bold hover:underline flex items-center gap-0.5">
              <Plus className="w-3.5 h-3.5" /> Add Budget
            </button>
          </div>

          <div className="space-y-4">
            {budgets.map(b => {
              const consumption = (b.spent / b.allocated) * 100;
              return (
                <div key={b.id} className="space-y-2 bg-white/[0.01] border border-white/[0.04] p-4 rounded-2xl">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-white">{b.name}</span>
                    <span className="text-gray-400 font-sans">
                      ${b.spent.toLocaleString()} / <strong>${b.allocated.toLocaleString()}</strong>
                    </span>
                  </div>

                  <div className="w-full bg-white/[0.04] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        consumption >= 90
                          ? 'bg-rose-500'
                          : consumption >= 70
                          ? 'bg-brand-orange-500'
                          : 'bg-brand-purple-500'
                      }`}
                      style={{ width: `${Math.min(consumption, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[9px] text-gray-500">
                    <span className="uppercase tracking-wide font-sans">{b.period} Clearance</span>
                    <span>{consumption.toFixed(1)}% consumed</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Theme & Visual Display Settings */}
      <div className="glass-panel p-6 rounded-3xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-sm font-extrabold text-white tracking-wider uppercase font-sans flex items-center gap-2">
              <Sun className="w-4 h-4 text-[#00C8FF]" />
              Theme & Visual Appearance
            </h3>
            <p className="text-xs text-gray-400 font-sans mt-1">
              Customize interface display theme preference for Kenzo Kore Expense
            </p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-[#00C8FF]/10 text-[#00C8FF] border border-[#00C8FF]/20 font-bold uppercase tracking-wider">
            Active: {theme.toUpperCase()} MODE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Dark Mode Option Card */}
          <div
            onClick={() => theme !== 'dark' && toggleTheme()}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-[#00A3FF]/20 to-[#00C8FF]/10 border-[#00C8FF] shadow-[0_0_20px_rgba(0,163,255,0.2)]'
                : 'bg-white/[0.02] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#030712] border border-[#00C8FF]/30 rounded-xl text-amber-400">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Dark Mode (Default)</h4>
                <p className="text-[10px] text-gray-400 font-sans mt-0.5">High-contrast executive midnight aesthetic</p>
              </div>
            </div>
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${theme === 'dark' ? 'border-[#00C8FF] bg-[#00C8FF]' : 'border-gray-500'}`}>
              {theme === 'dark' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
            </div>
          </div>

          {/* Light Mode Option Card */}
          <div
            onClick={() => theme !== 'light' && toggleTheme()}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
              theme === 'light'
                ? 'bg-gradient-to-r from-[#00A3FF]/20 to-[#00C8FF]/10 border-[#00C8FF] shadow-[0_0_20px_rgba(0,163,255,0.2)]'
                : 'bg-white/[0.02] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white border border-slate-300 rounded-xl text-indigo-600">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Light Mode</h4>
                <p className="text-[10px] text-gray-400 font-sans mt-0.5">Pristine daylight corporate view</p>
              </div>
            </div>
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${theme === 'light' ? 'border-[#00C8FF] bg-[#00C8FF]' : 'border-gray-500'}`}>
              {theme === 'light' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Employees Directory Management Panel */}
      <div className="glass-panel p-6 rounded-3xl space-y-6">
        <div className="flex justify-between items-center border-b border-white/[0.06] pb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4.5 h-4.5 text-brand-purple-400" />
            Corporate Directory (Admin Control Center)
          </h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 text-[10px] text-brand-purple-400 hover:text-brand-purple-300 font-bold uppercase tracking-wider"
          >
            <Plus className="w-3.5 h-3.5" />
            {showAddForm ? 'Close Form' : 'Add Employee'}
          </button>
        </div>

        {/* Add Employee Form */}
        {showAddForm && (
          <form onSubmit={handleAddUser} className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-gray-400">Employee Name</label>
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[#090A0F]/50 border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-white"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-gray-400">Email Address</label>
              <input
                type="email"
                placeholder="email@kenzo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#090A0F]/50 border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-white"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-gray-400">Password</label>
              <input
                type="text"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#090A0F]/50 border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-white"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-gray-400">Designation</label>
              <input
                type="text"
                placeholder="Designation"
                value={designation}
                onChange={e => setDesignation(e.target.value)}
                className="w-full bg-[#090A0F]/50 border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-white"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-gray-400">Profile Picture (Upload from Device)</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="form-avatar-file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleFormAvatarUpload(e.target.files[0])}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('form-avatar-file')?.click()}
                  className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white rounded-xl text-xs font-semibold transition"
                >
                  <UploadCloud className="w-4 h-4 text-brand-purple-400" />
                  <span>{uploadingAvatar ? 'Uploading...' : 'Choose Device Photo'}</span>
                </button>
                {avatar && (
                  <img src={avatar} alt="Preview" className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0" style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px', maxWidth: '32px', maxHeight: '32px' }} />
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-gray-400">System Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as 'Employee' | 'Admin')}
                className="w-full bg-[#090A0F] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-white"
              >
                <option value="Employee">Employee</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div className="space-y-1.5 flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0077B6] to-[#00A3FF] hover:from-[#0088FF] hover:to-[#00C8FF] text-white font-bold transition shadow-[0_0_15px_rgba(0,163,255,0.3)]"
              >
                Confirm Add User
              </button>
            </div>
          </form>
        )}

        {/* Directory Table */}
        <div className="overflow-x-auto rounded-xl border border-white/[0.04]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.01] text-gray-500 font-medium">
                <th className="p-4">Name & Designation</th>
                <th className="p-4">Email</th>
                <th className="p-4">Joining Date</th>
                <th className="p-4">Role</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px', maxWidth: '32px', maxHeight: '32px' }} />
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-sm">{u.name}</span>
                        <span className="text-[10px] text-gray-500 font-sans mt-0.5">{u.designation}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-300 font-sans">{u.email}</td>
                  <td className="p-4 text-gray-400 font-sans">{u.joiningDate}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                      u.role === 'Admin' || u.role === 'Super Admin'
                        ? 'bg-brand-orange-500/10 border-brand-orange-500/20 text-brand-orange-400'
                        : 'bg-brand-purple-500/10 border-brand-purple-500/20 text-brand-purple-400'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 text-center flex items-center justify-center gap-2">
                    <input
                      type="file"
                      id={`avatar-upload-${u.id}`}
                      accept="image/*"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && handleDeviceAvatarUpload(u.id, e.target.files[0])}
                    />
                    <button
                      onClick={() => document.getElementById(`avatar-upload-${u.id}`)?.click()}
                      className="p-2 rounded-xl bg-white/[0.03] hover:bg-brand-purple-500/10 text-gray-400 hover:text-brand-purple-300 border border-white/[0.04] transition-colors"
                      title="Upload profile picture from device/system"
                    >
                      <UploadCloud className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id, u.name)}
                      className="p-2 rounded-xl bg-white/[0.03] hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 border border-white/[0.04] transition-colors"
                      title="Delete profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
