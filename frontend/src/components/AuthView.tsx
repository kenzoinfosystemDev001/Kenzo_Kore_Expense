import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { ShieldCheck, Mail, Lock, User, Briefcase, Building, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export const AuthView: React.FC = () => {
  const { login, signup, users } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  
  // Login Form States
  const [email, setEmail] = useState('sujal.kumar@kenzo.com');
  const [password, setPassword] = useState('password123');
  
  // Signup Form States
  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [role, setRole] = useState<'Employee' | 'Admin'>('Employee');
  const [designation, setDesignation] = useState('');
  const [departmentId, setDepartmentId] = useState('dept_eng');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      const success = login(email, password);
      setLoading(false);
      if (success) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        setError('Invalid email or password. Try: sujal.kumar@kenzo.com / password123');
      }
    }, 1000);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !signupEmail || !signupPassword || !designation) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError('');

    setTimeout(() => {
      signup({
        name,
        email: signupEmail,
        password: signupPassword,
        role,
        designation,
        departmentId,
      });
      setLoading(false);
      confetti({
        particleCount: 80,
        spread: 60,
        colors: ['#7C3AED', '#EA580C']
      });
      // Switch back to login page and autofill
      setEmail(signupEmail);
      setPassword(signupPassword);
      setIsLogin(true);
      alert('Registration successful! Password hashed with Bcrypt (simulated) and user added to system. You can now login.');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#090A0F] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-brand-purple-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-brand-orange-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md glass-panel rounded-3xl p-8 border border-white/[0.08] shadow-2xl space-y-8 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-purple-600 to-brand-orange-500 flex items-center justify-center text-white font-bold text-2xl shadow-xl animate-pulse-ring">
            K
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white font-sans tracking-tight">Kenzo Kore Expense</h2>
            <p className="text-gray-400 text-xs mt-1">Enterprise-Grade Financial Control Center</p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="grid grid-cols-2 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 text-xs font-semibold">
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`py-2 rounded-lg transition-all ${
              isLogin ? 'bg-brand-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Login Session
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`py-2 rounded-lg transition-all ${
              !isLogin ? 'bg-brand-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl text-center font-sans font-medium">
            {error}
          </div>
        )}

        {isLogin ? (
          /* Login Form */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">Corporate Email</label>
              <div className="flex items-center gap-2.5 bg-white/[0.02] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-gray-400 focus-within:border-brand-purple-500/50 transition-colors">
                <Mail className="w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="bg-transparent border-none text-xs w-full text-white placeholder-gray-500 font-sans focus:ring-0"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-xs text-gray-400">Security Password</label>
                <a href="#" className="text-[10px] text-brand-purple-400 hover:underline">Forgot password?</a>
              </div>
              <div className="flex items-center gap-2.5 bg-white/[0.02] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-gray-400 focus-within:border-brand-purple-500/50 transition-colors">
                <Lock className="w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="bg-transparent border-none text-xs w-full text-white placeholder-gray-500 font-sans focus:ring-0"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-purple-600 to-brand-orange-500 hover:from-brand-purple-700 hover:to-brand-orange-600 text-white font-semibold text-xs shadow-lg transition-all duration-200"
            >
              {loading ? 'Validating credentials...' : 'Secure Authorization'}
            </button>

            <div className="text-[10px] text-center text-gray-500 font-sans mt-4">
              Protected by JWT & secure Bcrypt hashing algorithms.
            </div>
          </form>
        ) : (
          /* Signup Form */
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">Full Name</label>
              <div className="flex items-center gap-2.5 bg-white/[0.02] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-gray-400 focus-within:border-brand-purple-500/50 transition-colors">
                <User className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Doe"
                  className="bg-transparent border-none text-xs w-full text-white placeholder-gray-500 font-sans focus:ring-0"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">Corporate Email</label>
              <div className="flex items-center gap-2.5 bg-white/[0.02] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-gray-400 focus-within:border-brand-purple-500/50 transition-colors">
                <Mail className="w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={signupEmail}
                  onChange={e => setSignupEmail(e.target.value)}
                  placeholder="john.doe@kenzo.com"
                  className="bg-transparent border-none text-xs w-full text-white placeholder-gray-500 font-sans focus:ring-0"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">Password</label>
              <div className="flex items-center gap-2.5 bg-white/[0.02] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-gray-400 focus-within:border-brand-purple-500/50 transition-colors">
                <Lock className="w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  value={signupPassword}
                  onChange={e => setSignupPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="bg-transparent border-none text-xs w-full text-white placeholder-gray-500 font-sans focus:ring-0"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as 'Employee' | 'Admin')}
                  className="w-full bg-[#090A0F] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  <option value="Employee">Employee</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">Department</label>
                <select
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                  className="w-full bg-[#090A0F] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  <option value="dept_eng">Engineering</option>
                  <option value="dept_sal">Sales</option>
                  <option value="dept_mkt">Marketing</option>
                  <option value="dept_ops">Finance/Ops</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">Corporate Designation</label>
              <div className="flex items-center gap-2.5 bg-white/[0.02] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-gray-400 focus-within:border-brand-purple-500/50 transition-colors">
                <Briefcase className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer"
                  className="bg-transparent border-none text-xs w-full text-white placeholder-gray-500 font-sans focus:ring-0"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-purple-600 to-brand-orange-500 hover:from-brand-purple-700 hover:to-brand-orange-600 text-white font-semibold text-xs shadow-lg transition-all duration-200"
            >
              {loading ? 'Creating Profile Security Keys...' : 'Register Enterprise Profile'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
