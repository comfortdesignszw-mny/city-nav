import React, { useState } from 'react';
import { 
  User, 
  ShieldCheck, 
  CloudUpload, 
  RefreshCw, 
  Clock, 
  Phone, 
  Check, 
  AlertCircle, 
  Copy, 
  Wifi, 
  WifiOff, 
  RotateCcw, 
  DollarSign, 
  Radio, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import { formatTimeAgo, formatCurrency, getStatusConfig } from '../utils/formatters';

interface MyReportsViewProps {
  onSelectRoute: (routeId: string) => void;
}

export const MyReportsView: React.FC<MyReportsViewProps> = ({ onSelectRoute }) => {
  const store = useOfflineStore();
  const profile = store.getUserProfile();
  const deviceId = store.getDeviceId();
  const { fares: myFares, statuses: myStatuses } = store.getMyReports();
  const outboxItems = store.getOutboxItems();
  const pendingCount = store.getPendingWritesCount();
  const isOnline = store.isEffectivelyOnline();
  const isSimulated = store.isOfflineSimulated();

  const [phoneInput, setPhoneInput] = useState(profile.phone || '');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'my-reports' | 'outbox'>('my-reports');

  const handleCopyDeviceId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(deviceId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;
    store.updatePhone(phoneInput.trim());
    setIsEditingPhone(false);
    setPhoneSaved(true);
    setTimeout(() => setPhoneSaved(false), 2500);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Profile Card */}
      <div className="bg-white p-4 sm:p-5 border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#141414] text-white border-2 border-[#141414] flex items-center justify-center font-black text-lg shadow-[2px_2px_0px_0px_#F27D26]">
              <User className="w-6 h-6 text-[#F27D26]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-[#141414] uppercase">
                  {profile.phone ? `Commuter (+${profile.phone})` : 'Anonymous Commuter'}
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-[#141414] text-white border border-[#141414]">
                  Active
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-stone-600 font-bold">
                <span className="font-mono text-[11px]">ID: {deviceId.slice(0, 14)}...</span>
                <button
                  onClick={handleCopyDeviceId}
                  className="text-[#141414] hover:text-[#F27D26] ml-1 flex items-center gap-0.5 font-black uppercase text-[10px]"
                  title="Copy full Device UUID"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedId ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Reputation Score Badge */}
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F27D26] text-white border-2 border-[#141414] font-black text-sm shadow-[2px_2px_0px_0px_#141414]">
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>{profile.reputation_score} PTS</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#141414]/60 mt-1">Reputation Score</p>
          </div>
        </div>

        {/* Reputation Level Explainer */}
        <div className="mt-4 p-3.5 bg-[#F5F5F0] border-2 border-[#141414] flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
          <div>
            <span className="font-black text-[#141414] uppercase">Title: Mufambidzani / Commuter Scout</span>
            <p className="text-[11px] font-medium text-stone-600 mt-0.5">
              Accuracy weighted by upvotes and recency. No mandatory signup wall for core offline usage.
            </p>
          </div>
          <span className="text-[#141414] font-black text-xs uppercase bg-white px-2 py-1 border border-[#141414] whitespace-nowrap self-start sm:self-auto">
            {profile.reports_count} Reports Submitted
          </span>
        </div>

        {/* Optional Phone Signup section */}
        <div className="mt-3.5 pt-3 border-t-2 border-[#141414]/10">
          {!isEditingPhone && !profile.phone ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs text-stone-600">
                <span className="font-black text-[#141414] uppercase">Add Phone Number (Optional):</span>
                <p className="text-[11px] font-medium text-stone-500">Sync your reputation across devices and verify alerts</p>
              </div>
              <button
                onClick={() => setIsEditingPhone(true)}
                className="px-3 py-1.5 bg-[#141414] hover:bg-[#F27D26] text-white text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414]"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Link Phone</span>
              </button>
            </div>
          ) : isEditingPhone ? (
            <form onSubmit={handleSavePhone} className="space-y-2">
              <label className="block text-xs font-black text-[#141414] uppercase tracking-wider">
                Link Mobile Number (e.g. 077... / EcoCash):
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="0771 234 567"
                  className="flex-1 px-3 py-2 bg-[#F5F5F0] text-xs text-[#141414] font-bold border-2 border-[#141414] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-[#141414] text-white text-xs font-black uppercase tracking-wider hover:bg-[#F27D26] border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414]"
                >
                  Save (+15 pts)
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingPhone(false)}
                  className="px-3 py-2 bg-[#F5F5F0] text-[#141414] text-xs font-black uppercase border-2 border-[#141414]"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#141414] font-bold">
                Linked Phone: <strong className="font-black text-[#F27D26]">{profile.phone}</strong>
              </span>
              <button
                onClick={() => setIsEditingPhone(true)}
                className="text-[#141414] font-black uppercase hover:text-[#F27D26]"
              >
                Change
              </button>
            </div>
          )}

          {phoneSaved && (
            <p className="text-xs text-[#141414] font-black mt-2 flex items-center gap-1.5 p-2 bg-[#F5F5F0] border-2 border-[#141414]">
              <Check className="w-4 h-4 text-[#F27D26]" /> Phone linked! +15 reputation awarded.
            </p>
          )}
        </div>
      </div>

      {/* Outbox Pattern & Sync Engine Controls */}
      <div className="bg-white p-4 sm:p-5 border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <CloudUpload className="w-6 h-6 text-[#F27D26]" />
            <div>
              <h3 className="text-sm font-black text-[#141414] uppercase tracking-wider">
                Outbox Pattern &amp; Offline Cache Engine
              </h3>
              <p className="text-[11px] font-medium text-stone-600">
                Zero-connectivity SQLite/Drift architecture with background reconciliation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => store.setOfflineSimulation(!isSimulated)}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] ${
                isSimulated
                  ? 'bg-rose-600 text-white'
                  : 'bg-[#F5F5F0] text-[#141414] hover:bg-white'
              }`}
              title="Toggle simulated offline mode to test outbox writes"
            >
              {isSimulated ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
              <span>{isSimulated ? 'Simulated Offline' : 'Online Mode'}</span>
            </button>
            
            {pendingCount > 0 && (
              <button
                onClick={() => store.flushOutbox()}
                className="px-3 py-1.5 bg-[#F27D26] hover:bg-[#d96615] text-white text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Now ({pendingCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Metrics Strip */}
        <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
          <div className="p-3 bg-[#F5F5F0] border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414]">
            <span className="text-[10px] text-[#141414]/60 block uppercase font-black">Pending Outbox</span>
            <span className={`text-xl font-black ${pendingCount > 0 ? 'text-[#F27D26]' : 'text-[#141414]'}`}>
              {pendingCount}
            </span>
          </div>
          <div className="p-3 bg-[#F5F5F0] border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414]">
            <span className="text-[10px] text-[#141414]/60 block uppercase font-black">Local Cache</span>
            <span className="text-xl font-black text-[#141414]">Instant</span>
          </div>
          <div className="p-3 bg-[#F5F5F0] border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414]">
            <span className="text-[10px] text-[#141414]/60 block uppercase font-black">Connection</span>
            <span className={`text-xl font-black ${isOnline ? 'text-[#141414]' : 'text-[#F27D26]'}`}>
              {isOnline ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Reports Subtabs: My Reports History vs Outbox Inspector */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSubTab('my-reports')}
          className={`py-2.5 px-4 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition ${
            activeSubTab === 'my-reports'
              ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
              : 'bg-white text-[#141414] hover:bg-[#F5F5F0]'
          }`}
        >
          My Submissions ({myFares.length + myStatuses.length})
        </button>
        <button
          onClick={() => setActiveSubTab('outbox')}
          className={`py-2.5 px-4 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition flex items-center gap-1.5 ${
            activeSubTab === 'outbox'
              ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
              : 'bg-white text-[#141414] hover:bg-[#F5F5F0]'
          }`}
        >
          <span>Outbox Queue</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 bg-[#F27D26] text-white font-black text-[10px]">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Subtab 1: My Submissions */}
      {activeSubTab === 'my-reports' && (
        <div className="space-y-3">
          {myFares.length === 0 && myStatuses.length === 0 ? (
            <div className="bg-white p-8 text-center border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414]">
              <Clock className="w-8 h-8 text-[#141414]/40 mx-auto mb-2" />
              <h4 className="text-sm font-black text-[#141414] uppercase">No reports submitted yet from this device</h4>
              <p className="text-xs font-medium text-stone-600 mt-1 max-w-xs mx-auto">
                Help Harare commuters by reporting the current kombi fare or route status on any route!
              </p>
            </div>
          ) : (
            <>
              {/* My Fares */}
              {myFares.map((f) => {
                const rt = store.getRouteById(f.route_id);
                return (
                  <div
                    key={f.id}
                    onClick={() => onSelectRoute(f.route_id)}
                    className="p-3.5 bg-white border-2 border-[#141414] shadow-[3px_3px_0px_0px_#141414] hover:shadow-[5px_5px_0px_0px_#F27D26] hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#141414] text-white border-2 border-[#141414] flex items-center justify-center font-black text-xs">
                        <DollarSign className="w-4 h-4 text-[#F27D26]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-[#141414] group-hover:text-[#F27D26] transition uppercase">{rt?.name || 'Route'}</h4>
                        <span className="text-[11px] font-bold text-stone-500">
                          {formatTimeAgo(f.reported_at)} • {f.upvotes} Confirmations
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base sm:text-lg font-black text-[#141414]">
                        {formatCurrency(f.fare_amount, f.currency)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* My Statuses */}
              {myStatuses.map((s) => {
                const rt = store.getRouteById(s.route_id);
                const cfg = getStatusConfig(s.type);
                return (
                  <div
                    key={s.id}
                    onClick={() => onSelectRoute(s.route_id)}
                    className="p-3.5 bg-white border-2 border-[#141414] shadow-[3px_3px_0px_0px_#141414] hover:shadow-[5px_5px_0px_0px_#F27D26] hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#141414] text-white border-2 border-[#141414] flex items-center justify-center font-black text-xs">
                        <Radio className="w-4 h-4 text-[#F27D26]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-[#141414] group-hover:text-[#F27D26] transition uppercase">{rt?.name || 'Route'}</h4>
                          <span className={`text-[10px] px-2 py-0.5 font-black uppercase border-2 border-[#141414] ${cfg.badgeClass}`}>
                            {cfg.label}
                          </span>
                        </div>
                        {s.note ? (
                          <p className="text-xs text-[#141414] font-bold truncate max-w-xs mt-0.5">
                            "{s.note}"
                          </p>
                        ) : (
                          <p className="text-[11px] font-bold text-stone-400 mt-0.5">{formatTimeAgo(s.reported_at)}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#141414] group-hover:translate-x-0.5 transition" />
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Subtab 2: Outbox Queue Inspector */}
      {activeSubTab === 'outbox' && (
        <div className="space-y-3">
          {outboxItems.length === 0 ? (
            <div className="bg-white p-8 text-center border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414]">
              <Check className="w-8 h-8 text-[#F27D26] mx-auto mb-2" />
              <h4 className="text-sm font-black text-[#141414] uppercase">Outbox is Clean</h4>
              <p className="text-xs font-medium text-stone-600 mt-1">
                All local writes have synced successfully to the central repository.
              </p>
            </div>
          ) : (
            outboxItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-white border-2 border-[#141414] shadow-[3px_3px_0px_0px_#141414] flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-[#141414] uppercase text-[10px] px-2 py-0.5 bg-[#F5F5F0] border-2 border-[#141414]">
                      {item.type.replace('_', ' ')}
                    </span>
                    <span className="text-stone-500 font-bold text-[11px]">
                      {formatTimeAgo(item.created_at)}
                    </span>
                  </div>
                  <p className="text-stone-700 font-mono mt-1 text-[11px]">
                    Payload ID: {item.payload?.id || item.id}
                  </p>
                </div>

                <div>
                  {item.status === 'pending' && (
                    <span className="px-2.5 py-1 bg-[#F27D26] text-white font-black text-[10px] uppercase border-2 border-[#141414] shadow-[1px_1px_0px_0px_#141414]">
                      Pending Sync
                    </span>
                  )}
                  {item.status === 'syncing' && (
                    <span className="px-2.5 py-1 bg-[#141414] text-white font-black text-[10px] uppercase border-2 border-[#141414] animate-pulse">
                      Syncing...
                    </span>
                  )}
                  {item.status === 'synced' && (
                    <span className="px-2.5 py-1 bg-white text-[#141414] font-black text-[10px] uppercase border-2 border-[#141414]">
                      Synced
                    </span>
                  )}
                  {item.status === 'failed' && (
                    <span className="px-2.5 py-1 bg-rose-600 text-white font-black text-[10px] uppercase border-2 border-[#141414]">
                      Retry #{item.retry_count}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Dev Reset seed action */}
      <div className="pt-4 text-center">
        <button
          onClick={() => {
            if (window.confirm('Reset all demo local cache back to Harare initial seed?')) {
              store.resetToSeed();
            }
          }}
          className="text-xs font-black uppercase tracking-wider text-[#141414]/60 hover:text-[#F27D26] flex items-center justify-center gap-1 mx-auto transition"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Demo Data to Initial Seed</span>
        </button>
      </div>
    </div>
  );
};
