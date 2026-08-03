import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { KenzoLogo } from './KenzoLogo';
import { ShieldCheck, Mail, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

export const AuthView: React.FC = () => {
  const { login } = useApp();
  
  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await login(email, password);
      setLoading(false);
      if (res.success) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        setError(res.message || 'Access denied. Only registered emails are allowed.');
      }
    } catch (err) {
      setLoading(false);
      setError('Connection to corporate authentication service failed. Please check backend server.');
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Tech background cybernetic glow overlays */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-[#00A3FF]/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[450px] h-[450px] rounded-full bg-[#00C8FF]/10 blur-[140px] pointer-events-none" />

      {/* Cyber Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00a3ff0a_1px,transparent_1px),linear-gradient(to_bottom,#00a3ff0a_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-[#00C8FF]/20 shadow-[0_0_50px_rgba(0,163,255,0.15)] space-y-8 relative z-10">
        {/* Kenzo Infosystems Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          {/* Official Kenzo Infinity Ribbon Logo (Image 3) */}
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
            <h2 className="text-sm font-bold text-gray-300 font-sans tracking-wide uppercase mt-1">Enterprise Financial Control Center</h2>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl text-center font-sans font-medium">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400">Corporate Email</label>
            <div className="flex items-center gap-2.5 bg-[#030712]/80 border border-[#00C8FF]/15 rounded-xl px-3.5 py-2.5 text-gray-400 focus-within:border-[#00C8FF] transition-all duration-200">
              <Mail className="w-4 h-4 text-[#00C8FF]" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter Email"
                className="bg-transparent border-none text-xs w-full text-white placeholder-gray-500 font-sans focus:ring-0"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-xs text-gray-400">Security Password</label>
              <a href="#" className="text-[10px] text-[#00C8FF] hover:underline" onClick={e => { e.preventDefault(); alert('Password resets are managed by your System Administrator.'); }}>Forgot password?</a>
            </div>
            <div className="flex items-center gap-2.5 bg-[#030712]/80 border border-[#00C8FF]/15 rounded-xl px-3.5 py-2.5 text-gray-400 focus-within:border-[#00C8FF] transition-all duration-200">
              <Lock className="w-4 h-4 text-[#00C8FF]" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter Password"
                className="bg-transparent border-none text-xs w-full text-white placeholder-gray-500 font-sans focus:ring-0"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0077B6] via-[#00A3FF] to-[#00C8FF] hover:from-[#0088FF] hover:to-[#00E0FF] text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(0,163,255,0.35)] hover:shadow-[0_0_35px_rgba(0,200,255,0.55)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Secure Authorization'}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-white/[0.04]">
          <p className="text-[10px] text-gray-500 font-sans">
            Protected by JWT & secure Bcrypt hashing algorithms.
          </p>
        </div>
      </div>
    </div>
  );
};
