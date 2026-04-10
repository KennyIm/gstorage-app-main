import { useUI } from '../context/UIContext';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export const GlobalLoader = () => {
  const { isLoading } = useUI();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center transition-all duration-300">
      <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in duration-200">
        <div className="flex gap-2">
          <div className="w-4 h-4 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-4 h-4 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-4 h-4 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <span className="text-slate-600 font-bold tracking-widest uppercase text-xs">Procesando...</span>
      </div>
    </div>
  );
};
export const GlobalToast = () => {
  const { toast, hideToast } = useUI();

  if (!toast.show) return null;
  const config = {
    error: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-800', icon: <AlertCircle className="text-red-500" /> },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-800', icon: <CheckCircle className="text-emerald-500" /> },
    info: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-800', icon: <Info className="text-blue-500" /> }
  };

  const activeConfig = config[toast.type] || config.info;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-8 fade-in duration-300">
      <div className={`flex items-start gap-3 p-4 rounded-xl shadow-2xl border-l-4 ${activeConfig.bg} ${activeConfig.border} max-w-sm`}>
        <div className="shrink-0 mt-0.5">{activeConfig.icon}</div>
        <div className="flex-grow">
          <p className={`text-sm font-bold ${activeConfig.text}`}>{toast.message}</p>
        </div>
        <button onClick={hideToast} className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
          <X size={18} />
        </button>
      </div>
    </div>
  );
};