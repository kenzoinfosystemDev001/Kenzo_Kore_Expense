import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Key, Lock, Mail, CheckCircle2, X, AlertCircle, ArrowRight, ShieldCheck, Check, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const { forgotPassword, resetPassword } = useApp();

  const [step, setStep] = useState<'EMAIL' | 'VERIFY_AND_RESET' | 'SUCCESS'>('EMAIL');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  if (!isOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await forgotPassword(email);
      setLoading(false);
      if (res.success) {
        setInfoMsg(res.message);
        setStep('VERIFY_AND_RESET');
      } else {
        setError(res.message || 'Unable to process reset request.');
      }
    } catch {
      setLoading(false);
      setError('Connection error. Please try again.');
    }
  };

  // Password Policy Validators
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[@$!%*?&#^()_+=-]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
  const isMatching = newPassword && confirmPassword && newPassword === confirmPassword;

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Please ensure your new password satisfies all security requirements.');
      return;
    }

    if (!isMatching) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(email, otp, newPassword);
      setLoading(false);
      if (res.success) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        setStep('SUCCESS');
      } else {
        setError(res.message || 'Failed to reset password. Please check your verification code.');
      }
    } catch {
      setLoading(false);
      setError('Connection error. Please check your network.');
    }
  };

  const handleClose = () => {
    setStep('EMAIL');
    setEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setInfoMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 border border-[#00C8FF]/30 shadow-[0_0_50px_rgba(0,163,255,0.25)] space-y-6 relative z-10 animate-scaleUp max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white p-1.5 hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00A3FF]/20 to-[#00C8FF]/20 border border-[#00C8FF]/30 flex items-center justify-center text-[#00E0FF] shadow-[0_0_20px_rgba(0,163,255,0.3)]">
            <Key className="w-6 h-6 text-[#00C8FF]" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-white tracking-tight">Self-Service Password Recovery</h3>
            <p className="text-xs text-gray-400 mt-1 font-sans">
              Verify your company email to reset your security credentials
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 font-sans">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {infoMsg && step === 'VERIFY_AND_RESET' && (
          <div className="p-3 rounded-xl bg-[#00C8FF]/10 border border-[#00C8FF]/20 text-[#00E0FF] text-xs flex items-center gap-2 font-sans">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 'EMAIL' && (
          <form onSubmit={handleRequestOtp} className="space-y-4 font-sans text-xs">
            <div className="space-y-1.5">
              <label className="text-gray-300 font-semibold block">Official Corporate Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#00C8FF] absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@kenzoinfosystems.com"
                  className="w-full bg-[#030712] border border-[#00C8FF]/20 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#00C8FF] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0077B6] via-[#00A3FF] to-[#00C8FF] hover:from-[#0088FF] hover:to-[#00E0FF] text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,163,255,0.3)] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Sending Code...' : 'Dispatch Verification Code'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: OTP & New Password */}
        {step === 'VERIFY_AND_RESET' && (
          <form onSubmit={handleResetSubmit} className="space-y-4 font-sans text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-gray-300 font-semibold block">6-Digit Verification Code</label>
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={loading}
                  className="text-[11px] text-[#00C8FF] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Resend
                </button>
              </div>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-[#00C8FF] absolute left-3.5 top-3" />
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full bg-[#030712] border border-[#00C8FF]/20 rounded-xl pl-10 pr-3.5 py-2.5 text-white tracking-widest font-mono text-center text-sm placeholder-gray-600 focus:outline-none focus:border-[#00C8FF] transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-300 font-semibold block">New Security Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Create strong password"
                  className="w-full bg-[#030712] border border-[#00C8FF]/20 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#00C8FF] transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-300 font-semibold block">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full bg-[#030712] border border-[#00C8FF]/20 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#00C8FF] transition"
                />
              </div>
            </div>

            {/* Password Policy Checklist */}
            <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-1.5 text-[10px]">
              <span className="text-gray-400 font-semibold uppercase tracking-wider block">Password Requirements</span>
              <div className="grid grid-cols-2 gap-1.5 text-gray-400">
                <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-400 font-semibold' : ''}`}>
                  <Check className="w-3 h-3" /> 8+ Characters
                </span>
                <span className={`flex items-center gap-1 ${hasUpper ? 'text-emerald-400 font-semibold' : ''}`}>
                  <Check className="w-3 h-3" /> Uppercase (A-Z)
                </span>
                <span className={`flex items-center gap-1 ${hasLower ? 'text-emerald-400 font-semibold' : ''}`}>
                  <Check className="w-3 h-3" /> Lowercase (a-z)
                </span>
                <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-400 font-semibold' : ''}`}>
                  <Check className="w-3 h-3" /> Number (0-9)
                </span>
                <span className={`flex items-center gap-1 col-span-2 ${hasSpecial ? 'text-emerald-400 font-semibold' : ''}`}>
                  <Check className="w-3 h-3" /> Special Character (@$!%*?&#)
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid || !isMatching || otp.length !== 6}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0077B6] via-[#00A3FF] to-[#00C8FF] hover:from-[#0088FF] hover:to-[#00E0FF] text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,163,255,0.3)] transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Updating Credentials...' : 'Save New Password & Reset'}
            </button>
          </form>
        )}

        {/* STEP 3: Success Screen */}
        {step === 'SUCCESS' && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">Password Reset Successfully</h4>
              <p className="text-xs text-gray-400 font-sans">
                Your security credentials have been updated with Bcrypt salt protection. You can now sign in.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0077B6] via-[#00A3FF] to-[#00C8FF] text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              Return to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
