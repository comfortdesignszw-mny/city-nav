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
  Sparkles,
  Edit3,
  Award,
  AtSign,
  Download,
  Smartphone,
  Save,
  PlusCircle,
  X
} from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import { formatTimeAgo, formatCurrency, getStatusConfig } from '../utils/formatters';
import { PWAInstallButton } from './PWAInstallButton';
import { AddRouteFareModal } from './AddRouteFareModal';

interface MyReportsViewProps {
  onSelectRoute: (routeId: string) => void;
}

const BADGE_OPTIONS = [
  'Daily Commuter',
  'Route Scout',
  'Verified Passenger',
  'Bulawayo Commuter',
  'Harare Commuter',
  'Cross-Border Traveller',
  'Kombi Connoisseur',
  'Registered Transporter',
];

const AVATAR_COLORS = [
  '#F27D26', // Fambai Orange
  '#141414', // Jet Black
  '#2563EB', // Blue
  '#059669', // Emerald
  '#7C3AED', // Purple
  '#DB2777', // Pink
  '#DC2626', // Crimson
  '#0891B2', // Cyan
];

export const MyReportsView: React.FC<MyReportsViewProps> = ({ onSelectRoute }) => {
  const store = useOfflineStore();
  const profile = store.getUserProfile();
  const deviceId = store.getDeviceId();
  const { fares: myFares, statuses: myStatuses } = store.getMyReports();
  const outboxItems = store.getOutboxItems();
  const pendingCount = store.getPendingWritesCount();
  const isOnline = store.isEffectivelyOnline();
  const isSimulated = store.isOfflineSimulated();

  // Profile Form States
  const [nameInput, setNameInput] = useState(profile.name || '');
  const [usernameInput, setUsernameInput] = useState(profile.username || 'Commuter');
  const [handleInput, setHandleInput] = useState(profile.handle || '@commuter');
  const [phoneInput, setPhoneInput] = useState(profile.phone || '');
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor || '#F27D26');
  const [badge, setBadge] = useState(profile.commuterBadge || 'Daily Commuter');

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'my-reports' | 'outbox'>('my-reports');
  const [isAddReportOpen, setIsAddReportOpen] = useState(false);

  const handleCopyDeviceId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(deviceId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleUsernameChange = (val: string) => {
    setUsernameInput(val);
    const cleanHandle = '@' + val.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    setHandleInput(cleanHandle);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    store.updateUserProfile({
      name: nameInput.trim() || undefined,
      username: usernameInput.trim(),
      handle: handleInput.startsWith('@') ? handleInput.trim() : `@${handleInput.trim()}`,
      phone: phoneInput.trim() || undefined,
      avatarColor,
      commuterBadge: badge,
    });

    setIsEditingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleCancelEdit = () => {
    setNameInput(profile.name || '');
    setUsernameInput(profile.username || 'Commuter');
    setHandleInput(profile.handle || '@commuter');
    setPhoneInput(profile.phone || '');
    setAvatarColor(profile.avatarColor || '#F27D26');
    setBadge(profile.commuterBadge || 'Daily Commuter');
    setIsEditingProfile(false);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* SECTION 1: UNIFIED COMMUTER PROFILE & IDENTITY CARD */}
      <div className="bg-white p-4 sm:p-5 border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414]">
        {/* Profile Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#141414] pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] flex items-center justify-center font-black text-xl text-white flex-shrink-0"
              style={{ backgroundColor: profile.avatarColor || '#F27D26' }}
            >
              {profile.username ? profile.username.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-[#141414] uppercase tracking-tight">
                  {profile.name ? profile.name : profile.username || 'Anonymous Commuter'}
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-[#141414] text-white border border-[#141414]">
                  {profile.commuterBadge || 'Daily Commuter'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-stone-600 mt-0.5 flex-wrap">
                <span className="text-[#F27D26] font-black">{profile.handle || '@commuter'}</span>
                {profile.phone && (
                  <span className="text-stone-700 font-semibold">• Tel: +{profile.phone}</span>
                )}
                <span className="text-stone-400">|</span>
                <span className="font-mono text-[10px] text-stone-500">ID: {deviceId.slice(0, 10)}...</span>
                <button
                  onClick={handleCopyDeviceId}
                  className="text-[#141414] hover:text-[#F27D26] flex items-center gap-0.5 font-black uppercase text-[10px]"
                  title="Copy full Device UUID"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedId ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Reputation Score & Edit Action */}
          <div className="flex items-center gap-2 sm:flex-col sm:items-end justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F27D26] text-white border-2 border-[#141414] font-black text-xs sm:text-sm shadow-[2px_2px_0px_0px_#141414]">
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>{profile.reputation_score} PTS</span>
            </div>

            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="px-3 py-1 bg-white hover:bg-[#141414] hover:text-white text-[#141414] text-xs font-black uppercase tracking-wider transition border border-[#141414] shadow-[1px_1px_0px_0px_#141414] flex items-center gap-1.5 cursor-pointer mt-1"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* Success Alert */}
        {profileSaved && (
          <div className="mb-4 p-3 bg-emerald-50 border-2 border-emerald-600 text-xs font-bold text-emerald-950 flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Profile successfully updated! Your name, username, and number are saved locally.</span>
          </div>
        )}

        {/* EDIT PROFILE FORM */}
        {isEditingProfile ? (
          <form onSubmit={handleSaveProfile} className="space-y-4 bg-[#F5F5F0] p-4 border-2 border-[#141414]">
            <div className="flex items-center justify-between border-b border-stone-300 pb-2">
              <span className="text-xs font-black uppercase text-[#141414] flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-[#F27D26]" />
                Edit Commuter Profile Details
              </span>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-[11px] font-black uppercase text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. Full Name */}
              <div>
                <label className="block text-[11px] font-black uppercase text-[#141414] mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Farai Moyo"
                  className="w-full px-3 py-2 text-xs font-bold border-2 border-[#141414] bg-white focus:outline-none shadow-[1px_1px_0px_0px_#141414]"
                />
              </div>

              {/* 2. Username */}
              <div>
                <label className="block text-[11px] font-black uppercase text-[#141414] mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="e.g. harare_scout"
                  required
                  className="w-full px-3 py-2 text-xs font-bold border-2 border-[#141414] bg-white focus:outline-none shadow-[1px_1px_0px_0px_#141414]"
                />
              </div>

              {/* 3. Social Handle */}
              <div>
                <label className="block text-[11px] font-black uppercase text-[#141414] mb-1">
                  Handle
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">@</span>
                  <input
                    type="text"
                    value={handleInput.replace(/^@/, '')}
                    onChange={(e) => setHandleInput('@' + e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    placeholder="handle"
                    className="w-full pl-7 pr-3 py-2 text-xs font-bold border-2 border-[#141414] bg-white focus:outline-none shadow-[1px_1px_0px_0px_#141414]"
                  />
                </div>
              </div>

              {/* 4. Phone Number */}
              <div>
                <label className="block text-[11px] font-black uppercase text-[#141414] mb-1">
                  Phone Number (e.g. EcoCash / OneMoney)
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="0771 234 567"
                    className="w-full pl-8 pr-3 py-2 text-xs font-bold border-2 border-[#141414] bg-white focus:outline-none shadow-[1px_1px_0px_0px_#141414]"
                  />
                </div>
              </div>
            </div>

            {/* Commuter Badge Selection */}
            <div>
              <label className="block text-[11px] font-black uppercase text-[#141414] mb-1">
                Commuter Community Badge
              </label>
              <select
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border-2 border-[#141414] bg-white focus:outline-none shadow-[1px_1px_0px_0px_#141414]"
              >
                {BADGE_OPTIONS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Avatar Theme Color */}
            <div>
              <label className="block text-[11px] font-black uppercase text-[#141414] mb-1.5">
                Avatar Profile Color
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAvatarColor(c)}
                    className={`w-7 h-7 border-2 transition cursor-pointer flex items-center justify-center ${
                      avatarColor === c ? 'border-[#141414] scale-110 shadow-[2px_2px_0px_0px_#141414]' : 'border-white'
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {avatarColor === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-stone-300">
              <button
                type="submit"
                className="px-4 py-2 bg-[#F27D26] hover:bg-[#d96615] text-white text-xs font-black uppercase tracking-wider transition border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile Changes</span>
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-2 bg-white text-[#141414] text-xs font-black uppercase border-2 border-[#141414] hover:bg-stone-100 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          /* Profile Summary Strip */
          <div className="p-3 bg-[#F5F5F0] border-2 border-[#141414] flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
            <div>
              <span className="font-black text-[#141414] uppercase">Title: Mufambidzani / Commuter Scout</span>
              <p className="text-[11px] font-medium text-stone-600 mt-0.5">
                Accuracy weighted by upvotes and recency. Your profile is saved offline in local storage.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#141414] font-black text-xs uppercase bg-white px-2 py-1 border border-[#141414] whitespace-nowrap">
                {profile.reports_count} Reports Submitted
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: LIGHTWEIGHT PWA STANDALONE INSTALLATION (Requirement 1) */}
      <PWAInstallButton variant="full" />

      {/* SECTION 3: OUTBOX PATTERN & OFFLINE CACHE CONTROLS */}
      <div className="bg-white p-4 sm:p-5 border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <CloudUpload className="w-6 h-6 text-[#F27D26]" />
            <div>
              <h3 className="text-sm font-black text-[#141414] uppercase tracking-wider">
                Outbox Pattern &amp; Offline Cache Engine
              </h3>
              <p className="text-[11px] font-medium text-stone-600">
                Zero-connectivity local database with silent background reconciliation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => store.setOfflineSimulation(!isSimulated)}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] cursor-pointer ${
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
                className="px-3 py-1.5 bg-[#F27D26] hover:bg-[#d96615] text-white text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] cursor-pointer"
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

      {/* SECTION 4: MY SUBMISSIONS & OUTBOX QUEUE */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSubTab('my-reports')}
          className={`py-2.5 px-4 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer ${
            activeSubTab === 'my-reports'
              ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
              : 'bg-white text-[#141414] hover:bg-[#F5F5F0]'
          }`}
        >
          My Submissions ({myFares.length + myStatuses.length})
        </button>
        <button
          onClick={() => setActiveSubTab('outbox')}
          className={`py-2.5 px-4 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition flex items-center gap-1.5 cursor-pointer ${
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
            <div className="bg-white p-8 sm:p-10 text-center border-2 border-[#141414] shadow-[6px_6px_0px_0px_#141414] space-y-4">
              <div className="w-16 h-16 bg-[#F5F5F0] border-2 border-[#141414] shadow-[3px_3px_0px_0px_#F27D26] flex items-center justify-center mx-auto text-[#141414]">
                <Clock className="w-8 h-8 text-[#F27D26]" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#F27D26] block">
                  Your Device Submissions Log
                </span>
                <h4 className="text-base sm:text-lg font-black text-[#141414] uppercase">
                  No Reports Submitted Yet From This Device
                </h4>
                <p className="text-xs sm:text-sm font-medium text-stone-600 leading-relaxed">
                  Nothing has been created yet! Help fellow Zimbabwe commuters stay informed by reporting the current fare you paid, queue status, or roadblock alerts on any route.
                </p>
              </div>
              <div className="pt-1">
                <button
                  onClick={() => setIsAddReportOpen(true)}
                  className="py-3 px-6 bg-[#141414] hover:bg-[#F27D26] text-white font-black text-xs sm:text-sm uppercase tracking-wider border-2 border-[#141414] shadow-[4px_4px_0px_0px_#F27D26] transition cursor-pointer inline-flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Submit Your First Report</span>
                </button>
              </div>
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
                        <h4 className="text-sm font-black text-[#141414] group-hover:text-[#F27D26] transition uppercase">{rt?.name || f.route_name || 'Route'}</h4>
                        <span className="text-[11px] font-bold text-stone-500">
                          {formatTimeAgo(f.reported_at)} • {f.upvotes} Confirmations • {f.transport_type || 'HiAce Kombi'}
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
            <div className="bg-white p-8 sm:p-10 text-center border-2 border-[#141414] shadow-[6px_6px_0px_0px_#141414] space-y-3">
              <div className="w-14 h-14 bg-emerald-100 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#047857] flex items-center justify-center mx-auto text-emerald-800">
                <Check className="w-7 h-7 stroke-[3]" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h4 className="text-base sm:text-lg font-black text-[#141414] uppercase">Outbox is Clean</h4>
                <p className="text-xs sm:text-sm font-medium text-stone-600">
                  No pending writes waiting to be synced. Everything recorded on this device is fully up to date!
                </p>
              </div>
              <button
                onClick={() => setIsAddReportOpen(true)}
                className="py-2.5 px-4 bg-[#141414] hover:bg-[#F27D26] text-white text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer shadow-[2px_2px_0px_0px_#F27D26] inline-flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Report Fare or Road Alert</span>
              </button>
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
            if (window.confirm('Reset app data to fresh clean production state?')) {
              store.resetToSeed();
            }
          }}
          className="text-xs font-black uppercase tracking-wider text-[#141414]/60 hover:text-[#F27D26] flex items-center justify-center gap-1 mx-auto transition cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset App to Fresh Production State</span>
        </button>
      </div>

      {/* Add Report Modal */}
      {isAddReportOpen && (
        <AddRouteFareModal
          isOpen={isAddReportOpen}
          onClose={() => setIsAddReportOpen(false)}
          onRouteAdded={(routeId) => {
            setIsAddReportOpen(false);
            onSelectRoute(routeId);
          }}
        />
      )}
    </div>
  );
};
