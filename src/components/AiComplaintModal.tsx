import React, { useState } from 'react';
import { X, AlertCircle, Sparkles, CheckCircle2, Send, ShieldAlert, Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onComplaintCreated?: () => void;
}

export const AiComplaintModal: React.FC<Props> = ({ isOpen, onClose, onComplaintCreated }) => {
  const { token } = useAuth();
  const [category, setCategory] = useState('Attendance');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [triaging, setTriaging] = useState(false);
  const [triagePreview, setTriagePreview] = useState<any>(null);
  const [successTicket, setSuccessTicket] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    'Attendance',
    'Academics',
    'Hostel',
    'Transport',
    'Library',
    'Fees',
    'Examination',
    'Infrastructure',
    'IT/Portal',
    'Other',
  ];

  const handleRunAiTriage = async () => {
    if (!description.trim()) {
      setError('Please provide a description of the issue first.');
      return;
    }
    setError(null);
    setTriaging(true);

    try {
      const res = await fetch('/api/complaints/ai-triage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          subject: subject || 'Student Grievance',
          description,
        }),
      });

      const data = await res.json();
      setTriagePreview(data);
      if (data.category && categories.includes(data.category)) {
        setCategory(data.category);
      }
    } catch (err: any) {
      console.error('Triage error:', err);
    } finally {
      setTriaging(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError('Subject and detailed description are required.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/complaints/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          subject,
          description,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit grievance');
      }

      const created = await res.json();
      setSuccessTicket(created);
      if (onComplaintCreated) onComplaintCreated();
    } catch (err: any) {
      setError(err.message || 'Error creating ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCategory('Attendance');
    setSubject('');
    setDescription('');
    setTriagePreview(null);
    setSuccessTicket(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-400/30">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">AI Campus Grievance & Complaint Desk</h2>
              <p className="text-xs text-slate-300">Automated AI categorization, department triage, and priority assignment</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {successTicket ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Grievance Ticket Generated!</h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Your issue has been recorded in the college database and dispatched to the designated department authorities.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto text-left space-y-2 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500">Ticket Number:</span>
                  <span className="font-mono font-bold text-blue-700">{successTicket.ticket_number}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500">Assigned Department:</span>
                  <span className="font-semibold text-slate-800">{successTicket.assigned_department}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200">
                  <span className="text-slate-500">Assigned Priority:</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    {successTicket.priority}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Initial Status:</span>
                  <span className="font-semibold text-indigo-600">{successTicket.status}</span>
                </div>
              </div>

              <div className="pt-3">
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-xs transition"
                >
                  Done & View Status in Dashboard
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Safety notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-blue-800">
                <ShieldAlert className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold">AI Safety Policy: </span>
                  The AI Agent triages and routes complaints but cannot autonomously overwrite database records (such as attendance, marks, or fees). All resolutions undergo faculty/HOD authorization.
                </div>
              </div>

              {/* Category selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`text-xs py-2 px-2.5 rounded-lg border text-center font-medium transition ${
                        category === cat
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Subject / Summary
                </label>
                <input
                  type="text"
                  placeholder="e.g. Attendance discrepancy in CS601 lecture on Sept 22"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Detailed Grievance Description
                  </label>
                  <button
                    type="button"
                    onClick={handleRunAiTriage}
                    disabled={triaging || !description.trim()}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{triaging ? 'Analyzing with AI...' : 'Preview AI Triage'}</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  placeholder="Provide precise details: date, time, subject code, room number, or transaction id..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                ></textarea>
              </div>

              {/* AI Triage Preview Card */}
              {triagePreview && (
                <div className="bg-slate-50 border border-indigo-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-900 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>AI Triage Analysis</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <div className="text-slate-400 font-medium">Category:</div>
                      <div className="font-semibold text-slate-800">{triagePreview.category}</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <div className="text-slate-400 font-medium">Target Dept:</div>
                      <div className="font-semibold text-slate-800">{triagePreview.assignedDepartment}</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <div className="text-slate-400 font-medium">Priority:</div>
                      <div className="font-semibold text-amber-700">{triagePreview.priority}</div>
                    </div>
                  </div>
                  {triagePreview.summary && (
                    <div className="text-xs text-slate-600 italic">
                      AI Note: {triagePreview.summary}
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !subject.trim() || !description.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center space-x-1.5 shadow-xs transition"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Submitting & Routing...' : 'Submit Grievance'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
