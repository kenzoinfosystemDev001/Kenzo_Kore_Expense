import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Key, Lock, CheckCircle2, X, ShieldCheck, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { currentUser, updateUserPassword } = useApp();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      const ok = await updateUserPassword(currentUser.id, newPassword);
      setLoading(false);

      if (ok) {
        setSuccessMsg('Your security password has been updated successfully!');
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          onClose();
          setSuccessMsg('');
        }, 2000);
      } else {
        setError('Failed to update password. Please check connection.');
      }
    } catch (err) {
      setLoading(false);
      setError('An error occurred while updating security credentials.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      {/* Background glow */}
      <div className="absolute w-[400px] h-[400px] bg-[#00A3FF]/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 border border-[#00C8FF]/30 shadow-[0_0_50px_rgba(0,163,255,0.25)] space-y-6 relative z-10 animate-scaleUp my-auto max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white p-1.5 hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#00A3FF]/20 to-[#00C8FF]/20 border border-[#00C8FF]/30 flex items-center justify-center text-[#00E0FF] shadow-[0_0_20px_rgba(0,163,255,0.3)]">
            <Key className="w-7 h-7 text-[#00C8FF]" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-white tracking-tight">Change Password</h3>
            <p className="text-xs text-gray-400 mt-1 font-sans">
              Updating security credentials for <strong className="text-[#00C8FF] font-semibold">{currentUser.email}</strong>
            </p>
          </div>
        </div>

        {/* Feedback Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 font-sans">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 font-sans">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
          <div className="space-y-1.5">
            <label className="text-gray-300 font-semibold block">New Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter at least 6 characters"
                className="w-full bg-[#030712] border border-[#00C8FF]/20 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#00C8FF] transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-gray-300 font-semibold block">Confirm New Password</label>
            <div className="relative">
              <ShieldCheck className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-[#030712] border border-[#00C8FF]/20 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#00C8FF] transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0077B6] via-[#00A3FF] to-[#00C8FF] hover:from-[#0088FF] hover:to-[#00E0FF] text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,163,255,0.3)] transition-all cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? 'Updating Credentials...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};
