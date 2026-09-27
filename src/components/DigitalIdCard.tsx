import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ShieldCheck, Award, X, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  studentData?: any;
}

export const DigitalIdCard: React.FC<Props> = ({ isOpen, onClose, studentData }) => {
  const { user } = useAuth();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const student = studentData || user;
  const rollNo = student?.roll_no || student?.identifier || '22TKRECCSE001';
  const qrToken = student?.qr_code_token || `TKREC-SECURE-QR-${rollNo}-1001`;

  useEffect(() => {
    if (qrToken) {
      QRCode.toDataURL(qrToken, {
        width: 250,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation error:', err));
    }
  }, [qrToken]);

  const copyToken = () => {
    navigator.clipboard.writeText(qrToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/20 text-white hover:bg-black/40 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Card Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 text-white p-5 text-center relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
          <div className="flex items-center justify-center space-x-2 mb-1">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="font-extrabold tracking-wider text-sm uppercase">Teegala Krishna Reddy Engineering College</span>
          </div>
          <p className="text-[11px] text-blue-200 font-medium">UGC Autonomous • Affiliated to JNTUH, Hyderabad (TKREC)</p>
          <div className="mt-2 inline-block px-3 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            Official Student Smart Pass
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 text-center space-y-4">
          <div className="relative mx-auto w-24 h-24">
            <img
              src={student?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
              alt={student?.name}
              className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md mx-auto"
            />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <div>
            <h3 className="font-bold text-lg text-slate-900">{student?.name || 'Aarav Sharma'}</h3>
            <p className="text-xs font-mono font-bold text-blue-700">{rollNo}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200 text-left">
            <div>
              <span className="text-slate-400 font-medium block">Department:</span>
              <span className="font-bold text-slate-800">{student?.department_code || 'CSE'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Batch / Section:</span>
              <span className="font-bold text-slate-800">2022-2026 (Sec {student?.section || 'A'})</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Current Year:</span>
              <span className="font-bold text-slate-800">Year {student?.year || 3} (Sem {student?.semester || 6})</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">CGPA Record:</span>
              <span className="font-bold text-emerald-600">{student?.cgpa || '8.85'}</span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="bg-white p-3 rounded-2xl border-2 border-dashed border-slate-300 inline-block shadow-inner">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Student QR Code" className="w-44 h-44 mx-auto" />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                Generating Verified QR...
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-1 font-mono">Present for Lecture Scanner</p>
          </div>

          <div className="flex items-center justify-center space-x-2 text-xs">
            <button
              onClick={copyToken}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-mono text-[11px] transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Token!' : 'Copy QR Token'}</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-100 p-3 text-center border-t border-slate-200 text-[10px] text-slate-500">
          This digital credential is valid across all campus labs, libraries, lectures, and placement drives.
        </div>
      </div>
    </div>
  );
};
