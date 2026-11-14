import React, { useState } from 'react';
import { CloudUpload, LogIn, RefreshCw, UserCheck } from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import { signInWithGoogle } from '../services/firebase';

export const OfflineIndicator: React.FC = () => {
  const store = useOfflineStore();
  const isOnline = store.isEffectivelyOnline();
  const isSimulated = store.isOfflineSimulated();
  const pendingCount = store.getPendingWritesCount();
  const syncStatus = store.getSyncStatus();
  const profile = store.getUserProfile();
  const [authLoading, setAuthLoading] = useState<'guest' | 'google' | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  if (isOnline && pendingCount === 0 && !syncStatus.isSyncing && !authNotice) return null;

  const needsAuthSession = isOnline && pendingCount > 0 && !syncStatus.authUid;

  const handleGuestSync = async () => {
    setAuthLoading('guest');
    setAuthNotice(null);
    try {
      const res = await store.activateGuestAccount(false);
      if (res.success) {
        setAuthNotice(null);
      } else if (res.error) {
        setAuthNotice(res.error);
      }
    } finally {
      setAuthLoading(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading('google');
    setAuthNotice(null);
    try {
      const res = await signInWithGoogle();
      if (res.user) {
        await store.globalSyncNow({ force: true, reconcileLocal: true });
      } else if (res.error) {
        setAuthNotice(res.error);
      }
    } finally {
      setAuthLoading(null);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-lg z-40 animate-in slide-in-from-bottom duration-300">
      <div className="bg-[#141414] text-white px-4 py-3 border-2 border-[#141414] shadow-[4px_4px_0px_0px_#F27D26] space-y-2 text-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {!isOnline ? (
              <>
                <div className="w-3 h-3 bg-[#F27D26] animate-pulse flex-shrink-0 border border-white" />
                <div className="truncate">
                  <span className="font-black uppercase tracking-wider text-xs">
                    Offline Mode ({pendingCount} Queued)
                  </span>
                  <span className="text-stone-300 text-[10px] font-bold block truncate uppercase">
                    {isSimulated
                      ? 'Simulating zero network • SQLite active'
                      : `Local SQLite (${syncStatus.sqliteRowCount} rows) • Auto-syncs when online`}
                  </span>
                </div>
              </>
            ) : (
              <>
                {syncStatus.isSyncing ? (
                  <RefreshCw className="w-4 h-4 text-[#F27D26] animate-spin flex-shrink-0" />
                ) : (
                  <CloudUpload className="w-4 h-4 text-[#F27D26] flex-shrink-0" />
                )}
                <div className="truncate">
                  <span className="font-black uppercase tracking-wider text-xs">
                    {syncStatus.isSyncing
                      ? 'Syncing with Cloud...'
                      : needsAuthSession
                      ? `${pendingCount} Local Item${pendingCount > 1 ? 's' : ''} Waiting`
                      : `${pendingCount} Outbox Report${pendingCount > 1 ? 's' : ''}`}
                  </span>
                  <span className="text-stone-300 text-[10px] font-bold block truncate uppercase">
                    {needsAuthSession
                      ? profile.username
                        ? `Sync as ${profile.username} (Guest) or Google`
                        : 'Sync as Guest or Google'
                      : 'SQLite → Cloud Firestore'}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
            {!isOnline && isSimulated && (
              <button
                onClick={() => store.setOfflineSimulation(false)}
                className="px-3 py-1.5 bg-[#F27D26] hover:bg-white hover:text-[#141414] text-[10px] font-black uppercase tracking-wider text-white border-2 border-white transition cursor-pointer"
              >
                Go Online
              </button>
            )}
            {isOnline && needsAuthSession && (
              <>
                <button
                  onClick={handleGuestSync}
                  disabled={authLoading !== null}
                  className="px-2.5 py-1.5 bg-[#F27D26] hover:bg-white hover:text-[#141414] text-[10px] font-black uppercase tracking-wider text-white border-2 border-white transition cursor-pointer flex items-center gap-1 disabled:opacity-60"
                >
                  <UserCheck className="w-3 h-3" />
                  <span>
                    {authLoading === 'guest'
                      ? 'Syncing...'
                      : profile.username
                      ? `Guest (${profile.username})`
                      : 'Guest Sync'}
                  </span>
                </button>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={authLoading !== null}
                  className="px-2.5 py-1.5 bg-white hover:bg-[#F27D26] hover:text-white text-[10px] font-black uppercase tracking-wider text-[#141414] border-2 border-[#141414] transition cursor-pointer flex items-center gap-1 disabled:opacity-60"
                >
                  <LogIn className="w-3 h-3" />
                  <span>{authLoading === 'google' ? '...' : 'Google'}</span>
                </button>
              </>
            )}
            {isOnline && !needsAuthSession && (
              <button
                onClick={() => store.globalSyncNow({ force: true, reconcileLocal: true })}
                disabled={syncStatus.isSyncing}
                className="px-3 py-1.5 bg-white hover:bg-[#F27D26] hover:text-white text-[10px] font-black uppercase tracking-wider text-[#141414] border-2 border-[#141414] transition cursor-pointer disabled:opacity-60"
              >
                Sync Now
              </button>
            )}
          </div>
        </div>

        {authNotice && (
          <div className="flex items-start justify-between gap-2 bg-amber-950/80 border border-amber-400 px-2.5 py-1.5 text-[10px] font-semibold text-amber-100">
            <span>{authNotice}</span>
            <button
              type="button"
              onClick={() => setAuthNotice(null)}
              className="text-amber-300 font-black cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
