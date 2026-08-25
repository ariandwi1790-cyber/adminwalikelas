import React, { useEffect, useState } from 'react';
import { ToastInfo } from '../../context/DatabaseContext';
import { CheckCircle2, AlertCircle, RefreshCw, Info, X } from 'lucide-react';

interface ToastNotificationProps {
  toast: ToastInfo | null;
  onClose: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onClose }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!toast) return;

    // Determine auto-dismiss timeout in ms
    const duration = toast.type === 'error' ? 2500 : toast.type === 'loading' ? 2200 : 1500;
    const intervalMs = 25;
    const totalSteps = duration / intervalMs;
    let currentStep = 0;

    setProgress(100);

    const interval = setInterval(() => {
      currentStep++;
      const remainingPct = Math.max(0, 100 - (currentStep / totalSteps) * 100);
      setProgress(remainingPct);

      if (currentStep >= totalSteps) {
        clearInterval(interval);
        onClose();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div 
      role="alert"
      className="fixed bottom-16 lg:bottom-6 right-4 z-50 animate-in slide-in-from-bottom-2 fade-in duration-150 max-w-sm w-full"
    >
      <div 
        onClick={onClose}
        className={`relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border cursor-pointer select-none transition-all hover:scale-[1.01] active:scale-[0.99] ${
          toast.type === 'success' 
            ? 'bg-emerald-950/95 text-emerald-100 border-emerald-700/80 shadow-emerald-950/30' 
            : toast.type === 'error' 
            ? 'bg-rose-950/95 text-rose-100 border-rose-700/80 shadow-rose-950/30' 
            : toast.type === 'loading'
            ? 'bg-blue-950/95 text-blue-100 border-blue-700/80 shadow-blue-950/30'
            : 'bg-zinc-900/95 text-zinc-100 border-zinc-700/80 shadow-zinc-950/30'
        }`}
      >
        {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
        {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
        {toast.type === 'loading' && <RefreshCw className="w-4 h-4 text-blue-400 flex-shrink-0 animate-spin" />}
        {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />}
        
        <span className="flex-1 text-xs font-semibold leading-snug">{toast.text}</span>

        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 -mr-1 hover:bg-white/20 rounded-md cursor-pointer transition text-white/70 hover:text-white flex-shrink-0"
          aria-label="Tutup notifikasi cepat"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Dynamic Countdown Progress Bar */}
        <div 
          className="absolute bottom-0 left-0 h-0.5 bg-white/40 transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
