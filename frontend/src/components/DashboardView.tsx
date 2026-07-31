import React from 'react';
import { useApp } from '../AppContext';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  DollarSign,
  Briefcase,
  Users2,
  ListRestart
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

  // Helper variables
  const isEmployee = currentUser?.role === 'Employee';

  // Calculations for employee context
  const empExpenses = expenses.filter(e => e.employeeId === currentUser?.id);
  const pendingReimbursement = empExpenses
    .filter(e => e.status === 'Submitted' || e.status === 'Pending Manager' || e.status === 'Pending Finance' || e.status === 'Approved')
    .reduce((sum, e) => sum + e.amount, 0);
  const reimbursedTotal = empExpenses
    .filter(e => e.status === 'Approved' || e.status === 'Reimbursed')
    .reduce((sum, e) => sum + e.amount, 0);
  const employeeSpentTotal = empExpenses.reduce((sum, e) => sum + e.amount, 0);
  const policyViolationsCount = empExpenses.filter(e => e.policyViolations.length > 0).length;

  // Calculations for Admin / Manager context
  const allSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
  const companyPending = expenses.filter(e => e.status === 'Submitted' || e.status === 'Pending Manager' || e.status === 'Pending Finance').length;
  const companyReimbursed = expenses.filter(e => e.status === 'Approved' || e.status === 'Reimbursed').reduce((sum, e) => sum + e.amount, 0);
  const totalEmployeesCount = users.length;

  // Prepare chart data for employee (spend trend)
  const employeeTrendData = [
    { date: 'Jul 02', amount: 45.90 },
    { date: 'Jul 12', amount: 345.00 },
    { date: 'Jul 25', amount: 120.00 },
    { date: 'Jul 26', amount: 120.00 },
    { date: 'Jul 28', amount: 1450.50 }
  ];

  // Prepare category distribution chart data
  const categoryMap: { [key: string]: number } = {};
  const relevantExpenses = isEmployee ? empExpenses : expenses;
  relevantExpenses.forEach(e => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
  });

  const pieData = Object.keys(categoryMap).map(key => ({
    name: key,
    value: categoryMap[key]
  }));

  const COLORS = ['#7C3AED', '#EA580C', '#10B981', '#3B82F6', '#EC4899', '#F59E0B'];

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
          <h1 className="text-3xl font-extrabold text-white font-sans tracking-tight">
            Welcome back, {currentUser.name}
          </h1>
          <p className="text-gray-400 text-sm font-sans mt-1">
            Here's what is happening with {isEmployee ? 'your personal' : 'Kenzo Infosystems'} expenses today.
          </p>
        </div>
        {isEmployee && (
          <button
            onClick={() => setCurrentTab('new-expense')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-brand-purple-600 to-brand-orange-500 hover:from-brand-purple-700 hover:to-brand-orange-600 text-white font-semibold text-sm shadow-lg hover:shadow-brand-purple-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Create Expense Claim
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isEmployee ? (
          <>
            {/* Card 1 */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Reimbursement</span>
                  <div className="mt-4 flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-white">₹{pendingReimbursement.toFixed(2)}</h3>
                    <span className="text-[10px] text-gray-500 font-sans font-medium uppercase tracking-widest">In Queue</span>
                  </div>
                </div>
                <div className="p-3 bg-brand-purple-500/10 rounded-xl text-brand-purple-400">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
              </div>
              <div className="mt-4 text-[11px] text-gray-500 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-brand-orange-500" />
                <span>Awaiting finance clearance</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Reimbursed</span>
                  <div className="mt-4 flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-emerald-400">₹{reimbursedTotal.toFixed(2)}</h3>
                    <span className="text-[10px] text-gray-500 font-sans font-medium uppercase tracking-widest">Settled</span>
                  </div>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 text-[11px] text-gray-500 flex items-center gap-1">
                <span>Transferred directly to bank account</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Spent (FY26)</span>
                  <h3 className="text-2xl font-bold text-white">₹{employeeSpentTotal.toFixed(2)}</h3>
                </div>
                <div className="p-3 bg-brand-orange-500/10 rounded-xl text-brand-orange-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 text-[11px] text-gray-500 flex items-center gap-1">
                <span>Calculated from all active claims</span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Policy Flagged Claims</span>
                  <h3 className={`text-2xl font-bold ${policyViolationsCount > 0 ? 'text-amber-500' : 'text-white'}`}>
                    {policyViolationsCount}
                  </h3>
                </div>
                <div className={`p-3 rounded-xl ${policyViolationsCount > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400'}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 text-[11px] text-gray-500">
                <span>{policyViolationsCount > 0 ? 'Needs manager justification note' : 'Excellent! Policy compliant'}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Admin Card 1 */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Company Total Spend</span>
                  <h3 className="text-2xl font-bold text-white">₹{allSpend.toFixed(2)}</h3>
                </div>
                <div className="p-3 bg-brand-purple-500/10 rounded-xl text-brand-purple-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 text-[11px] text-gray-500 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-brand-orange-500 animate-bounce" />
                <span>Across all departments & categories</span>
              </div>
            </div>

            {/* Admin Card 2 */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Awaiting Approvals</span>
                  <div className="mt-4 flex items-baseline gap-2">
                    <h3 className={`text-2xl font-bold ${companyPending > 0 ? 'text-brand-orange-400' : 'text-white'}`}>
                      {companyPending}
                    </h3>
                  </div>
                </div>
                <div className="p-3 bg-brand-orange-500/10 rounded-xl text-brand-orange-400">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 text-[11px] text-gray-500">
                <button onClick={() => setCurrentTab('approvals')} className="text-brand-purple-400 hover:underline flex items-center gap-0.5">
                  Go to Approval Queue <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Admin Card 3 */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Reimbursed (Company)</span>
                  <div className="mt-4 flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-emerald-400">₹{companyReimbursed.toFixed(2)}</h3>
                    <span className="text-[10px] text-gray-500 font-sans font-medium uppercase tracking-widest">Settled</span>
                  </div>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 text-[11px] text-gray-500">
                <span>Direct transfers cleared successfully</span>
              </div>
            </div>

            {/* Admin Card 4 */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Employees</span>
                  <h3 className="text-2xl font-bold text-white">{totalEmployeesCount}</h3>
                </div>
                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                  <Users2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 text-[11px] text-gray-500">
                <span>Kenzo Infosystems directory count</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart (2/3 width on desktop) */}
        <div className="glass-panel p-6 rounded-3xl lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-white tracking-wide uppercase">Expense Spend Analysis</h3>
            <span className="text-[10px] bg-brand-purple-950 text-brand-purple-300 border border-brand-purple-500/20 px-2.5 py-1 rounded-full font-medium uppercase">
              Real-time update
            </span>
          </div>

          <div className="h-72 w-full text-xs">
            {/* Recharts Analytics Rendering */}
            {isEmployee ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={employeeTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} tickFormatter={value => `₹${value}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090A0F', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: any) => `₹${value}`}
                  />
                  <Area type="monotone" dataKey="amount" name="Spent (₹)" stroke="#7C3AED" strokeWidth={2} fillOpacity={1} fill="url(#colorSpent)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetProgressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090A0F', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}
                  />
                  <Legend wrapperStyle={{ color: '#fff' }} />
                  <Bar dataKey="Allocated" fill="#1F2937" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Spent" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Pie Chart (1/3 width on desktop) */}
        <div className="glass-panel p-6 rounded-3xl space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-white tracking-wide uppercase">Category Breakdown</h3>
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
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

          {/* Pie Chart Legend */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-medium max-h-24 overflow-y-auto pr-1">
            {pieData.map((d, index) => (
              <div key={d.name} className="flex items-center gap-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-gray-400 truncate">{d.name}</span>
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
                      <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
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
