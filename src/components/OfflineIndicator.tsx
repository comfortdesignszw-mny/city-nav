import React from 'react';
import { WifiOff, CloudUpload } from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';

export const OfflineIndicator: React.FC = () => {
  const store = useOfflineStore();
  const isOnline = store.isEffectivelyOnline();
  const isSimulated = store.isOfflineSimulated();
  const pendingCount = store.getPendingWritesCount();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in slide-in-from-bottom duration-300">
      <div className="bg-[#141414] text-white px-4 py-3 border-2 border-[#141414] shadow-[4px_4px_0px_0px_#F27D26] flex items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {!isOnline ? (
            <>
              <div className="w-3 h-3 bg-[#F27D26] animate-pulse flex-shrink-0 border border-white" />
              <div className="truncate">
                <span className="font-black uppercase tracking-wider text-xs">Offline Mode Active</span>
                <span className="text-stone-300 text-[10px] font-bold block truncate uppercase">
                  {isSimulated ? 'Simulating zero network' : 'Local SQLite cache loaded'}
                </span>
              </div>
            </>
          ) : (
            <>
              <CloudUpload className="w-4 h-4 text-[#F27D26] flex-shrink-0" />
              <div className="truncate">
                <span className="font-black uppercase tracking-wider text-xs">{pendingCount} Outbox Report{pendingCount > 1 ? 's' : ''}</span>
                <span className="text-stone-300 text-[10px] font-bold block uppercase">Syncing in background...</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!isOnline && isSimulated && (
            <button
              onClick={() => store.setOfflineSimulation(false)}
              className="px-3 py-1.5 bg-[#F27D26] hover:bg-white hover:text-[#141414] text-[10px] font-black uppercase tracking-wider text-white border-2 border-white transition cursor-pointer"
            >
              Go Online
            </button>
          )}
          {isOnline && pendingCount > 0 && (
            <button
              onClick={() => store.flushOutbox()}
              className="px-3 py-1.5 bg-white hover:bg-[#F27D26] hover:text-white text-[10px] font-black uppercase tracking-wider text-[#141414] border-2 border-[#141414] transition cursor-pointer"
            >
              Flush
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
