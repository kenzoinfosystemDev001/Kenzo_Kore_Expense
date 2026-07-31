import React, { useState } from 'react';
import { useApp } from './AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ExpenseListView } from './components/ExpenseListView';
import { CreateExpenseView } from './components/CreateExpenseView';
import { ApprovalQueueView } from './components/ApprovalQueueView';
import { AnalyticsView } from './components/AnalyticsView';
import { AuditLogsView } from './components/AuditLogsView';
import { SettingsView } from './components/SettingsView';
import { AIChatAssistant } from './components/AIChatAssistant';

import { AuthView } from './components/AuthView';

function App() {
  const { currentTab, isAuthenticated, currentUser, approvalToast, dismissApprovalToast } = useApp();
  const [collapsed, setCollapsed] = useState(true);

  // If not logged in or currentUser not loaded, force render the login screen
  if (!isAuthenticated || !currentUser) {
    return <AuthView />;
  }

  // Render correct panel
  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'expenses':
        return <ExpenseListView />;
      case 'new-expense':
        return <CreateExpenseView />;
      case 'approvals':
        return <ApprovalQueueView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'audit-logs':
        return <AuditLogsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  const [showMobileChat, setShowMobileChat] = useState(false);
  const showChatAssistant = currentTab === 'dashboard' || currentTab === 'analytics';

  return (
    <div className="flex bg-[#030712] min-h-screen text-[#F3F4F6] font-sans selection:bg-[#00A3FF] selection:text-white relative">
      {/* Dynamic Confetti Canvas placement holder */}
      <canvas id="confetti-canvas" />

      {/* Mobile Sidebar Overlay Backdrop */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <Header collapsed={collapsed} setCollapsed={setCollapsed} />

        {/* Dynamic page container */}
        <main className="flex-1 p-3 sm:p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto pb-20">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 xl:gap-8 items-start">
            {/* Active module view */}
            <div className={`${showChatAssistant ? 'xl:col-span-3' : 'xl:col-span-4'} space-y-6 sm:space-y-8`}>
              {renderActiveView()}
            </div>

            {/* Desktop Chat Assistant Sidebar widget */}
            {showChatAssistant && (
              <div className="xl:col-span-1 sticky top-28 hidden xl:block">
                <AIChatAssistant />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Floating AI Assistant Button (< xl screens) */}
      {showChatAssistant && (
        <button
          onClick={() => setShowMobileChat(true)}
          className="xl:hidden fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full bg-gradient-to-r from-[#0077B6] to-[#00C8FF] text-white flex items-center justify-center shadow-[0_0_25px_rgba(0,163,255,0.5)] cursor-pointer hover:scale-110 active:scale-95 transition-all"
          title="Open Financial AI Assistant"
        >
          <span className="relative flex h-3 w-3 absolute -top-0.5 -right-0.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E0FF] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00E0FF]"></span>
          </span>
          💬
        </button>
      )}

      {/* Mobile AI Assistant Modal Overlay */}
      {showMobileChat && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-lg bg-[#0B172A] border border-[#00C8FF]/30 rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-[#00C8FF]/15 mb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Financial AI Assistant</span>
              <button
                onClick={() => setShowMobileChat(false)}
                className="text-gray-400 hover:text-white px-2 py-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AIChatAssistant />
            </div>
          </div>
        </div>
      )}

      {/* Targeted Employee Approval Pop-Up Notification */}
      {approvalToast && currentUser?.id === approvalToast.employeeId && (
        <div className="fixed top-6 right-6 z-50 animate-bounce max-w-sm w-full bg-[#0B172A] border-2 border-[#00C8FF] rounded-2xl p-4 shadow-[0_0_40px_rgba(0,200,255,0.4)] space-y-3">
          <div className="flex items-center justify-between border-b border-[#00C8FF]/20 pb-2">
            <div className="flex items-center gap-2 text-[#00C8FF] font-bold text-xs uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>Expense Approved! 🎉</span>
            </div>
            <button
              onClick={dismissApprovalToast}
              className="text-gray-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded-md hover:bg-white/10 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-xs font-sans">
            <div className="flex justify-between items-center bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.04]">
              <span className="text-gray-400 font-medium">Topic</span>
              <span className="font-bold text-white truncate max-w-[180px]">{approvalToast.topic}</span>
            </div>
            <div className="flex justify-between items-center bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.04]">
              <span className="text-gray-400 font-medium">Type</span>
              <span className="font-semibold text-[#00C8FF]">{approvalToast.type}</span>
            </div>
            <div className="flex justify-between items-center bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.04]">
              <span className="text-gray-400 font-medium">Value</span>
              <span className="font-extrabold text-emerald-400 text-sm">₹{approvalToast.value.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
