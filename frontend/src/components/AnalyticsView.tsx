import React from 'react';
import { useApp } from '../AppContext';
import {
  TrendingUp,
  BrainCircuit,
  PieChart as PieIcon,
  Activity,
  Award,
  Sparkles,
  BarChart,
  TrendingDown
} from 'lucide-react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export const AnalyticsView: React.FC = () => {
  const { expenses, budgets, policies } = useApp();

  // 1. Department Wise Spend
  const deptData: { [key: string]: number } = {};
  expenses.forEach(e => {
    const deptName = e.departmentId === 'dept_eng' ? 'Engineering' : e.departmentId === 'dept_sal' ? 'Sales' : e.departmentId === 'dept_mkt' ? 'Marketing' : 'Operations';
    deptData[deptName] = (deptData[deptName] || 0) + e.amount;
  });

  const departmentChartData = Object.keys(deptData).map(key => ({
    name: key,
    Spent: deptData[key]
  }));

  // 2. Employee Wise Spend
  const empData: { [key: string]: number } = {};
  expenses.forEach(e => {
    empData[e.employeeName] = (empData[e.employeeName] || 0) + e.amount;
  });

  const employeeChartData = Object.keys(empData).map(key => ({
    name: key.split(' ')[0], // First name only
    Spent: empData[key]
  }));

  // 3. Category Wise Spend
  const catData: { [key: string]: number } = {};
  expenses.forEach(e => {
    catData[e.category] = (catData[e.category] || 0) + e.amount;
  });

  const categoryChartData = Object.keys(catData).map(key => ({
    name: key,
    value: catData[key]
  }));

  const COLORS = ['#7C3AED', '#EA580C', '#10B981', '#3B82F6', '#EC4899', '#F59E0B', '#6B7280'];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white">Expense Analytics</h2>
        <p className="text-gray-400 text-xs mt-1">
          Detailed metrics, department spent allocations, and AI-powered fiscal auditing insights.
        </p>
      </div>

      {/* AI Insights Panel */}
      <div className="glass-panel p-6 rounded-3xl border border-brand-purple-500/20 bg-gradient-to-tr from-brand-purple-950/20 via-white/[0.01] to-brand-orange-950/10 space-y-4">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-brand-purple-400 animate-pulse" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Kenzo Kore AI Insights</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed">
          {/* Box 1 */}
          <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-2xl space-y-2">
            <span className="font-bold text-brand-purple-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Policy Violations Audit
            </span>
            <p className="text-gray-400 font-sans">
              We detected <strong>1 duplicate submission</strong> matching JW Marriott Hotel Dining. <strong>2 policy threshold violations</strong> were flagged under Meals & Software Subscription categories this week.
            </p>
          </div>

          {/* Box 2 */}
          <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-2xl space-y-2">
            <span className="font-bold text-brand-orange-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Spend Forecasting
            </span>
            <p className="text-gray-400 font-sans">
              AWS Hosting represents <strong>42% of Engineering costs</strong>. Engineering is projected to exhaust Q3 Dev cloud budget by September 12. Recommend server instance cleanup.
            </p>
          </div>

          {/* Box 3 */}
          <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-2xl space-y-2">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              Optimization Suggestion
            </span>
            <p className="text-gray-400 font-sans">
              Switching recurring flight tickets to Air India corporate vouchers will yield approximately <strong>₹1,200 in annual rebates</strong> based on travel histories.
            </p>
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department spend */}
        <div className="glass-panel p-6 rounded-3xl space-y-6">
          <h3 className="text-xs font-semibold text-white tracking-wide uppercase">Department Spend Distribution</h3>
          <div className="h-64 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={departmentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090A0F', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}
                />
                <Bar dataKey="Spent" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Employee spend */}
        <div className="glass-panel p-6 rounded-3xl space-y-6">
          <h3 className="text-xs font-semibold text-white tracking-wide uppercase">Employee Spend Rankings</h3>
          <div className="h-64 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={employeeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090A0F', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}
                />
                <Bar dataKey="Spent" fill="#EA580C" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
