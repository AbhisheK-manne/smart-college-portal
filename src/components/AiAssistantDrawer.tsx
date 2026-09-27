import React, { useState } from 'react';
import { Bot, Send, X, Sparkles, AlertCircle, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenComplaintModal?: () => void;
}

export const AiAssistantDrawer: React.FC<Props> = ({ isOpen, onClose, onOpenComplaintModal }) => {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hello ${user?.name || 'Student'}! I am the TKREC AI Campus Assistant. I am directly connected to the Teegala Krishna Reddy Engineering College database to answer questions about your attendance, exam schedules, upcoming events, eligible placements, internships, and department guidelines. How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const quickPrompts = [
    'What is my overall attendance?',
    'Which placements am I eligible for?',
    'What events are happening this week?',
    'Are there any internships available?',
    'How do I contact the HOD?',
    'I have an issue with my attendance',
  ];

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: query }),
      });

      const data = await res.json();
      const aiReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.response || "I couldn't find this information in the college database. Please contact the concerned department.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiReply]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'Unable to reach the campus knowledge base server. Please ensure you are connected to the network or check the dashboard tabs.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
              <Bot className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-base leading-tight">TKREC AI College Assistant</h3>
                <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-emerald-500/20 text-emerald-200 rounded border border-emerald-400/30">Verified RAG</span>
              </div>
              <p className="text-xs text-blue-100/80">Directly grounded in college database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Safety Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-3.5 py-2 flex items-center space-x-2 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>AI outputs strictly verified database data. Sensitive requests require staff authorization.</span>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 shadow-xs text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>
                <div
                  className={`text-[10px] mt-1.5 text-right font-medium ${
                    m.sender === 'user' ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs p-3.5 shadow-xs flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse delay-100"></div>
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse delay-200"></div>
                <span className="text-xs text-slate-500 font-medium pl-1">Consulting college database...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggested Prompts */}
        <div className="p-3 bg-white border-t border-slate-100">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Suggested Inquiries</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 transition text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3.5 bg-white border-t border-slate-200 flex items-center space-x-2">
          <input
            type="text"
            placeholder="Ask about attendance, placements, events, exams..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
            className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
