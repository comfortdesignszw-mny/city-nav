import React, { useState } from 'react';
import { 
  Bus, 
  Wifi, 
  WifiOff, 
  MapPin, 
  ListOrdered, 
  UserCheck, 
  RefreshCw,
  Car,
  MessageSquare,
  Database,
  Check,
  ShieldCheck,
  LogIn,
  LogOut,
  Shuffle
} from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import { UserProfileModal } from './UserProfileModal';
import { PWAInstallButton } from './PWAInstallButton';
import { THREE_CURRENCIES, formatTimeAgo } from '../utils/formatters';

export type NavTab = 'routes' | 'intercity' | 'transporters' | 'buzz' | 'ranks' | 'my-reports';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const store = useOfflineStore();
  const isOnline = store.isEffectivelyOnline();
  const isSimulated = store.isOfflineSimulated();
  const pendingCount = store.getPendingWritesCount();
  const unreadNotifCount = store.getUnreadNotificationsCount();
  const profile = store.getUserProfile();
  const deviceId = store.getDeviceId();
  const userId = store.getUserId();
  const displayCurrency = store.getDisplayCurrency();
  const syncStatus = store.getSyncStatus();
  const authStatus = store.getAuthStatus();

  const [showSimInfo, setShowSimInfo] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const handleGlobalSync = async () => {
    const res = await store.globalSyncNow({ force: true, reconcileLocal: true });
    if (res.pulled && !res.error) {
      setSyncNotice(
        res.pushed > 0
          ? `Global Sync complete: pushed ${res.pushed} item${res.pushed > 1 ? 's' : ''}, queue cleared & synced across all devices`
          : 'Global Sync complete: queue clean & all devices up to date'
      );
    } else if (res.error) {
      setSyncNotice(res.error);
    }
    setTimeout(() => setSyncNotice(null), 4500);
  };

  const handleGoogleSignIn = async () => {
    const res = await store.loginWithGoogle();
    if (res.error) {
      setSyncNotice(res.error);
      setTimeout(() => setSyncNotice(null), 4500);
    } else if (res.user) {
      setSyncNotice(
        res.isReturning
          ? `Welcome back, ${res.username || res.user.displayName || 'Commuter'}! Existing account (${res.email}) restored.`
          : `Signed in as ${res.username || res.user.displayName || res.email || 'Commuter'} — all data synced!`
      );
      setTimeout(() => setSyncNotice(null), 5000);
    }
  };

  const handleContinueAsGuest = async (regenerate = false) => {
    const res = await store.activateGuestAccount(regenerate);
    if (res.success) {
      setSyncNotice(`Guest account ${res.guestName} active & synced to global cloud!`);
    } else if (res.error) {
      setSyncNotice(res.error);
    }
    setTimeout(() => setSyncNotice(null), 5000);
  };

  const handleLogout = async () => {
    await store.logoutAndClearPersonalData();
    setSyncNotice('Signed out. Personal profile & My Submissions cleared; global view remains active.');
    setTimeout(() => setSyncNotice(null), 5000);
  };

  const isLoggedOut = store.isLoggedOut() && !authStatus.uid;

  return (
    <header className="sticky top-0 z-40 bg-[#F5F5F0] text-[#141414] border-b-2 border-[#141414]">
      {/* Top Brand & Status Bar */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => setActiveTab('routes')}>
          <img
            src="/pwa-192x192.png"
            alt="Fambai 3D Kombi Insignia"
            className="w-10 h-10 object-cover border-2 border-[#141414] shadow-[2px_2px_0px_0px_#F27D26] flex-shrink-0 bg-[#141414]"
          />
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-2xl font-black tracking-tighter text-[#141414]">FAMBAI</span>
              <span className="text-lg sm:text-2xl font-light italic tracking-tighter text-[#F27D26]">/HAMBANI</span>
              <span className="hidden xs:inline-block bg-[#141414] text-white px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest ml-1 border border-[#141414]">
                ZW
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#141414]/70 flex items-center gap-1 flex-wrap">
              {isLoggedOut ? (
                <span>Signed Out • Global View</span>
              ) : (
                <>
                  <span>{profile.username || 'Guest'}</span>
                  {(!authStatus.uid || authStatus.isAnonymous) && (
                    <span className="bg-[#F27D26]/20 text-[#141414] border border-[#141414]/40 px-1 text-[9px] font-black">
                      GUEST
                    </span>
                  )}
                  <span>• UID {userId.slice(-6).toUpperCase()} • DEV {deviceId.slice(-5).toUpperCase()}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Controls: 3-Currency Toggle, Global Sync, Install, Profile, Connectivity */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {/* 3-Currency Toggle (USD | ZWG | ZAR) */}
          <div
            className="flex border-2 border-[#141414] bg-white shadow-[2px_2px_0px_0px_#141414]"
            role="group"
            aria-label="Select display currency"
          >
            {THREE_CURRENCIES.map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => store.setDisplayCurrency(curr)}
                className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider transition cursor-pointer border-r last:border-r-0 border-[#141414] ${
                  displayCurrency === curr
                    ? 'bg-[#141414] text-[#F27D26]'
                    : 'bg-white text-[#141414] hover:bg-[#F5F5F0]'
                }`}
                title={`Display fares in ${curr}`}
              >
                {curr}
              </button>
            ))}
          </div>

          {/* Global Cloud Sync Button */}
          <button
            id="global-sync-btn"
            type="button"
            onClick={handleGlobalSync}
            disabled={syncStatus.isSyncing}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] transition cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
              syncStatus.isSyncing
                ? 'bg-[#F27D26] text-white'
                : pendingCount > 0
                ? 'bg-[#F27D26] text-white hover:bg-[#d96615]'
                : 'bg-white text-[#141414] hover:bg-[#141414] hover:text-white'
            }`}
            title={
              syncStatus.lastSyncedAt
                ? `Last synced ${formatTimeAgo(syncStatus.lastSyncedAt)} • Click to Global Sync across all devices`
                : 'Global Sync all crowdsourced transit data with cloud database'
            }
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{syncStatus.isSyncing ? 'Syncing...' : 'Global Sync'}</span>
            {pendingCount > 0 && (
              <span className="bg-[#141414] text-white px-1 py-0.2 text-[9px] font-black">
                {pendingCount}
              </span>
            )}
          </button>

          {/* Lightweight Native PWA Install Button */}
          <PWAInstallButton variant="compact" />

          {/* Commuter Profile Pill */}
          <button
            onClick={() => setActiveTab('my-reports')}
            className={`flex items-center gap-1.5 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] px-2 py-1 text-xs font-black uppercase transition cursor-pointer ${
              activeTab === 'my-reports' ? 'bg-[#141414] text-white' : 'bg-white hover:bg-[#F27D26] hover:text-white'
            }`}
            title="Open Profile & My Reports"
          >
            <div 
              className="w-4 h-4 text-[9px] font-black text-white flex items-center justify-center border border-[#141414]"
              style={{ backgroundColor: isLoggedOut ? '#141414' : profile.avatarColor || '#F27D26' }}
            >
              {isLoggedOut ? '?' : profile.username ? profile.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="hidden md:inline max-w-[90px] truncate">
              {isLoggedOut ? 'Sign In' : profile.name || profile.username || '@commuter'}
            </span>
          </button>

          {/* Offline / Online Status Pill with interactive toggle */}
          <div className="relative">
            <button
              onClick={() => setShowSimInfo(!showSimInfo)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] sm:text-xs font-black uppercase tracking-widest border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] transition cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                isOnline
                  ? 'bg-[#141414] text-white hover:bg-[#F27D26]'
                  : 'bg-[#F27D26] text-white hover:bg-[#141414]'
              }`}
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{authStatus.uid ? 'Dual Sync Live' : 'Online'}</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-white" />
                  <span>Offline{isSimulated ? ' (Sim)' : ''}</span>
                </>
              )}
            </button>

            {/* Offline Simulator, RLS Auth & SQLite popover */}
            {showSimInfo && (
              <div className="absolute right-0 mt-2 w-80 bg-white text-[#141414] rounded-none shadow-[6px_6px_0px_0px_#141414] p-4 border-2 border-[#141414] z-50 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-[#141414] uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-[#F27D26]" />
                    SQLite + Dual Cloud Sync
                  </span>
                  <button 
                    onClick={() => setShowSimInfo(false)}
                    className="text-[#141414] hover:text-[#F27D26] text-base font-black cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-stone-700 mb-2.5 leading-relaxed font-medium">
                  Offline-first cold start ready. Every write saves immediately to <strong>Local SQLite ({syncStatus.sqliteRowCount} rows)</strong> and dual-syncs with Cloud Firestore when connected.
                </p>

                {/* Cloud Auth Status */}
                <div className="bg-[#F5F5F0] p-2.5 border-2 border-[#141414] mb-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      {isLoggedOut
                        ? 'Signed Out'
                        : authStatus.uid
                        ? authStatus.isAnonymous
                          ? `Guest RLS (${profile.username})`
                          : 'Google RLS ID'
                        : `Guest ID (${profile.username})`}
                    </span>
                    <span className="font-mono text-[10px] font-black text-[#141414]">
                      {isLoggedOut
                        ? 'Cleared'
                        : authStatus.uid
                        ? `${authStatus.uid.slice(0, 10)}...`
                        : 'Offline / Pending'}
                    </span>
                  </div>
                  {!authStatus.uid || authStatus.isAnonymous ? (
                    <div className="space-y-1.5">
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleContinueAsGuest(isLoggedOut)}
                          className="flex-1 py-1.5 px-2 bg-[#F27D26] hover:bg-[#d96615] text-white border border-[#141414] font-black uppercase text-[10px] flex items-center justify-center gap-1 cursor-pointer transition"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>{authStatus.uid ? 'Sync Guest Cloud' : 'Use Guest Account'}</span>
                        </button>
                        {!isLoggedOut && (
                          <button
                            type="button"
                            onClick={() => handleContinueAsGuest(true)}
                            className="py-1.5 px-2 bg-white hover:bg-[#141414] hover:text-white text-[#141414] border border-[#141414] font-black uppercase text-[10px] flex items-center justify-center gap-1 cursor-pointer transition"
                            title="Generate a fresh random guest username (e.g. guest_FxD12)"
                          >
                            <Shuffle className="w-3 h-3 text-[#F27D26]" />
                            <span>New ID</span>
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="w-full py-1.5 px-2 bg-white hover:bg-[#141414] hover:text-white text-[#141414] border border-[#141414] font-black uppercase text-[10px] flex items-center justify-center gap-1.5 cursor-pointer transition"
                      >
                        <LogIn className="w-3 h-3 text-[#F27D26]" />
                        <span>{authStatus.uid ? 'Upgrade to Google Account' : 'Sign In with Google'}</span>
                      </button>
                      {!isLoggedOut && (
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full py-1.5 px-2 bg-red-50 hover:bg-red-600 hover:text-white text-red-700 border border-[#141414] font-black uppercase text-[10px] flex items-center justify-center gap-1.5 cursor-pointer transition"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>Sign Out &amp; Clear Personal Info</span>
                        </button>
                      )}
                      {syncStatus.anonAuthBlocked && (
                        <p className="text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-400 p-1.5 leading-snug">
                          Guest cloud login needs <strong>Anonymous</strong> enabled in Firebase Console → Authentication → Sign-in method, or use Google Sign-In.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-emerald-800 truncate">{authStatus.email || authStatus.displayName}</span>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="text-rose-700 font-black uppercase flex items-center gap-0.5 cursor-pointer"
                      >
                        <LogOut className="w-3 h-3" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>

                {syncStatus.lastSyncedAt && (
                  <p className="text-[10px] font-black uppercase text-emerald-700 mb-2.5 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Last cloud sync: {formatTimeAgo(syncStatus.lastSyncedAt)}
                  </p>
                )}

                <div className="bg-[#F5F5F0] p-2.5 border-2 border-[#141414] mb-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#141414] font-bold">Simulate Offline:</span>
                    <button
                      onClick={() => store.setOfflineSimulation(!isSimulated)}
                      className={`px-2.5 py-1 text-xs font-black uppercase border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] transition cursor-pointer ${
                        isSimulated
                          ? 'bg-rose-600 text-white'
                          : 'bg-white text-[#141414] hover:bg-[#F27D26] hover:text-white'
                      }`}
                    >
                      {isSimulated ? 'Offline ON' : 'Offline OFF'}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    handleGlobalSync();
                    setShowSimInfo(false);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#141414] text-white uppercase font-black tracking-wider text-xs border-2 border-[#141414] hover:bg-[#F27D26] transition shadow-[2px_2px_0px_0px_#141414] cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Global Dual Sync Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Sync Toast Strip */}
      {syncNotice && (
        <div className="bg-[#141414] text-white text-[11px] font-black uppercase tracking-wider text-center py-1 px-3 border-t border-stone-800">
          {syncNotice}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="max-w-4xl mx-auto px-2 sm:px-4 flex border-t-2 border-[#141414] bg-[#F5F5F0] overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('routes')}
          className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-3 px-2 text-xs font-black uppercase tracking-wider transition border-r-2 border-[#141414] cursor-pointer ${
            activeTab === 'routes'
              ? 'bg-[#141414] text-white shadow-[inset_0_-2px_0_0_#F27D26]'
              : 'text-[#141414]/70 hover:text-[#141414] hover:bg-white'
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">Routes</span>
        </button>

        <button
          id="nav-intercity-tab"
          onClick={() => setActiveTab('intercity')}
          className={`flex-1 min-w-[108px] flex items-center justify-center gap-1.5 py-3 px-2 text-xs font-black uppercase tracking-wider transition border-r-2 border-[#141414] cursor-pointer ${
            activeTab === 'intercity'
              ? 'bg-[#141414] text-white shadow-[inset_0_-2px_0_0_#F27D26]'
              : 'text-[#141414]/70 hover:text-[#141414] hover:bg-white'
          }`}
        >
          <Bus className="w-3.5 h-3.5 text-[#F27D26] flex-shrink-0" />
          <span className="truncate">Intercity</span>
        </button>

        <button
          id="nav-transporters-tab"
          onClick={() => setActiveTab('transporters')}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-3 px-2 text-xs font-black uppercase tracking-wider transition border-r-2 border-[#141414] cursor-pointer ${
            activeTab === 'transporters'
              ? 'bg-[#141414] text-white shadow-[inset_0_-2px_0_0_#F27D26]'
              : 'text-[#141414]/70 hover:text-[#141414] hover:bg-white'
          }`}
        >
          <Car className="w-3.5 h-3.5 text-[#F27D26] flex-shrink-0" />
          <span className="truncate">Transporters</span>
        </button>

        <button
          id="nav-buzz-tab"
          onClick={() => setActiveTab('buzz')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-3 px-2 text-xs font-black uppercase tracking-wider transition border-r-2 border-[#141414] cursor-pointer ${
            activeTab === 'buzz'
              ? 'bg-[#141414] text-white shadow-[inset_0_-2px_0_0_#F27D26]'
              : 'text-[#141414]/70 hover:text-[#141414] hover:bg-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-[#F27D26] flex-shrink-0" />
          <span className="truncate">Commuter Buzz</span>
          {unreadNotifCount > 0 && (
            <span
              className="bg-red-600 text-white px-1.5 py-0.2 text-[10px] font-black leading-tight border border-white flex-shrink-0 animate-pulse"
              title={`${unreadNotifCount} unread Commuter Buzz notifications`}
            >
              {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ranks')}
          className={`flex-1 min-w-[105px] flex items-center justify-center gap-1.5 py-3 px-2 text-xs font-black uppercase tracking-wider transition border-r-2 border-[#141414] cursor-pointer ${
            activeTab === 'ranks'
              ? 'bg-[#141414] text-white shadow-[inset_0_-2px_0_0_#F27D26]'
              : 'text-[#141414]/70 hover:text-[#141414] hover:bg-white'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">Ranks &amp; GPS</span>
        </button>

        <button
          onClick={() => setActiveTab('my-reports')}
          className={`flex-1 min-w-[125px] flex items-center justify-center gap-1.5 py-3 px-2 text-xs font-black uppercase tracking-wider transition cursor-pointer ${
            activeTab === 'my-reports'
              ? 'bg-[#141414] text-white shadow-[inset_0_-2px_0_0_#F27D26]'
              : 'text-[#141414]/70 hover:text-[#141414] hover:bg-white'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">Profile &amp; Reports</span>
          {pendingCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-[#F27D26] border border-[#141414] animate-pulse ml-0.5 flex-shrink-0" />
          )}
        </button>
      </div>

      {/* User Profile Modal */}
      {isProfileModalOpen && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </header>
  );
};
