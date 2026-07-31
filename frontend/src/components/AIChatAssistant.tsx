import React, { useState } from 'react';
import { BrainCircuit, Send, Sparkles, MessageSquare, Terminal } from 'lucide-react';

interface ChatMessage {
  sender: 'ai' | 'user';
  text: string;
  attachment?: React.ReactNode;
}

export const AIChatAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: 'Hello! I am your Kenzo Kore Financial AI Assistant. Ask me anything about policies, spend forecasts, or transactions. For example: "Who went over budget?" or "Verify duplicate receipts".'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const predefinedQueries = [
    { label: 'Who went over budget?', query: 'Who went over budget?' },
    { label: 'Verify duplicate receipts', query: 'Verify duplicate receipts' },
    { label: 'Show AWS spend forecast', query: 'Show AWS spend forecast' }
  ];

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const newMsgs: ChatMessage[] = [...messages, { sender: 'user', text }];
    setMessages(newMsgs);
    setInputVal('');
    setIsTyping(true);

    setTimeout(() => {
      let replyText = "I parsed your database request. Here is what I found:";
      let replyNode: React.ReactNode = null;

      if (text.toLowerCase().includes('budget')) {
        replyText = "Engineering department spent ₹48,500 representing 40.4% consumption. AWS Cloud Infrastructure budget is forecasted to exceed allocated limits by September 12. Sales and BD spent ₹62,100 (65.3% consumption).";
        replyNode = (
          <div className="mt-2 p-3 bg-brand-orange-500/10 border border-brand-orange-500/20 rounded-xl space-y-1.5 text-[10px] text-gray-300 font-sans">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>⚠️ Budget Warning (FY26 Q3)</span>
            </div>
            <p><strong>Cloud Services:</strong> 76.7% Consumed (₹61.4k of ₹80k limit).</p>
            <p><strong>Meals & dining:</strong> 61.0% Consumed (₹9.1k of ₹15k limit).</p>
          </div>
        );
      } else if (text.toLowerCase().includes('duplicate')) {
        replyText = "I found 1 critical duplication warning in the audit queue. An expense titled 'Double Booking Test Expense' submitted by Sujal Kumar on 2026-07-25 (₹120.00) matches an approved expense ID exp_102 (JW Marriott Dinner) exactly.";
        replyNode = (
          <div className="mt-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1 text-[10px] text-gray-300 font-sans">
            <p className="font-bold text-white">🔥 Duplicate Match Found</p>
            <p>• <strong>ID exp_106</strong> matches <strong>exp_102</strong></p>
            <p>• <strong>Merchant:</strong> JW Marriott Dining Room</p>
            <p>• <strong>Claim Value:</strong> ₹120.00 (same invoice file)</p>
          </div>
        );
      } else if (text.toLowerCase().includes('aws') || text.toLowerCase().includes('forecast')) {
        replyText = "AWS cloud hosting spend is ₹1,450.50 for July. Forecasted average increases by 8.4% month-over-month due to next-gen SaaS portal migration clusters scaling up. Recommend provisioning spot instances.";
      } else {
        replyText = `Understood. I searched your personal ledger database for "${text}", but no active anomalies or policy alerts were registered under this search index query.`;
      }

      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: replyText,
          attachment: replyNode || undefined
        }
      ]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div className="glass-panel p-6 rounded-3xl space-y-4 flex flex-col h-[400px] justify-between border border-brand-purple-500/15">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 shrink-0">
        <BrainCircuit className="w-5 h-5 text-brand-purple-400" />
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Chat Assistant</h3>
          <span className="text-[9px] text-gray-500 font-sans">Natural Language Audit Ledger queries</span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2 text-xs font-sans">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col gap-1 max-w-[85%] ${
              m.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
            }`}
          >
            <div
              className={`p-3 rounded-2xl ${
                m.sender === 'user'
                  ? 'bg-brand-purple-600 text-white rounded-br-none'
                  : 'bg-white/[0.03] border border-white/[0.06] text-gray-300 rounded-bl-none'
              }`}
            >
              {m.text}
              {m.attachment}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-1.5 items-center mr-auto text-gray-500 italic p-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-purple-500 animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-brand-purple-500 animate-bounce delay-75" />
            <span className="w-1.5 h-1.5 rounded-full bg-brand-purple-500 animate-bounce delay-150" />
            <span className="text-[10px] ml-1 uppercase font-bold tracking-widest text-gray-600 font-sans">Processing audit</span>
          </div>
        )}
      </div>

      {/* Inputs area */}
      <div className="space-y-3 shrink-0">
        {/* Predefined prompt pills */}
        <div className="flex flex-wrap gap-1.5">
          {predefinedQueries.map(p => (
            <button
              key={p.label}
              onClick={() => handleSend(p.query)}
              className="text-[9px] font-semibold bg-white/[0.03] border border-white/[0.06] hover:bg-brand-purple-500/10 hover:text-brand-purple-300 text-gray-400 px-2 py-1 rounded-full transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="flex gap-2 items-center bg-[#090A0F]/65 border border-white/[0.06] rounded-xl px-3 py-2 focus-within:border-brand-purple-500/50">
          <input
            type="text"
            placeholder="Ask AI assistant..."
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend(inputVal); }}
            className="flex-1 bg-transparent border-none text-xs text-white placeholder-gray-500 font-sans focus:ring-0"
          />
          <button
            onClick={() => handleSend(inputVal)}
            className="text-brand-purple-400 hover:text-brand-purple-300 transition-colors p-1"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
