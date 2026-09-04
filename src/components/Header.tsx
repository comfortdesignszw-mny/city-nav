import React, { useState } from 'react';
import { 
  Bus, 
  Wifi, 
  WifiOff, 
  CloudUpload, 
  MapPin, 
  ListOrdered, 
  UserCheck, 
  RefreshCw,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';

interface HeaderProps {
  activeTab: 'routes' | 'intercity' | 'ranks' | 'my-reports';
  setActiveTab: (tab: 'routes' | 'intercity' | 'ranks' | 'my-reports') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const store = useOfflineStore();
  const isOnline = store.isEffectivelyOnline();
  const isSimulated = store.isOfflineSimulated();
  const pendingCount = store.getPendingWritesCount();
  const [showSimInfo, setShowSimInfo] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#F5F5F0] text-[#141414] border-b-2 border-[#141414]">
      {/* Top Brand & Status Bar */}
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 bg-[#141414] text-white border-2 border-[#141414] flex items-center justify-center font-black shadow-[2px_2px_0px_0px_#F27D26] flex-shrink-0">
            <Bus className="w-5 h-5 text-[#F27D26]" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black tracking-tighter text-[#141414]">FAMBAI</span>
              <span className="text-xl sm:text-2xl font-light italic tracking-tighter text-[#F27D26]">/HAMBANI</span>
              <span className="hidden xs:inline-block bg-[#141414] text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ml-1 border border-[#141414]">
                ZIMBABWE
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#141414]/70">
              The City Navigator • Zimbabwe
            </p>
          </div>
        </div>

        {/* Connectivity & Outbox Indicators */}
        <div className="flex items-center gap-2">
          {/* Outbox Badge */}
          {pendingCount > 0 && (
            <button
              onClick={() => setActiveTab('my-reports')}
              className="flex items-center gap-1.5 bg-[#F27D26] text-white border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] px-2.5 py-1 text-xs font-black uppercase tracking-wider hover:bg-[#d96615] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              title="Writes queued in Outbox awaiting background sync"
            >
              <CloudUpload className="w-3.5 h-3.5" />
              <span>{pendingCount} outbox</span>
            </button>
          )}

          {/* Offline / Online Status Pill with interactive toggle */}
          <div className="relative">
            <button
              onClick={() => setShowSimInfo(!showSimInfo)}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-black uppercase tracking-widest border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                isOnline
                  ? 'bg-[#141414] text-white hover:bg-[#F27D26]'
                  : 'bg-[#F27D26] text-white hover:bg-[#141414]'
              }`}
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-0.5" />
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Offline Ready</span>
                  <span className="sm:hidden">Ready</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-white" />
                  <span>Offline {isSimulated ? '(Sim)' : ''}</span>
                </>
              )}
            </button>

            {/* Offline Simulator popover */}
            {showSimInfo && (
              <div className="absolute right-0 mt-2 w-72 bg-white text-[#141414] rounded-none shadow-[6px_6px_0px_0px_#141414] p-4 border-2 border-[#141414] z-50 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-[#141414] uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-[#F27D26]" />
                    Zero-Connectivity
                  </span>
                  <button 
                    onClick={() => setShowSimInfo(false)}
                    className="text-[#141414] hover:text-[#F27D26] text-base font-black"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-stone-700 mb-3 leading-relaxed font-medium">
                  Fambai/Hambani uses the <strong>Outbox Pattern</strong>. All fare and status reports queue locally first in local storage and sync silently when connected.
                </p>
                <div className="bg-[#F5F5F0] p-2.5 border-2 border-[#141414] mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[#141414] font-bold">Simulate Zero Data:</span>
                    <button
                      onClick={() => store.setOfflineSimulation(!isSimulated)}
                      className={`px-2.5 py-1 text-xs font-black uppercase border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] transition ${
                        isSimulated
                          ? 'bg-rose-600 text-white'
                          : 'bg-white text-[#141414] hover:bg-[#F27D26] hover:text-white'
                      }`}
                    >
                      {isSimulated ? 'Offline ON' : 'Offline OFF'}
                    </button>
                  </div>
                </div>
                {pendingCount > 0 && (
                  <button
                    onClick={() => {
                      store.flushOutbox();
                      setShowSimInfo(false);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#141414] text-white uppercase font-black tracking-wider text-xs border-2 border-[#141414] hover:bg-[#F27D26] transition shadow-[2px_2px_0px_0px_#141414]"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Force Flush Outbox ({pendingCount})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-4xl mx-auto px-2 sm:px-4 flex border-t-2 border-[#141414] bg-[#F5F5F0] overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('routes')}
          className={`flex-1 min-w-[110px] flex items-center justify-center gap-1.5 py-3 px-2 text-xs font-black uppercase tracking-wider transition border-r-2 border-[#141414] cursor-pointer ${
            activeTab === 'routes'
              ? 'bg-[#141414] text-white shadow-[inset_0_-2px_0_0_#F27D26]'
              : 'text-[#141414]/70 hover:text-[#141414] hover:bg-white'
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">Routes &amp; Fares</span>
        </button>

        <button
          id="nav-intercity-tab"
          onClick={() => setActiveTab('intercity')}
          className={`flex-1 min-w-[125px] flex items-center justify-center gap-1.5 py-3 px-2 text-xs font-black uppercase tracking-wider transition border-r-2 border-[#141414] cursor-pointer ${
            activeTab === 'intercity'
              ? 'bg-[#141414] text-white shadow-[inset_0_-2px_0_0_#F27D26]'
              : 'text-[#141414]/70 hover:text-[#141414] hover:bg-white'
          }`}
        >
          <Bus className="w-3.5 h-3.5 text-[#F27D26] flex-shrink-0" />
          <span className="truncate">Intercity Buses</span>
        </button>

        <button
          onClick={() => setActiveTab('ranks')}
          className={`flex-1 min-w-[110px] flex items-center justify-center gap-1.5 py-3 px-2 text-xs font-black uppercase tracking-wider transition border-r-2 border-[#141414] cursor-pointer ${
            activeTab === 'ranks'
              ? 'bg-[#141414] text-white shadow-[inset_0_-2px_0_0_#F27D26]'
              : 'text-[#141414]/70 hover:text-[#141414] hover:bg-white'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">Ranks &amp; Termini</span>
        </button>

        <button
          onClick={() => setActiveTab('my-reports')}
          className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-3 px-2 text-xs font-black uppercase tracking-wider transition cursor-pointer ${
            activeTab === 'my-reports'
              ? 'bg-[#141414] text-white shadow-[inset_0_-2px_0_0_#F27D26]'
              : 'text-[#141414]/70 hover:text-[#141414] hover:bg-white'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">My Reports</span>
          {pendingCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-[#F27D26] border border-[#141414] animate-pulse ml-0.5 flex-shrink-0" />
          )}
        </button>
      </div>
    </header>
  );
};
