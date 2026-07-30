import React from 'react';
import { useApp } from '../AppContext';
import { ShieldCheck, Calendar, HardDrive, KeyRound } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { auditLogs } = useApp();

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white">Immutable Security Audit Logs</h2>
        <p className="text-gray-400 text-xs mt-1">
          Detailed cryptographic transaction tracing for corporate fiscal accountability (Compliance standard SOC-2).
        </p>
      </div>

      {/* Database logs list */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/[0.05]">
        <div className="p-4 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between text-xs">
          <span className="font-bold text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand-purple-400" />
            Active Transaction Audit Chain
          </span>
          <span className="text-[10px] text-gray-500 font-mono">STATUS: SYNCED</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] text-gray-500 font-medium uppercase tracking-wider bg-white/[0.01]">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Operator</th>
                <th className="p-4">Action Event</th>
                <th className="p-4">Details</th>
                <th className="p-4 font-mono">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-[11px] font-sans">
              {auditLogs.map(log => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors duration-150">
                  <td className="p-4 text-gray-400 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-white">{log.userName}</span>
                      <span className="text-[9px] text-gray-500 uppercase tracking-wide">{log.userRole}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-md bg-brand-purple-950/40 text-brand-purple-400 font-bold border border-brand-purple-500/10">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-gray-300 font-medium">
                    {log.details}
                  </td>
                  <td className="p-4 text-gray-500 font-mono">
                    {log.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
