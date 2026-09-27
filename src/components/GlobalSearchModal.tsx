import React, { useState, useEffect } from 'react';
import { Search, X, Calendar, Briefcase, Award, FileText, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
}

export const GlobalSearchModal: React.FC<Props> = ({ isOpen, onClose, onNavigateTab }) => {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    events: any[];
    placements: any[];
    internships: any[];
    subjects: any[];
    complaints: any[];
  }>({ events: [], placements: [], internships: [], subjects: [], complaints: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ events: [], placements: [], internships: [], subjects: [], complaints: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, token]);

  if (!isOpen) return null;

  const totalResults =
    results.events.length +
    results.placements.length +
    results.internships.length +
    results.subjects.length +
    results.complaints.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-20 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center space-x-3 bg-slate-50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search events, placements, internships, subjects, complaints... (e.g. Python, CSE, Workshop, Mid-1)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-900 focus:outline-hidden placeholder:text-slate-400"
          />
          {loading ? (
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          ) : query ? (
            <button onClick={() => setQuery('')} className="p-1 hover:bg-slate-200 rounded-md text-slate-400">
              <X className="w-4 h-4" />
            </button>
          ) : null}
          <button onClick={onClose} className="text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-slate-600">
            Esc
          </button>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {!query && (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>Type keywords to query live college database records.</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
                {['Google', 'Hackathon', 'VLSI', 'Python', 'Internship', 'Attendance'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && totalResults === 0 && !loading && (
            <div className="text-center py-8 text-slate-500 text-sm">
              No college records found matching &ldquo;{query}&rdquo;.
            </div>
          )}

          {/* Events Results */}
          {results.events.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Events & Workshops ({results.events.length})</span>
              </div>
              <div className="space-y-1">
                {results.events.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => {
                      onNavigateTab('events');
                      onClose();
                    }}
                    className="p-2.5 hover:bg-blue-50/60 rounded-xl border border-transparent hover:border-blue-200 flex items-center justify-between cursor-pointer transition"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{ev.title}</div>
                      <div className="text-xs text-slate-500">
                        {ev.event_type} • {ev.event_date} • {ev.venue}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Placements Results */}
          {results.placements.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                <span>Placement Drives ({results.placements.length})</span>
              </div>
              <div className="space-y-1">
                {results.placements.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onNavigateTab('placements');
                      onClose();
                    }}
                    className="p-2.5 hover:bg-emerald-50/60 rounded-xl border border-transparent hover:border-emerald-200 flex items-center justify-between cursor-pointer transition"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{p.company_name} — {p.job_role}</div>
                      <div className="text-xs text-slate-500">Package: ₹{p.package_lpa} LPA</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Internships Results */}
          {results.internships.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Award className="w-3.5 h-3.5 text-indigo-600" />
                <span>Internships ({results.internships.length})</span>
              </div>
              <div className="space-y-1">
                {results.internships.map((i) => (
                  <div
                    key={i.id}
                    onClick={() => {
                      onNavigateTab('internships');
                      onClose();
                    }}
                    className="p-2.5 hover:bg-indigo-50/60 rounded-xl border border-transparent hover:border-indigo-200 flex items-center justify-between cursor-pointer transition"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{i.company_name} — {i.role}</div>
                      <div className="text-xs text-slate-500">Stipend: {i.stipend}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subjects Results */}
          {results.subjects.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-600" />
                <span>Academic Subjects ({results.subjects.length})</span>
              </div>
              <div className="space-y-1">
                {results.subjects.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      onNavigateTab('attendance');
                      onClose();
                    }}
                    className="p-2.5 hover:bg-purple-50/60 rounded-xl border border-transparent hover:border-purple-200 flex items-center justify-between cursor-pointer transition"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{s.code} — {s.name}</div>
                      <div className="text-xs text-slate-500">Dept: {s.department_code}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Complaints Results */}
          {results.complaints.length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>Grievances & Tickets ({results.complaints.length})</span>
              </div>
              <div className="space-y-1">
                {results.complaints.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onNavigateTab('complaints');
                      onClose();
                    }}
                    className="p-2.5 hover:bg-amber-50/60 rounded-xl border border-transparent hover:border-amber-200 flex items-center justify-between cursor-pointer transition"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">[{c.ticket_number}] {c.subject}</div>
                      <div className="text-xs text-slate-500">Status: {c.status} • Category: {c.category}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
