import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  Navigation, 
  ShieldAlert, 
  Fuel, 
  AlertCircle, 
  Check 
} from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import { RouteItem, StatusType } from '../types';

interface ReportStatusModalProps {
  route: RouteItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface StatusOption {
  type: StatusType;
  title: string;
  subtitle: string;
  badgeColor: string;
  icon: React.ReactNode;
}

export const ReportStatusModal: React.FC<ReportStatusModalProps> = ({
  route,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const store = useOfflineStore();
  const [selectedType, setSelectedType] = useState<StatusType | null>(null);
  const [note, setNote] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const statusOptions: StatusOption[] = [
    {
      type: 'running',
      title: 'Running normally',
      subtitle: 'Kombis loading smoothly, no major delays',
      badgeColor: 'hover:bg-emerald-50 text-[#141414]',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />,
    },
    {
      type: 'delayed',
      title: 'Delayed / Long queues',
      subtitle: 'Slow turnaround or heavy rank queues',
      badgeColor: 'hover:bg-amber-50 text-[#141414]',
      icon: <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />,
    },
    {
      type: 'diverted',
      title: 'Diverted route',
      subtitle: 'Taking detour / alternate backroads',
      badgeColor: 'hover:bg-indigo-50 text-[#141414]',
      icon: <Navigation className="w-5 h-5 text-indigo-700 flex-shrink-0" />,
    },
    {
      type: 'police_blitz',
      title: 'Police blitz / Roadblock',
      subtitle: 'Heavy enforcement, kombis dodging ranks',
      badgeColor: 'hover:bg-rose-50 text-[#141414]',
      icon: <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />,
    },
    {
      type: 'fuel_shortage',
      title: 'Fuel shortage / Scarce vehicles',
      subtitle: 'Fewer vehicles operating today',
      badgeColor: 'hover:bg-orange-50 text-[#141414]',
      icon: <Fuel className="w-5 h-5 text-orange-600 flex-shrink-0" />,
    },
  ];

  const handleSelectAndSubmit = (type: StatusType) => {
    setSelectedType(type);
    setErrorMessage(null);

    const res = store.reportStatus(route.id, type, note);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to submit status update.');
      return;
    }

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      if (onSuccess) onSuccess();
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white border-2 border-[#141414] shadow-[8px_8px_0px_0px_#141414] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[#141414] text-white border-b-2 border-[#141414] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-[#F27D26] uppercase tracking-widest">Live Route Alert</span>
            <h3 className="text-lg font-black text-white uppercase">{route.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white text-[#141414] hover:bg-[#F27D26] hover:text-white border-2 border-[#141414] flex items-center justify-center transition font-black cursor-pointer shadow-[2px_2px_0px_0px_#F27D26]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center bg-[#F5F5F0]">
            <div className="w-16 h-16 bg-[#141414] text-[#F27D26] border-2 border-[#141414] shadow-[4px_4px_0px_0px_#F27D26] flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Check className="w-9 h-9 stroke-[3]" />
            </div>
            <h4 className="text-xl font-black text-[#141414] uppercase">Status Alert Broadcasted!</h4>
            <p className="text-xs font-bold text-stone-600 mt-1 max-w-xs mx-auto">
              Active for 90 minutes. Fellow Harare commuters will see this immediately.
            </p>
          </div>
        ) : (
          <div className="p-4 sm:p-5 space-y-3 max-h-[80vh] overflow-y-auto">
            <p className="text-xs font-black uppercase text-[#141414] tracking-wider">
              Tap any status below to report immediately (1 tap):
            </p>

            {/* 1-Tap Big Buttons */}
            <div className="space-y-2.5">
              {statusOptions.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => handleSelectAndSubmit(opt.type)}
                  className={`w-full p-3.5 border-2 border-[#141414] shadow-[3px_3px_0px_0px_#141414] hover:shadow-[5px_5px_0px_0px_#F27D26] hover:-translate-x-0.5 hover:-translate-y-0.5 text-left transition flex items-center justify-between group active:translate-x-0 active:translate-y-0 cursor-pointer bg-white ${opt.badgeColor}`}
                >
                  <div className="flex items-center gap-3">
                    {opt.icon}
                    <div>
                      <h4 className="text-xs font-black uppercase text-[#141414]">{opt.title}</h4>
                      <p className="text-[11px] text-stone-600 font-bold">{opt.subtitle}</p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-1 bg-[#141414] text-white border border-[#141414] group-hover:bg-[#F27D26] transition">
                    Report ➔
                  </span>
                </button>
              ))}
            </div>

            {/* Optional Short Note Field */}
            <div className="pt-3 border-t-2 border-[#141414]/10">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-[#141414] uppercase tracking-wider">
                  Optional note (add before tapping a status):
                </label>
                <span className="text-[10px] font-bold text-stone-400">{note.length}/100</span>
              </div>
              <input
                type="text"
                maxLength={100}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Roadblock near flyover, or long queues at rank"
                className="w-full px-3.5 py-2.5 bg-[#F5F5F0] text-xs font-bold text-[#141414] border-2 border-[#141414] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
              />
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-100 text-rose-950 font-black text-xs flex items-center gap-2 border-2 border-[#141414]">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-700" />
                <span>{errorMessage}</span>
              </div>
            )}

            <p className="text-center text-[10px] font-black uppercase text-stone-500 tracking-wider">
              ⚡ Status reports automatically expire after 90 minutes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
