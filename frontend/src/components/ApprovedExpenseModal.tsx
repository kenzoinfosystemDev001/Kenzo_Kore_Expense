import React, { useEffect } from 'react';
import { useApp } from '../AppContext';
import { CheckCircle2, X, Sparkles, Tag, DollarSign, FileText, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export const ApprovedExpenseModal: React.FC = () => {
  const { currentUser, approvedPopups, dismissApprovedPopup } = useApp();

  // Find the first approved popup for the currently logged-in user
  const userPopup = approvedPopups.find(p => p.employeeId === currentUser?.id || p.employeeName === currentUser?.name);

  useEffect(() => {
    if (userPopup) {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 }
      });
    }
  }, [userPopup?.id]);

  if (!userPopup) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      {/* Glow background behind modal */}
      <div className="absolute w-[450px] h-[450px] bg-[#00A3FF]/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Modal Container */}
      <div className="w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 border border-[#00C8FF]/30 shadow-[0_0_50px_rgba(0,163,255,0.25)] space-y-6 relative z-10 animate-scaleUp my-auto max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={() => dismissApprovedPopup(userPopup.id)}
          className="absolute top-5 right-5 text-gray-400 hover:text-white p-1.5 hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Celebration Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#00A3FF]/20 to-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse-ring">
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            </div>
            <Sparkles className="w-5 h-5 text-[#00C8FF] absolute -top-1 -right-1 animate-bounce" />
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-[#00C8FF] uppercase tracking-widest bg-[#00A3FF]/10 border border-[#00C8FF]/20 px-3 py-1 rounded-full font-sans">
              Official Notification
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight mt-2 font-sans">
              Expense Approved 🎉
            </h2>
            <p className="text-gray-400 text-xs mt-1">
              Your submitted expense claim has been reviewed and cleared by Admin.
            </p>
          </div>
        </div>

        {/* Expense Details Card */}
        <div className="bg-[#030712]/90 border border-[#00C8FF]/15 rounded-2xl p-5 space-y-4 shadow-inner">
          {/* Amount Badge */}
          <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-[#00A3FF]/15 via-[#00C8FF]/10 to-transparent border border-[#00C8FF]/25 rounded-xl">
            <span className="text-xs font-semibold text-gray-300">Approved Claim Amount</span>
            <span className="text-xl font-extrabold text-[#00E0FF] tracking-tight">
              ₹{userPopup.amount.toFixed(2)}
            </span>
          </div>

          {/* Details Grid */}
          <div className="space-y-3 text-xs font-sans">
            {/* Topic */}
            <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <FileText className="w-4 h-4 text-[#00C8FF] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Topic / Title</span>
                <span className="font-bold text-white text-sm truncate block mt-0.5">{userPopup.title}</span>
              </div>
            </div>

            {/* Type / Category */}
            <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <Tag className="w-4 h-4 text-[#00C8FF] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Expense Type</span>
                <span className="font-semibold text-emerald-400 text-xs mt-0.5 inline-block bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  {userPopup.category}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <DollarSign className="w-4 h-4 text-[#00C8FF] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Details / Business Purpose</span>
                <p className="text-gray-300 text-xs mt-0.5 leading-relaxed font-sans">
                  {userPopup.description}
                </p>
              </div>
            </div>

            {/* Approver Note */}
            {userPopup.comment && (
              <div className="p-3 bg-[#00A3FF]/10 border border-[#00C8FF]/20 rounded-xl text-[11px] text-[#00C8FF] font-sans">
                <strong className="block text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Admin Comment:</strong>
                <span className="italic">"{userPopup.comment}"</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => dismissApprovedPopup(userPopup.id)}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0077B6] via-[#00A3FF] to-[#00C8FF] hover:from-[#0088FF] hover:to-[#00E0FF] text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(0,163,255,0.35)] hover:shadow-[0_0_35px_rgba(0,200,255,0.55)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Acknowledge & Close</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
