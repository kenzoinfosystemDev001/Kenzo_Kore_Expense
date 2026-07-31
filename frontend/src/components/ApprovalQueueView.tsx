import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { ExpenseStatus } from '../types';
import {
  Check,
  X,
  RotateCcw,
  MessageSquare,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const ApprovalQueueView: React.FC = () => {
  const { expenses, updateExpenseStatus } = useApp();
  const [comments, setComments] = useState<{ [key: string]: string }>({});

  const pendingExpenses = (expenses || []).filter(
    e => e && (e.status === 'Submitted' || e.status === 'Pending Manager' || e.status === 'Pending Finance')
  );

  const handleAction = (id: string, status: ExpenseStatus) => {
    const comment = comments[id] || '';
    updateExpenseStatus(id, status, comment);

    if (status === 'Approved' || status === 'Reimbursed') {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    }

    // Clear comment box
    setComments(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const handleCommentChange = (id: string, text: string) => {
    setComments(prev => ({ ...prev, [id]: text }));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <span className="text-[10px] text-[#00C8FF] font-bold uppercase tracking-wider">Multi-Level Governance</span>
          <h2 className="text-2xl font-extrabold text-white">Expense Approvals & Claims Queue</h2>
        </div>
        <div className="flex items-center gap-2 bg-[#00A3FF]/10 border border-[#00C8FF]/20 px-3.5 py-1.5 rounded-2xl">
          <ShieldAlert className="w-4 h-4 text-[#00C8FF]" />
          <span className="text-xs font-bold text-white">{pendingExpenses.length} Pending Review</span>
        </div>
      </div>

      {pendingExpenses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pendingExpenses.map(exp => {
            const violations = exp.policyViolations || [];
            return (
              <div key={exp.id} className="glass-panel p-6 rounded-3xl space-y-4 border border-white/[0.05] hover:border-[#00C8FF]/20 transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Employee Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#00A3FF]/20 flex items-center justify-center text-[#00C8FF] text-xs font-bold font-mono border border-[#00C8FF]/20">
                        {exp.employeeName ? exp.employeeName[0] : 'K'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white leading-tight">{exp.employeeName}</span>
                        <span className="text-[9px] text-gray-500 font-sans tracking-wide mt-0.5">{exp.id}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-white bg-white/[0.04] px-2.5 py-1 rounded-lg">
                      ₹{exp.amount.toFixed(2)}
                    </span>
                  </div>

                  {/* Expense Details */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">{exp.title}</h4>
                    <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
                      {exp.businessPurpose || 'No business purpose detailed.'}
                    </p>
                  </div>

                  {/* Tags & Metadata */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/[0.02] border border-white/[0.05] text-gray-300">
                        Category: {exp.category}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#00A3FF]/10 border border-[#00C8FF]/20 text-[#00C8FF]">
                        Stage: {exp.status}
                      </span>
                      {violations.length > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium flex items-center gap-1 font-sans">
                          <AlertTriangle className="w-3 h-3" />
                          Policy Violation
                        </span>
                      )}
                    </div>

                    {/* Policy violation list */}
                    {violations.length > 0 && (
                      <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl text-[10px] text-gray-400 font-sans leading-relaxed">
                        <strong>Flags:</strong> {violations.join('; ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Area */}
                <div className="space-y-3 pt-3 border-t border-white/[0.04]">
                  <div className="flex items-center gap-2 bg-[#090A0F]/65 border border-white/[0.06] rounded-xl px-2.5 py-1.5 focus-within:border-[#00C8FF]/40 transition-colors">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Approver comment note..."
                      value={comments[exp.id] || ''}
                      onChange={e => handleCommentChange(exp.id, e.target.value)}
                      className="bg-transparent border-none text-[11px] w-full text-white placeholder-gray-500 font-sans focus:ring-0"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(exp.id, 'Approved')}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#0077B6] via-[#00A3FF] to-[#00C8FF] hover:from-[#0088FF] hover:to-[#00E0FF] text-white font-bold py-2 rounded-xl text-xs shadow-[0_0_15px_rgba(0,163,255,0.3)] transition cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(exp.id, 'Returned')}
                      className="flex items-center justify-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold px-3 py-2 rounded-xl text-xs transition border border-amber-500/20 cursor-pointer"
                      title="Return to employee for corrections"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Return
                    </button>
                    <button
                      onClick={() => handleAction(exp.id, 'Rejected')}
                      className="flex items-center justify-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold px-3.5 py-2 rounded-xl text-xs transition border border-rose-500/20 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-panel p-12 rounded-3xl text-center border border-white/[0.04] bg-white/[0.01]">
          <span className="text-gray-500 font-sans text-xs">No pending expenses in approval queue. All cleared!</span>
        </div>
      )}
    </div>
  );
};
