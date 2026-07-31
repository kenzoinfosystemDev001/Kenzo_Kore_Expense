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
import { ApprovedExpenseModal } from './components/ApprovedExpenseModal';

import { AuthView } from './components/AuthView';

function App() {
  const { currentTab, isAuthenticated } = useApp();
  const [collapsed, setCollapsed] = useState(true);

  // If not logged in, force render the login screen
  if (!isAuthenticated) {
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

  const showChatAssistant = currentTab === 'dashboard' || currentTab === 'analytics';

  return (
    <div className="flex bg-[#030712] min-h-screen text-[#F3F4F6] font-sans selection:bg-[#00A3FF] selection:text-white relative">
      {/* Targeted Employee Expense Approved Pop-up Modal */}
      <ApprovedExpenseModal />

      {/* Dynamic Confetti Canvas placement holder */}
      <canvas id="confetti-canvas" />

      {/* Mobile Sidebar Overlay Backdrop */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <Header collapsed={collapsed} setCollapsed={setCollapsed} />

        {/* Dynamic page container */}
        <main className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
            {/* Active module view */}
            <div className={`${showChatAssistant ? 'xl:col-span-3' : 'xl:col-span-4'} space-y-8`}>
              {renderActiveView()}
            </div>

            {/* Chat Assistant Sidebar widget */}
            {showChatAssistant && (
              <div className="xl:col-span-1 sticky top-28 hidden xl:block">
                <AIChatAssistant />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
