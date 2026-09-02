import React, { useState } from 'react';
import { useApp } from '../AppContext';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  TrendingDown,
  DollarSign,
  Briefcase,
  Users,
  Users2,
  ListRestart,
  FileText,
  Calendar as CalendarIcon,
  Filter,
  X
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

export const DashboardView: React.FC = () => {
  const { currentUser, expenses, budgets, setCurrentTab, users, deleteUser } = useApp();
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  // Spend Analysis Date & Period State
  const [selectedSpendDate, setSelectedSpendDate] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('ALL');

  // Helper variables
  const isEmployee = currentUser?.role === 'Employee';

  // Calculations for employee context
  const empExpenses = expenses.filter(e => e.employeeId === currentUser?.id);
  
  // FIX: Pending Reimbursement ONLY counts claims awaiting approval (not Approved or Reimbursed)
  const pendingReimbursement = empExpenses
    .filter(e => e.status === 'Submitted' || e.status === 'Pending Manager' || e.status === 'Pending Finance')
    .reduce((sum, e) => sum + e.amount, 0);

  const reimbursedTotal = empExpenses
    .filter(e => e.status === 'Approved' || e.status === 'Reimbursed')
    .reduce((sum, e) => sum + e.amount, 0);

  const employeeSpentTotal = empExpenses.reduce((sum, e) => sum + e.amount, 0);
  const policyViolationsCount = empExpenses.filter(e => e.policyViolations.length > 0).length;
  const totalBillsCount = (isEmployee ? empExpenses : expenses).length;

  // Calculations for Admin / Manager context
  const allSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
  const companyPending = expenses.filter(e => e.status === 'Submitted' || e.status === 'Pending Manager' || e.status === 'Pending Finance').length;
  const companyReimbursed = expenses.filter(e => e.status === 'Approved' || e.status === 'Reimbursed').reduce((sum, e) => sum + e.amount, 0);
  const totalEmployeesCount = users.length;

  // Category Breakdown Color Hierarchy:
  // Rank 1 (highest): Green (#10B981)
  // Rank 2: Blue (#00A3FF)
  // Rank 3: Yellow (#EAB308)
  // Rank 4: Orange (#F97316)
  // Rank 5: Purple (#A855F7)
  // Rank 6: Pink (#EC4899)
  // Rank 7+ (remaining/last): Red (#EF4444)
  const RANKED_COLORS = ['#10B981', '#00A3FF', '#EAB308', '#F97316', '#A855F7', '#EC4899', '#EF4444'];
  const getRankColor = (index: number) => RANKED_COLORS[Math.min(index, RANKED_COLORS.length - 1)];

  // Quarter Filter Helper:
  // Q1: Last 3 months (0 to 3 months prior)
  // Q2: 3 months before Q1 (3 to 6 months prior)
  // Q3: 3 months before Q2 (6 to 9 months prior)
  // Q4: 3 months before Q3 (9 to 12 months prior)
  const isDateInQuarter = (dateStr: string, quarter: string) => {
    if (!dateStr) return false;
    const expDate = new Date(dateStr);
    const now = new Date();
    
    // Total months difference
    const monthDiff = (now.getFullYear() - expDate.getFullYear()) * 12 + (now.getMonth() - expDate.getMonth());

    if (quarter === 'Q1') return monthDiff >= 0 && monthDiff < 3;
    if (quarter === 'Q2') return monthDiff >= 3 && monthDiff < 6;
    if (quarter === 'Q3') return monthDiff >= 6 && monthDiff < 9;
    if (quarter === 'Q4') return monthDiff >= 9 && monthDiff < 12;
    return true;
  };

  // Filtered Spend Analysis data based on Calendar Date or Dropdown Period
  const getFilteredSpendExpenses = () => {
    let list = isEmployee ? empExpenses : expenses;
    const now = new Date();

    if (selectedSpendDate) {
      return list.filter(e => {
        const d = e.date ? e.date.split('T')[0] : '';
        return d === selectedSpendDate;
      });
    }

    if (selectedPeriod !== 'ALL') {
      if (['Q1', 'Q2', 'Q3', 'Q4'].includes(selectedPeriod)) {
        return list.filter(e => isDateInQuarter(e.date, selectedPeriod));
      }

      let days = 0;
      if (selectedPeriod === '15') days = 15;
      else if (selectedPeriod === '30') days = 30;
      else if (selectedPeriod === '60') days = 60;
      else if (selectedPeriod === '90') days = 90;

      if (days > 0) {
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        return list.filter(e => {
          const d = e.date ? new Date(e.date) : new Date();
          return d >= cutoff;
        });
      }
    }
    return list;
  };

  const filteredSpendList = getFilteredSpendExpenses();

  // Map filtered expenses to Trend AreaChart in strict ASCENDING chronological order (oldest -> newest)
  const getTrendChartData = () => {
    // 1. Group expenses by ISO Date YYYY-MM-DD
    const isoDateMap: { [isoKey: string]: { label: string; amount: number } } = {};

    filteredSpendList.forEach(e => {
      if (!e.date) return;
      const rawDate = new Date(e.date);
      if (isNaN(rawDate.getTime())) return;

      // Extract ISO Date YYYY-MM-DD for accurate chronological sorting
      const isoKey = e.date.includes('T') ? e.date.split('T')[0] : rawDate.toISOString().split('T')[0];
      const label = rawDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

      if (!isoDateMap[isoKey]) {
        isoDateMap[isoKey] = { label, amount: 0 };
      }
      isoDateMap[isoKey].amount += (e.amount || 0);
    });

    const sortedIsoKeys = Object.keys(isoDateMap).sort((a, b) => a.localeCompare(b));

    if (sortedIsoKeys.length > 0) {
      return sortedIsoKeys.map(isoKey => ({
        date: isoDateMap[isoKey].label,
        amount: Math.round(isoDateMap[isoKey].amount * 100) / 100,
        fullDate: isoKey,
      }));
    }

    if (selectedSpendDate) {
      const formatted = new Date(selectedSpendDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      return [{ date: formatted, amount: 0 }];
    }

    if (selectedPeriod !== 'ALL') {
      return [{ date: selectedPeriod, amount: 0 }];
    }

    // Default fallback only if no expenses logged yet
    return [
      { date: 'Recent', amount: 0 }
    ];
  };

  const trendChartData = getTrendChartData();

  // Prepare category distribution chart data sorted by spend amount descending for exact color ranking
  const categoryMap: { [key: string]: number } = {};
  const relevantExpenses = isEmployee ? empExpenses : expenses;
  relevantExpenses.forEach(e => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
  });

  const pieData = Object.keys(categoryMap)
    .map(key => ({
      name: key,
      value: categoryMap[key]
    }))
    .sort((a, b) => b.value - a.value); // Sort descending for 1st Most -> Green, 2nd -> Blue, etc.

  // Prepare budget progress data for Admin
  const budgetProgressData = budgets.map(b => ({
    name: b.name.split(' ')[2] || b.name,
    Allocated: b.allocated,
    Spent: b.spent
  }));

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white font-sans tracking-tight flex items-center gap-2">
            Welcome back, <span className="text-[#00C8FF]">{currentUser.name}</span>
          </h1>
          <p className="text-gray-400 text-sm font-sans mt-1">
            Here's what is happening with {isEmployee ? 'your personal' : 'Kenzo Infosystems'} expenses today.
          </p>
        </div>
        {isEmployee && (
          <button
            onClick={() => setCurrentTab('new-expense')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#0077B6] via-[#00A3FF] to-[#00C8FF] hover:from-[#0088FF] hover:to-[#00E0FF] text-white font-bold text-sm shadow-[0_0_20px_rgba(0,163,255,0.3)] transition-all duration-200"
          >
            Create Expense Claim
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isEmployee ? (
          <>
            {/* Card 1 */}
            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Pending Claims</span>
                  <div className="mt-3 flex items-baseline gap-2">
                    <h3 className="text-xl font-extrabold text-white">₹{pendingReimbursement.toFixed(2)}</h3>
                    <span className="text-[9px] text-gray-400 font-sans font-medium uppercase tracking-widest">In Review</span>
                  </div>
                </div>
                <div className="p-2.5 bg-[#00A3FF]/10 rounded-xl text-[#00C8FF]">
                  <Clock className="w-4 h-4 animate-pulse" />
                </div>
              </div>
              <div className="mt-3 text-[10px] text-gray-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-[#00C8FF]" />
                <span>Awaiting approval clearance</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Approved Claims</span>
                  <div className="mt-3 flex items-baseline gap-2">
                    <h3 className="text-xl font-extrabold text-emerald-400">₹{reimbursedTotal.toFixed(2)}</h3>
                    <span className="text-[9px] text-gray-400 font-sans font-medium uppercase tracking-widest">Approved</span>
                  </div>
                </div>
                <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-[10px] text-gray-400 flex items-center gap-1">
                <span>Verified by managers</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Spent (FY26)</span>
                  <h3 className="text-xl font-extrabold text-white mt-3">₹{employeeSpentTotal.toFixed(2)}</h3>
                </div>
                <div className="p-2.5 bg-[#00A3FF]/10 rounded-xl text-[#00C8FF]">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-[10px] text-gray-400 flex items-center gap-1">
                <span>Submitted YTD</span>
              </div>
            </div>

            {/* Card 4: Total Expense Bills */}
            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group border border-[#00C8FF]/20 bg-gradient-to-tr from-[#00A3FF]/10 to-transparent">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#00C8FF] uppercase tracking-wider">Total Expense Bills</span>
                  <h3 className="text-xl font-extrabold text-white mt-3">{totalBillsCount} Bills</h3>
                </div>
                <div className="p-2.5 bg-[#00A3FF]/20 rounded-xl text-[#00E0FF]">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-[10px] text-gray-400 flex items-center gap-1">
                <span>Total claims & document receipts</span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Admin Card 1 */}
            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Company Total Spend</span>
                  <h3 className="text-xl font-extrabold text-white mt-3">₹{allSpend.toFixed(2)}</h3>
                </div>
                <div className="p-2.5 bg-[#00A3FF]/10 rounded-xl text-[#00C8FF]">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-[10px] text-gray-400 flex items-center gap-1">
                <span>Across all departments</span>
              </div>
            </div>

            {/* Admin Card 2 */}
            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Awaiting Approvals</span>
                  <div className="mt-3 flex items-baseline gap-2">
                    <h3 className={`text-xl font-extrabold ${companyPending > 0 ? 'text-[#00C8FF]' : 'text-white'}`}>
                      {companyPending}
                    </h3>
                  </div>
                </div>
                <div className="p-2.5 bg-[#00A3FF]/10 rounded-xl text-[#00C8FF]">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-[10px] text-gray-400 flex items-center gap-1">
                <button onClick={() => setCurrentTab('approvals')} className="text-[#00C8FF] hover:underline font-semibold flex items-center gap-1">
                  Go to Queue →
                </button>
              </div>
            </div>

            {/* Admin Card 3 */}
            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Active Employees</span>
                  <h3 className="text-xl font-extrabold text-white mt-3">{totalEmployeesCount}</h3>
                </div>
                <div className="p-2.5 bg-[#00A3FF]/10 rounded-xl text-[#00C8FF]">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-[10px] text-gray-400 flex items-center gap-1">
                <span>Kenzo directory count</span>
              </div>
            </div>

            {/* Admin Card 4: Total Expense Bills */}
            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group border border-[#00C8FF]/20 bg-gradient-to-tr from-[#00A3FF]/10 to-transparent">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#00C8FF] uppercase tracking-wider">Total Expense Bills</span>
                  <h3 className="text-xl font-extrabold text-white mt-3">{totalBillsCount} Bills</h3>
                </div>
                <div className="p-2.5 bg-[#00A3FF]/20 rounded-xl text-[#00E0FF]">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-[10px] text-gray-400 flex items-center gap-1">
                <span>Total company claims & bills</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart (2/3 width on desktop) */}
        <div className="glass-panel p-6 rounded-3xl lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">Expense Spend Analysis</h3>
              <p className="text-[10px] text-gray-400 font-sans mt-0.5">Filter by specific calendar date or time duration</p>
            </div>

            {/* Calendar Date Picker & Period Filter Dropdown */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Calendar Date Picker */}
              <div
                onClick={() => dateInputRef.current?.showPicker()}
                className="relative flex items-center cursor-pointer group"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-[#00C8FF] absolute left-3 pointer-events-none group-hover:scale-110 transition-transform" />
                <input
                  ref={dateInputRef}
                  type="date"
                  value={selectedSpendDate}
                  onChange={e => {
                    setSelectedSpendDate(e.target.value);
                    setSelectedPeriod('ALL');
                  }}
                  className="bg-[#030712]/90 border border-[#00C8FF]/40 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00C8FF] transition cursor-pointer [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                  style={{ colorScheme: 'dark' }}
                  title="Click to open calendar date picker"
                />
                {selectedSpendDate && (
                  <button
                    onClick={() => setSelectedSpendDate('')}
                    className="ml-1 text-gray-400 hover:text-white p-1 cursor-pointer"
                    title="Clear date filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Time Period Dropdown (without bracket text) */}
              <select
                value={selectedPeriod}
                onChange={e => {
                  setSelectedPeriod(e.target.value);
                  setSelectedSpendDate('');
                }}
                className="bg-[#030712]/90 border border-[#00C8FF]/40 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00C8FF] transition cursor-pointer"
              >
                <option value="ALL">All Time</option>
                <option value="15">Last 15 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="60">Last 60 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </div>
          </div>

          <div className="h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00A3FF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00A3FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,163,255,0.06)" />
                <XAxis dataKey="date" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} tickFormatter={value => `₹${value}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B172A', borderColor: 'rgba(0,200,255,0.2)', borderRadius: '12px' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value: any) => `₹${value}`}
                />
                <Area type="monotone" dataKey="amount" name="Spent (₹)" stroke="#00C8FF" strokeWidth={2} fillOpacity={1} fill="url(#colorSpent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie Chart (1/3 width on desktop) */}
        <div className="glass-panel p-6 rounded-3xl space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">Category Breakdown</h3>
          </div>

          <div className="h-56 relative flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getRankColor(index)} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090A0F', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number) => `₹${value.toFixed(2)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-gray-500 font-sans">No expenses logged yet.</div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] uppercase font-bold text-gray-500">Total</span>
              <span className="text-lg font-extrabold text-white">
                ₹{(isEmployee ? employeeSpentTotal : allSpend).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Pie Chart Legend with Exact Ranked Colors (1st -> Green, 2nd -> Blue, 3rd -> Yellow, etc.) */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-medium max-h-28 overflow-y-auto pr-1">
            {pieData.map((d, index) => (
              <div key={d.name} className="flex items-center gap-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getRankColor(index) }} />
                <span className="text-gray-300 truncate">{d.name}</span>
                <span className="text-white ml-auto">₹{d.value.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activities Panel */}
      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
            {isEmployee ? 'My Recent Transactions' : 'Recent Company Claims'}
          </h3>
          <button
            onClick={() => setCurrentTab('expenses')}
            className="text-xs font-semibold text-brand-purple-400 hover:text-brand-purple-300 flex items-center gap-0.5"
          >
            View Database <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.04] bg-white/[0.01]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] text-gray-500 font-medium">
                <th className="p-4 uppercase">Merchant</th>
                <th className="p-4 uppercase">Date</th>
                <th className="p-4 uppercase">Category</th>
                {!isEmployee && <th className="p-4 uppercase">Employee</th>}
                <th className="p-4 uppercase">Amount</th>
                <th className="p-4 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {relevantExpenses.slice(0, 4).map(exp => (
                <tr key={exp.id} className="hover:bg-white/[0.02] transition-colors duration-150">
                  <td className="p-4 font-bold text-white">{exp.merchant}</td>
                  <td className="p-4 text-gray-400 font-sans">{exp.date}</td>
                  <td className="p-4 text-gray-300">{exp.category}</td>
                  {!isEmployee && <td className="p-4 text-gray-300 font-semibold">{exp.employeeName}</td>}
                  <td className="p-4 font-bold text-white">₹{exp.amount.toFixed(2)}</td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                        exp.status === 'Reimbursed'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : exp.status === 'Approved'
                          ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                          : exp.status === 'Returned'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          : 'bg-zinc-500/10 border-zinc-500/20 text-gray-400'
                      }`}
                    >
                      {exp.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin / Super Admin Employee Directory Control Center */}
      {!isEmployee && (
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide uppercase flex items-center gap-2">
                <Users2 className="w-4 h-4 text-brand-orange-400" />
                Corporate Employee Directory Control
              </h3>
              <p className="text-xs text-gray-400 font-sans mt-0.5">
                Admin & Super Admin permission to add and delete employees from Neon PostgreSQL database.
              </p>
            </div>
            <button
              onClick={() => setCurrentTab('settings')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-purple-600/20 border border-brand-purple-500/30 text-brand-purple-300 hover:bg-brand-purple-600/30 text-xs font-semibold transition-all"
            >
              <span>Manage & Add Employees</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/[0.04] bg-white/[0.01]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-gray-500 font-medium">
                  <th className="p-4 uppercase">Employee Name</th>
                  <th className="p-4 uppercase">Corporate Email</th>
                  <th className="p-4 uppercase">Role</th>
                  <th className="p-4 uppercase">Designation</th>
                  <th className="p-4 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors duration-150">
                    <td className="p-4 font-bold text-white flex items-center gap-2.5">
                      <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/10" style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px', maxWidth: '28px', maxHeight: '28px' }} />
                      <span>{u.name}</span>
                    </td>
                    <td className="p-4 text-gray-300 font-sans">{u.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        u.role === 'Super Admin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        u.role === 'Admin' ? 'bg-brand-purple-500/10 text-brand-purple-400 border border-brand-purple-500/20' :
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 font-sans">{u.designation}</td>
                    <td className="p-4 text-right">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete employee ${u.name} from Neon PostgreSQL?`)) {
                              deleteUser(u.id);
                            }
                          }}
                          className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[11px] font-semibold border border-rose-500/20 transition-all"
                        >
                          Delete Employee
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
