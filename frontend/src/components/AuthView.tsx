import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { KenzoLogo } from './KenzoLogo';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import {
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Check,
  UserCheck,
  Sparkles,
  Building2,
  Briefcase,
  Eye,
  EyeOff
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const AuthView: React.FC = () => {
  const {
    login,
    checkActivationEligibility,
    sendActivationOtp,
    verifyActivationOtp,
    completeActivation
  } = useApp();

  // Mode: 'SIGN_IN' | 'ACTIVATE'
  const [mode, setMode] = useState<'SIGN_IN' | 'ACTIVATE'>('SIGN_IN');

  // Sign In States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  // Activation Multi-Step Wizard States: 1 | 2 | 3 | 4
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [activationEmail, setActivationEmail] = useState('');
  const [verifiedEmployee, setVerifiedEmployee] = useState<{
    email?: string;
    name?: string;
    department?: string;
    jobTitle?: string;
  } | null>(null);

  const [otp, setOtp] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [activationLoading, setActivationLoading] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [activationSuccessMsg, setActivationSuccessMsg] = useState('');

  // Timer for OTP resend countdown
  useEffect(() => {
    let timer: any;
    if (activeStep === 2 && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown(prev => prev - 1);
      }, 1000);
    } else if (otpCountdown === 0) {
      setCanResendOtp(true);
    }
    return () => clearInterval(timer);
  }, [activeStep, otpCountdown]);

  // ==========================================
  // SIGN IN SUBMISSION
  // ==========================================
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await login(loginEmail, loginPassword);
      setLoginLoading(false);
      if (res.success) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        setLoginError(res.message || 'Access denied. Please check your credentials or activate your account.');
      }
    } catch {
      setLoginLoading(false);
      setLoginError('Connection to authentication service failed. Please check backend server.');
    }
  };

  // ==========================================
  // ACTIVATION STEP 1: CHECK ELIGIBILITY
  // ==========================================
  const handleCheckEligibility = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivationLoading(true);
    setActivationError('');

    try {
      const res = await checkActivationEligibility(activationEmail);
      setActivationLoading(false);

      if (res.status === 'ALREADY_ACTIVATED') {
        setActivationError(res.message || 'Your account is already activated. Please Sign In.');
        return;
      }

      if (res.eligible && res.employee) {
        setVerifiedEmployee(res.employee);
        // Automatically request OTP dispatch
        setActivationLoading(true);
        const otpRes = await sendActivationOtp(activationEmail);
        setActivationLoading(false);

        if (otpRes.success) {
          setOtpCountdown(60);
          setCanResendOtp(false);
          setActiveStep(2);
        } else {
          setActivationError(otpRes.message || 'Failed to dispatch verification code.');
        }
      } else {
        setActivationError(res.message || 'This email is not eligible to activate an account.');
      }
    } catch {
      setActivationLoading(false);
      setActivationError('Directory lookup service unreachable. Please try again.');
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (!canResendOtp || activationLoading) return;
    setActivationLoading(true);
    setActivationError('');

    try {
      const res = await sendActivationOtp(activationEmail);
      setActivationLoading(false);
      if (res.success) {
        setOtpCountdown(60);
        setCanResendOtp(false);
        setActivationSuccessMsg('New verification code dispatched to your inbox.');
        setTimeout(() => setActivationSuccessMsg(''), 4000);
      } else {
        setActivationError(res.message);
      }
    } catch {
      setActivationLoading(false);
      setActivationError('Failed to resend code.');
    }
  };

  // ==========================================
  // ACTIVATION STEP 2: VERIFY OTP
  // ==========================================
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivationLoading(true);
    setActivationError('');

    try {
      const res = await verifyActivationOtp(activationEmail, otp);
      setActivationLoading(false);

      if (res.success && res.token) {
        setVerificationToken(res.token);
        setActiveStep(3);
      } else {
        setActivationError(res.message || 'Invalid or expired verification code.');
      }
    } catch {
      setActivationLoading(false);
      setActivationError('Verification failed. Please try again.');
    }
  };

  // Password Policy Checks for Activation
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[@$!%*?&#^()_+=-]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
  const isMatching = newPassword && confirmPassword && newPassword === confirmPassword;

  // ==========================================
  // ACTIVATION STEP 3: SET PASSWORD & ACTIVATE
  // ==========================================
  const handleCompleteActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivationError('');

    if (!isPasswordValid) {
      setActivationError('Please satisfy all password complexity rules.');
      return;
    }

    if (!isMatching) {
      setActivationError('Password and confirmation do not match.');
      return;
    }

    setActivationLoading(true);
    try {
      const res = await completeActivation(activationEmail, verificationToken, newPassword);
      setActivationLoading(false);

      if (res.success) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
        setActiveStep(4);
      } else {
        setActivationError(res.message || 'Account activation failed.');
      }
    } catch {
      setActivationLoading(false);
      setActivationError('Error completing activation.');
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />

      {/* Cybernetic Glow Overlays */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-[#00A3FF]/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[450px] h-[450px] rounded-full bg-[#00C8FF]/10 blur-[140px] pointer-events-none" />

      {/* Cyber Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00a3ff0a_1px,transparent_1px),linear-gradient(to_bottom,#00a3ff0a_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 border border-[#00C8FF]/20 shadow-[0_0_50px_rgba(0,163,255,0.15)] space-y-6 relative z-10 my-8">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex items-center gap-3">
            <KenzoLogo size={44} className="w-11 h-11" />
            <div className="flex flex-col text-left">
              <span className="text-xl font-extrabold text-white tracking-widest font-sans flex items-center gap-1 leading-none">
                KENZO
              </span>
              <span className="text-[10px] text-[#00C8FF] font-semibold tracking-widest block uppercase mt-0.5">INFOSYSTEMS</span>
            </div>
          </div>
          <div>
            <h2 className="text-xs font-bold text-gray-400 font-sans tracking-widest uppercase">
              Enterprise Financial Control Center
            </h2>
          </div>
        </div>

        {/* MODE SWITCHER: [ Sign In ] vs [ Activate Account ] */}
        <div className="flex p-1 bg-[#090A0F]/80 border border-white/[0.06] rounded-2xl">
          <button
            type="button"
            onClick={() => { setMode('SIGN_IN'); setLoginError(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              mode === 'SIGN_IN'
                ? 'bg-gradient-to-r from-[#0077B6] to-[#00A3FF] text-white shadow-[0_0_15px_rgba(0,163,255,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('ACTIVATE'); setActivationError(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'ACTIVATE'
                ? 'bg-gradient-to-r from-[#0077B6] to-[#00A3FF] text-white shadow-[0_0_15px_rgba(0,163,255,0.3)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00E0FF]" />
            Activate Account
          </button>
        </div>

        {/* ========================================================= */}
        {/* VIEW 1: SIGN IN FORM                                      */}
        {/* ========================================================= */}
        {mode === 'SIGN_IN' && (
          <div className="space-y-4 animate-fadeIn">
            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2 font-sans">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">Corporate Email</label>
                <div className="flex items-center gap-2.5 bg-[#030712]/80 border border-[#00C8FF]/15 rounded-xl px-3.5 py-2.5 text-gray-400 focus-within:border-[#00C8FF] transition-all duration-200">
                  <Mail className="w-4 h-4 text-[#00C8FF]" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="Enter corporate email"
                    className="bg-transparent border-none text-xs w-full text-white placeholder-gray-500 font-sans focus:ring-0"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-gray-400">Security Password</label>
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    className="text-[11px] text-[#00C8FF] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="flex items-center gap-2.5 bg-[#030712]/80 border border-[#00C8FF]/15 rounded-xl px-3.5 py-2.5 text-gray-400 focus-within:border-[#00C8FF] transition-all duration-200">
                  <Lock className="w-4 h-4 text-[#00C8FF] shrink-0" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    className="bg-transparent border-none text-xs w-full text-white placeholder-gray-500 font-sans focus:ring-0 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="text-gray-500 hover:text-[#00C8FF] transition p-0.5 cursor-pointer shrink-0"
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-[#00C8FF]" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0077B6] via-[#00A3FF] to-[#00C8FF] hover:from-[#0088FF] hover:to-[#00E0FF] text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(0,163,255,0.35)] hover:shadow-[0_0_35px_rgba(0,200,255,0.55)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loginLoading ? 'Authenticating...' : 'Secure Authorization'}
              </button>
            </form>

            <div className="pt-2 text-center border-t border-white/[0.04] space-y-1">
              <p className="text-[11px] text-gray-400 font-sans">
                New employee at Kenzo InfoSystems?{' '}
                <button
                  type="button"
                  onClick={() => setMode('ACTIVATE')}
                  className="text-[#00E0FF] font-semibold hover:underline cursor-pointer"
                >
                  Activate your account
                </button>
              </p>
              <p className="text-[10px] text-gray-600 font-sans">
                Verified against Google Workspace Master Directory & SCIM Provisioning.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: ACCOUNT ACTIVATION WIZARD                         */}
        {/* ========================================================= */}
        {mode === 'ACTIVATE' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Step Progress Pills */}
            <div className="flex items-center justify-between px-2 text-[10px] uppercase font-bold tracking-wider text-gray-500">
              <div className={`flex items-center gap-1.5 ${activeStep >= 1 ? 'text-[#00E0FF]' : ''}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${
                  activeStep >= 1 ? 'border-[#00E0FF] bg-[#00E0FF]/10' : 'border-gray-700'
                }`}>
                  1
                </span>
                <span>Eligibility</span>
              </div>
              <div className="w-8 h-[1px] bg-white/10" />
              <div className={`flex items-center gap-1.5 ${activeStep >= 2 ? 'text-[#00E0FF]' : ''}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${
                  activeStep >= 2 ? 'border-[#00E0FF] bg-[#00E0FF]/10' : 'border-gray-700'
                }`}>
                  2
                </span>
                <span>Verification</span>
              </div>
              <div className="w-8 h-[1px] bg-white/10" />
              <div className={`flex items-center gap-1.5 ${activeStep >= 3 ? 'text-[#00E0FF]' : ''}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${
                  activeStep >= 3 ? 'border-[#00E0FF] bg-[#00E0FF]/10' : 'border-gray-700'
                }`}>
                  3
                </span>
                <span>Security</span>
              </div>
            </div>

            {/* Error & Info Alerts */}
            {activationError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2 font-sans">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{activationError}</span>
              </div>
            )}

            {activationSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2 font-sans">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{activationSuccessMsg}</span>
              </div>
            )}

            {/* STEP 1: Enter Corporate Email */}
            {activeStep === 1 && (
              <form onSubmit={handleCheckEligibility} className="space-y-4 font-sans">
                <div className="p-3 bg-[#00A3FF]/10 border border-[#00C8FF]/20 rounded-xl text-gray-300 text-xs leading-relaxed space-y-1">
                  <div className="flex items-center gap-1.5 text-[#00E0FF] font-bold">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Company Master Directory Lookup</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Enter your official corporate email address. We will verify your eligibility against Google Cloud Identity & SCIM records.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400">Official Company Email</label>
                  <div className="flex items-center gap-2.5 bg-[#030712]/80 border border-[#00C8FF]/15 rounded-xl px-3.5 py-2.5 text-gray-400 focus-within:border-[#00C8FF] transition-all duration-200">
                    <Mail className="w-4 h-4 text-[#00C8FF]" />
                    <input
                      type="email"
                      value={activationEmail}
                      onChange={e => setActivationEmail(e.target.value)}
                      placeholder="Enter the Company Mail"
                      className="bg-transparent border-none text-xs w-full text-white placeholder-gray-500 font-sans focus:ring-0"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={activationLoading || !activationEmail.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0077B6] via-[#00A3FF] to-[#00C8FF] hover:from-[#0088FF] hover:to-[#00E0FF] text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(0,163,255,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {activationLoading ? 'Verifying with Directory...' : 'Verify Eligibility & Continue'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* STEP 2: Verify OTP Challenge */}
            {activeStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4 font-sans text-xs">
                {/* Employee badge preview */}
                {verifiedEmployee && (
                  <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#00C8FF]/20 border border-[#00C8FF]/40 flex items-center justify-center text-[#00E0FF] font-bold text-sm">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-xs">{verifiedEmployee.name}</span>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Briefcase className="w-3 h-3 text-[#00C8FF]" />
                        {verifiedEmployee.jobTitle} • {verifiedEmployee.department}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-gray-300 font-semibold block">6-Digit Verification Code</label>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {otpCountdown > 0 ? `Expires in ${otpCountdown}s` : 'Code expired'}
                    </span>
                  </div>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-[#00C8FF] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit code"
                      className="w-full bg-[#030712] border border-[#00C8FF]/20 rounded-xl pl-10 pr-3.5 py-2.5 text-white tracking-widest font-mono text-center text-sm placeholder-gray-600 focus:outline-none focus:border-[#00C8FF] transition"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500">
                    A secure 6-digit challenge was sent to <strong className="text-gray-300">{activationEmail}</strong>.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={!canResendOtp || activationLoading}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/[0.04] text-gray-300 font-bold text-xs uppercase tracking-wider transition disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Resend Code
                  </button>
                  <button
                    type="submit"
                    disabled={activationLoading || otp.length !== 6}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#0077B6] via-[#00A3FF] to-[#00C8FF] text-white font-bold text-xs uppercase tracking-wider transition shadow-[0_0_20px_rgba(0,163,255,0.3)] disabled:opacity-50 cursor-pointer"
                  >
                    {activationLoading ? 'Verifying...' : 'Verify Code'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Create Secure Password */}
            {activeStep === 3 && (
              <form onSubmit={handleCompleteActivation} className="space-y-4 font-sans text-xs">
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-semibold block">Create Security Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#00C8FF] absolute left-3.5 top-3" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full bg-[#030712] border border-[#00C8FF]/20 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#00C8FF] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-gray-500 hover:text-[#00C8FF] transition p-1 cursor-pointer"
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-300 font-semibold block">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#00C8FF] absolute left-3.5 top-3" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full bg-[#030712] border border-[#00C8FF]/20 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#00C8FF] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-gray-500 hover:text-[#00C8FF] transition p-1 cursor-pointer"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Policy Checklist */}
                <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-1.5 text-[10px]">
                  <span className="text-gray-400 font-semibold uppercase tracking-wider block">
                    Enterprise Password Standard
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-gray-500">
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
                  disabled={activationLoading || !isPasswordValid || !isMatching}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0077B6] via-[#00A3FF] to-[#00C8FF] hover:from-[#0088FF] hover:to-[#00E0FF] text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(0,163,255,0.35)] transition-all cursor-pointer disabled:opacity-50"
                >
                  {activationLoading ? 'Activating Account...' : 'Complete Activation & Sign In'}
                </button>
              </form>
            )}

            {/* STEP 4: Success Screen */}
            {activeStep === 4 && (
              <div className="text-center space-y-4 py-4 animate-scaleUp">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">Account Activated Successfully!</h4>
                  <p className="text-xs text-gray-400 font-sans">
                    Your credentials have been securely registered and linked to your corporate Google Workspace identity.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMode('SIGN_IN');
                    setActiveStep(1);
                    setLoginEmail(activationEmail);
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0077B6] via-[#00A3FF] to-[#00C8FF] text-white font-bold text-xs uppercase tracking-wider cursor-pointer shadow-[0_0_20px_rgba(0,163,255,0.3)]"
                >
                  Continue to Sign In
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 text-center border-t border-white/[0.04]">
          <p className="text-[10px] text-gray-500 font-sans">
            Protected by Argon2id / Bcrypt salt & Google Cloud Identity federation.
          </p>
        </div>
      </div>
    </div>
  );
};
