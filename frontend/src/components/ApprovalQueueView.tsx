import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Expense, ExpenseStatus } from '../types';
import { downloadFileAutomatically } from '../utils/downloadHelper';
import {
  Check,
  X,
  RotateCcw,
  MessageSquare,
  AlertTriangle,
  FileText,
  Download,
  User,
  ArrowRight,
  TrendingDown,
  AlertOctagon,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ActionModalState {
  isOpen: boolean;
  expense: Expense | null;
  actionType: 'Rejected' | 'Returned' | null;
  reason: string;
}

export const ApprovalQueueView: React.FC = () => {
  const { expenses, updateExpenseStatus, currentUser } = useApp();
  const [comments, setComments] = useState<{ [key: string]: string }>({});

  // Action Reason Modal State
  const [actionModal, setActionModal] = useState<ActionModalState>({
    isOpen: false,
    expense: null,
    actionType: null,
    reason: ''
  });

  const pendingExpenses = expenses.filter(
    e => e.status === 'Submitted' || e.status === 'Pending Manager' || e.status === 'Pending Finance'
  );

  const handleAction = (id: string, status: ExpenseStatus, customComment?: string) => {
    const comment = customComment !== undefined ? customComment : (comments[id] || '');
    updateExpenseStatus(id, status, comment);

    if (status === 'Approved' || status === 'Reimbursed') {
      confetti({
        particleCount: 80,
        spread: 50,
        origin: { y: 0.7 }
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

  const openActionModal = (expense: Expense, actionType: 'Rejected' | 'Returned') => {
    const initialReason = comments[expense.id] || '';
    setActionModal({
      isOpen: true,
      expense,
      actionType,
      reason: initialReason
    });
  };

  const closeActionModal = () => {
    setActionModal({
      isOpen: false,
      expense: null,
      actionType: null,
      reason: ''
    });
  };

  const submitActionModal = () => {
    if (!actionModal.expense || !actionModal.actionType) return;
    const finalReason = actionModal.reason.trim() || `${actionModal.actionType} by Admin ${currentUser.name}`;
    handleAction(actionModal.expense.id, actionModal.actionType, finalReason);
    closeActionModal();
  };

  const quickTags = actionModal.actionType === 'Returned'
    ? ['Missing Receipt Image', 'GST Invoice Required', 'Incorrect Category', 'Policy Limit Clarification']
    : ['Policy Violation', 'Duplicate Claim Submission', 'Unapproved Vendor', 'Non-reimbursable Expense'];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* View Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white">Approval Queue</h2>
        <p className="text-gray-400 text-xs mt-1">
          Review, accept, reject or return submitted claims from employees of Kenzo Infosystems.
        </p>
      </div>

      {pendingExpenses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pendingExpenses.map(exp => (
            <div key={exp.id} className="glass-panel p-6 rounded-3xl space-y-4 border border-white/[0.05] hover:border-[#00C8FF]/20 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                {/* Employee Header */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-brand-purple-950 flex items-center justify-center text-brand-purple-400 text-xs font-bold font-mono border border-brand-purple-500/10">
                      {exp.employeeName[0]}
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
                  <p className="text-[11px] text-gray-400 font-sans leading-relaxed line-clamp-2">
                    {exp.description || 'No description provided.'}
                  </p>
                </div>

                {/* Badges metadata */}
                <div className="flex flex-wrap items-center gap-2 pt-1.5 text-[10px]">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/[0.02] border border-white/[0.05] text-gray-300">
                    Category: {exp.category}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#1e1b4b] border border-brand-purple-500/20 text-brand-purple-300">
                    Stage: {exp.status}
                  </span>
                  {exp.policyViolations.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium flex items-center gap-1 font-sans">
                      <AlertTriangle className="w-3 h-3" />
                      Policy Violation
                    </span>
                  )}
                </div>

                {/* Attached Bill / Receipt Download Link */}
                {exp.receiptUrl && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => downloadFileAutomatically(exp.receiptUrl!, `${exp.title.replace(/\s+/g, '_')}_Bill`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00A3FF]/10 border border-[#00C8FF]/30 hover:bg-[#00A3FF]/20 text-[#00C8FF] text-[11px] font-semibold transition cursor-pointer"
                      title="Download uploaded document receipt automatically (PDF or Image)"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Attached Bill / Receipt (PDF / Image)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Area */}
              <div className="space-y-3 pt-3 border-t border-white/[0.04]">
                <div className="flex items-center gap-2 bg-[#090A0F]/65 border border-white/[0.06] rounded-xl px-2.5 py-1.5 focus-within:border-[#00C8FF]/40 transition-colors">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Approver comment note (optional for Accept)..."
                    value={comments[exp.id] || ''}
                    onChange={e => handleCommentChange(exp.id, e.target.value)}
                    className="bg-transparent border-none text-[11px] w-full text-white placeholder-gray-500 font-sans focus:ring-0"
                  />
                </div>

                {/* 3 Main Action Buttons: Accept, Returned, Reject */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleAction(exp.id, 'Approved')}
                    className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#0077B6] via-[#00A3FF] to-[#00C8FF] hover:from-[#0088FF] hover:to-[#00E0FF] text-white font-bold py-2 px-3 rounded-xl text-xs shadow-[0_0_15px_rgba(0,163,255,0.3)] transition cursor-pointer"
                    title="Accept and approve this expense request"
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Accept</span>
                  </button>
                  
                  <button
                    onClick={() => openActionModal(exp, 'Returned')}
                    className="flex items-center justify-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold py-2 px-3 rounded-xl text-xs transition border border-amber-500/25 cursor-pointer"
                    title="Click to write reason and return claim to employee"
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    <span>Returned</span>
                  </button>

                  <button
                    onClick={() => openActionModal(exp, 'Rejected')}
                    className="flex items-center justify-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold py-2 px-3 rounded-xl text-xs transition border border-rose-500/25 cursor-pointer"
                    title="Click to write reason and reject claim"
                  >
                    <X className="w-3.5 h-3.5 shrink-0" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel p-12 rounded-3xl text-center border border-white/[0.04] bg-white/[0.01]">
          <span className="text-gray-500 font-sans text-xs">No pending expenses in approval queue. All cleared!</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESPONSIVE REASON COMMENT MODAL FOR REJECT & RETURNED ACTIONS */}
      {/* ========================================================================= */}
      {actionModal.isOpen && actionModal.expense && actionModal.actionType && (
        <div className="fixed inset-0 z-50 bg-[#030304]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 border border-white/[0.08] shadow-2xl space-y-5 text-left relative animate-fadeIn max-h-[90vh] flex flex-col justify-between">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${
                  actionModal.actionType === 'Returned' 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {actionModal.actionType === 'Returned' ? (
                    <RotateCcw className="w-5 h-5" />
                  ) : (
                    <AlertOctagon className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {actionModal.actionType === 'Returned' ? 'Return Expense Request' : 'Reject Expense Request'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {actionModal.actionType === 'Returned'
                      ? 'Specify the reason for returning this claim to the employee for review.'
                      : 'Specify the reason for rejecting this claim.'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeActionModal}
                className="text-gray-400 hover:text-white p-1.5 hover:bg-white/[0.05] rounded-xl transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Expense Context Info Box */}
            <div className="p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-2xl flex items-center justify-between text-xs font-sans">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Expense Item</span>
                <span className="text-white font-bold block mt-0.5">{actionModal.expense.title}</span>
                <span className="text-gray-400 text-[10px] block">Submitted by {actionModal.expense.employeeName}</span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Amount</span>
                <span className="text-[#00C8FF] font-extrabold text-sm block mt-0.5">₹{actionModal.expense.amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Reason Text Area Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-200 block">
                {actionModal.actionType === 'Returned' ? 'Return Feedback Reason *' : 'Rejection Reason *'}
              </label>
              <textarea
                rows={3}
                autoFocus
                placeholder={
                  actionModal.actionType === 'Returned'
                    ? 'Write the feedback note for the employee (e.g. receipt image is blurry, please attach GST tax invoice)...'
                    : 'Write the reason for rejection (e.g. expense violates policy limit, duplicate entry)...'
                }
                value={actionModal.reason}
                onChange={e => setActionModal(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full bg-[#090A0F] border border-white/[0.1] rounded-2xl p-3 text-xs text-white placeholder-gray-500 font-sans focus:border-[#00C8FF] focus:ring-1 focus:ring-[#00C8FF] outline-none transition"
              />

              {/* Quick Suggestion Tags */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-semibold text-gray-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#00C8FF]" />
                  Quick Reasons (Click to insert):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setActionModal(prev => ({
                        ...prev,
                        reason: prev.reason ? `${prev.reason}. ${tag}` : tag
                      }))}
                      className="text-[10px] px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/[0.06] transition cursor-pointer"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={closeActionModal}
                className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={submitActionModal}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer ${
                  actionModal.actionType === 'Returned'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 shadow-amber-500/20'
                    : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 shadow-rose-500/20'
                }`}
              >
                {actionModal.actionType === 'Returned' ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirm & Return</span>
                  </>
                ) : (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Confirm & Reject</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
