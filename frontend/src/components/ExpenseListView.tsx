import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Expense, ExpenseStatus, ExpenseCategory } from '../types';
import {
  Search,
  Filter,
  Eye,
  FileDown,
  Trash2,
  AlertOctagon,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  HelpCircle,
  Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const ExpenseListView: React.FC = () => {
  const { expenses, currentUser, updateExpenseStatus, deleteExpense, setCurrentTab } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeExpense, setActiveExpense] = useState<Expense | null>(null);
  const [adminComment, setAdminComment] = useState('');

  const isEmployee = currentUser.role === 'Employee';

  // Filters logic
  const filteredExpenses = expenses.filter(exp => {
    // Role matching: Employees only see their own expenses
    if (isEmployee && exp.employeeId !== currentUser.id) return false;

    // Search matching
    const searchMatch =
      exp.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.id.toLowerCase().includes(searchTerm.toLowerCase());

    // Status matching
    const statusMatch = selectedStatus === 'ALL' || exp.status === selectedStatus;

    // Category matching
    const catMatch = selectedCategory === 'ALL' || exp.category === selectedCategory;

    return searchMatch && statusMatch && catMatch;
  });

  const categoriesList: ExpenseCategory[] = [
    'Travel', 'Meals', 'Accommodation', 'Fuel', 'Office Supplies',
    'Software Subscription', 'Cloud Services', 'Internet', 'Other'
  ];

  const handleAction = (status: ExpenseStatus) => {
    if (!activeExpense) return;
    updateExpenseStatus(activeExpense.id, status, adminComment);

    if (status === 'Approved' || status === 'Reimbursed') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    // Refresh active modal status
    setActiveExpense(prev => prev ? {
      ...prev,
      status: status,
      history: [
        ...prev.history,
        {
          id: `h_temp_${Date.now()}`,
          status: status,
          updatedBy: currentUser.name,
          updatedAt: new Date().toISOString(),
          comment: adminComment
        }
      ]
    } : null);

    setAdminComment('');
  };

  const triggerCsvExport = () => {
    // Generate simple CSV payload string
    const headers = 'ID,Employee,Merchant,Category,Amount,Tax,Date,Payment,Status\n';
    const rows = filteredExpenses.map(e =>
      `"${e.id}","${e.employeeName}","${e.merchant}","${e.category}",${e.amount},${e.taxAmount},"${e.date}","${e.paymentMethod}","${e.status}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Kenzo_Kore_Expenses_${Date.now()}.csv`);
    a.click();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Expense Database</h2>
          <p className="text-gray-400 text-xs mt-1">
            {isEmployee ? 'Manage, track, and audit your personal claims.' : 'Manage company-wide audit trails and database records.'}
          </p>
        </div>
        <div className="flex gap-2">
          {!isEmployee && (
            <button
              onClick={() => setCurrentTab('new-expense')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-gradient-to-r from-brand-purple-600 to-brand-orange-500 hover:from-brand-purple-700 hover:to-brand-orange-600 text-white rounded-xl shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          )}
          <button
            onClick={triggerCsvExport}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-gray-200 hover:text-white border border-white/[0.06] rounded-xl transition-all"
          >
            <FileDown className="w-4 h-4 text-brand-purple-400" />
            Export CSV Data
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl px-3.5 py-2 w-full md:max-w-sm text-gray-400 focus-within:border-brand-purple-500/40 transition-colors">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search merchant, ID, employee..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-transparent border-none text-xs w-full placeholder-gray-500 text-white font-sans focus:ring-0"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="bg-transparent border-none text-white focus:ring-0 text-xs cursor-pointer font-sans"
            >
              <option value="ALL" className="bg-[#090A0F]">All Statuses</option>
              <option value="Draft" className="bg-[#090A0F]">Draft</option>
              <option value="Submitted" className="bg-[#090A0F]">Submitted</option>
              <option value="Pending Manager" className="bg-[#090A0F]">Pending Manager</option>
              <option value="Pending Finance" className="bg-[#090A0F]">Pending Finance</option>
              <option value="Approved" className="bg-[#090A0F]">Approved</option>
              <option value="Returned" className="bg-[#090A0F]">Returned</option>
              <option value="Reimbursed" className="bg-[#090A0F]">Reimbursed</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-2 text-xs">
            <Layers className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-transparent border-none text-white focus:ring-0 text-xs cursor-pointer font-sans"
            >
              <option value="ALL" className="bg-[#090A0F]">All Categories</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat} className="bg-[#090A0F]">
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/[0.05]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-gray-400 font-semibold uppercase tracking-wider">
                <th className="p-4">Merchant & ID</th>
                <th className="p-4">Date</th>
                <th className="p-4">Category</th>
                {!isEmployee && <th className="p-4">Employee</th>}
                <th className="p-4">Amount</th>
                <th className="p-4">Compliance Flags</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-white/[0.02] transition-colors duration-150">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <div className="font-semibold text-white">{exp.title}</div>
                        <div className="text-[10px] text-gray-500 font-sans mt-0.5 max-w-[200px] truncate">{exp.merchant}</div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-300 font-sans">{exp.date}</td>
                    <td className="p-4 text-gray-300">{exp.category}</td>
                    {!isEmployee && (
                      <td className="p-4 font-semibold text-gray-200">
                        {exp.employeeName}
                      </td>
                    )}
                    <td className="p-4 text-right font-bold text-white">
                      ₹{exp.amount.toFixed(2)}
                    </td>
                    <td className="p-4">
                      {exp.policyViolations.length > 0 ? (
                        <div className="flex items-center gap-1 text-amber-500 font-sans font-medium text-[10px] bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full w-fit">
                          <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                          <span>Violated ({exp.policyViolations.length})</span>
                        </div>
                      ) : (
                        <span className="text-gray-500 font-sans text-[10px]">Compliant</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                          exp.status === 'Reimbursed'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : exp.status === 'Approved'
                            ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                            : exp.status === 'Returned'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            : exp.status === 'Draft'
                            ? 'bg-zinc-800 border-zinc-700 text-gray-300'
                            : 'bg-zinc-500/10 border-zinc-500/20 text-gray-400'
                        }`}
                      >
                        {exp.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setActiveExpense(exp)}
                          className="p-2 rounded-xl bg-white/[0.04] hover:bg-brand-purple-500/10 text-gray-300 hover:text-brand-purple-400 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(exp.status === 'Draft' || !isEmployee) && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete this expense claim from ${exp.employeeName} for $${exp.amount}?`)) {
                                deleteExpense(exp.id);
                              }
                            }}
                            className="p-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/10 text-gray-300 hover:text-rose-400 transition-colors"
                            title="Delete expense"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isEmployee ? 7 : 8} className="p-8 text-center text-gray-500 font-sans text-xs">
                    No matching expenses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Detailed Modal */}
      {activeExpense && (
        <div className="fixed inset-0 z-50 bg-[#030304]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-white/[0.08] max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-brand-orange-400 font-bold uppercase tracking-wider">
                  Expense Details — {activeExpense.id}
                </span>
                <h3 className="text-xl font-bold text-white mt-1">{activeExpense.title}</h3>
              </div>
              <button
                onClick={() => {
                  setActiveExpense(null);
                  setAdminComment('');
                }}
                className="text-gray-400 hover:text-white p-2 hover:bg-white/[0.04] rounded-lg transition-colors font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Form Info */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Purpose & Summary</h4>
                  <div className="mt-2 space-y-3 bg-white/[0.01] border border-white/[0.04] rounded-2xl p-4 text-xs font-sans">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Employee</span>
                      <span className="font-semibold text-white">{activeExpense.employeeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Location</span>
                      <span className="font-semibold text-white">{activeExpense.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type</span>
                      <span className="font-semibold text-white">{activeExpense.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Topic</span>
                      <span className="font-semibold text-white max-w-[200px] truncate text-right">{activeExpense.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Description of Expense</span>
                      <span className="font-semibold text-white max-w-[200px] text-right break-words">{activeExpense.businessPurpose}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Payment Mode</span>
                      <span className="font-semibold text-white">{activeExpense.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tax Amount</span>
                      <span className="font-semibold text-white">₹{activeExpense.taxAmount.toFixed(2)}</span>
                    </div>
                    {activeExpense.gstNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">GST Number</span>
                        <span className="font-semibold text-brand-purple-300 font-mono">{activeExpense.gstNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-white/[0.04] pt-2 mt-2 text-sm">
                      <span className="text-gray-400 font-medium">Claim Amount</span>
                      <span className="font-extrabold text-white">₹{activeExpense.amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Compliance Violations Block */}
                {activeExpense.policyViolations.length > 0 && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                      <AlertOctagon className="w-4 h-4 shrink-0" />
                      <span>Policy Violations & Fraud Risk</span>
                    </div>
                    <ul className="list-disc pl-4 text-[10px] text-gray-300 font-sans space-y-1">
                      {activeExpense.policyViolations.map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Workflow Log Timeline */}
                <div>
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Workflow Audit Timeline</h4>
                  <div className="space-y-4 relative pl-4 border-l border-white/[0.05] ml-2 text-xs">
                    {activeExpense.history.map(item => (
                      <div key={item.id} className="relative group">
                        <span className="absolute -left-[20px] top-1 w-2.5 h-2.5 rounded-full bg-brand-purple-500 ring-4 ring-[#090A0F] group-last:bg-brand-orange-500" />
                        <div className="flex justify-between text-gray-400 font-sans text-[10px]">
                          <span>{item.updatedBy}</span>
                          <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                        </div>
                        <p className="font-semibold text-white mt-0.5">{item.status}</p>
                        {item.comment && (
                          <p className="text-gray-500 italic mt-0.5 text-[10px] font-sans">"{item.comment}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Receipt Image Preview / OCR & Actions */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Receipt / Bill Attachment</h4>
                  {activeExpense.receiptUrl ? (
                    <div>
                      {activeExpense.receiptUrl.startsWith('blob:') || activeExpense.receiptUrl.startsWith('http') || activeExpense.receiptUrl.startsWith('data:') ? (
                        /* Render direct live files uploads (blob URLs) */
                        activeExpense.receiptUrl.includes('application/pdf') || activeExpense.title.toLowerCase().includes('pdf') || activeExpense.businessPurpose.toLowerCase().includes('pdf') ? (
                          <iframe
                            src={activeExpense.receiptUrl}
                            className="w-full h-64 rounded-2xl border border-white/[0.08] bg-white/[0.02]"
                            title="Receipt Preview PDF"
                          />
                        ) : (
                          <img
                            src={activeExpense.receiptUrl}
                            className="w-full h-64 object-contain rounded-2xl border border-white/[0.08] bg-black/25"
                            alt="Receipt Preview Image"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=400&q=80';
                            }}
                          />
                        )
                      ) : (
                        /* Render default presets */
                        <div className="border border-white/[0.06] rounded-2xl overflow-hidden bg-black/40 h-64 flex flex-col items-center justify-center p-6 text-center text-xs">
                          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
                            <FileDown className="w-8 h-8 text-brand-purple-400" />
                          </div>
                          <span className="text-white font-bold truncate max-w-[200px] block">{activeExpense.receiptUrl}</span>
                          <span className="text-gray-500 mt-1 font-sans">Simulated OCR scanning confirmed. File secured in S3 storage vault.</span>
                          <a
                            href="#"
                            onClick={e => { e.preventDefault(); alert('Downloading file package... (Presigned S3 link generated)'); }}
                            className="mt-4 text-xs font-semibold text-brand-purple-400 hover:underline flex items-center gap-1"
                          >
                            Download Original Receipt
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border border-white/[0.06] border-dashed rounded-2xl h-64 flex flex-col items-center justify-center p-6 text-center text-xs text-gray-500">
                      <span>No receipts uploaded for this draft.</span>
                    </div>
                  )}
                </div>

                {/* Manager / Admin Audit Actions Panel */}
                {!isEmployee && (activeExpense.status === 'Submitted' || activeExpense.status === 'Pending Manager' || activeExpense.status === 'Pending Finance') && (
                  <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold text-white">Auditor Controls</h4>
                    <textarea
                      placeholder="Add an internal comment or rejection reason..."
                      value={adminComment}
                      onChange={e => setAdminComment(e.target.value)}
                      rows={2}
                      className="w-full bg-[#090A0F] border border-white/[0.06] rounded-xl p-2.5 text-xs text-white placeholder-gray-500 font-sans focus:border-brand-purple-500/50"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction('Approved')}
                        className="flex-1 bg-brand-purple-600 hover:bg-brand-purple-700 text-white font-bold py-2 rounded-xl text-xs transition"
                      >
                        Approve Claim
                      </button>
                      <button
                        onClick={() => handleAction('Returned')}
                        className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold px-4 py-2 rounded-xl text-xs transition border border-amber-500/20"
                      >
                        Return to Draft
                      </button>
                      <button
                        onClick={() => handleAction('Rejected')}
                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold px-4 py-2 rounded-xl text-xs transition border border-rose-500/25"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
