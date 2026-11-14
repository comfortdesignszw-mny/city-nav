import { 
  RouteItem, 
  Rank, 
  FareReport, 
  StatusReport, 
  UserProfile, 
  PendingWrite, 
  ActiveRouteSummary, 
  Currency,
  DisplayCurrency,
  StatusType,
  RouteCategory,
  BusOperator,
  IntercityRoute,
  IntercityReport,
  UserLocation,
  TransporterProfile,
  TransporterVehicleType,
  CommuterSocialInteraction,
  AmenityFeedback,
  AbuseCategory,
  BoardingConfirmation,
  LocationAnchor,
  SyncStatusInfo,
  SocialTargetType,
  SocialPostType,
  SocialReply,
  SocialReactionRecord,
  ReactionTargetType,
  CommuterNotification,
  NotificationType,
} from '../types';
import { 
  SEED_RANKS, 
  SEED_ROUTES, 
  SEED_FARE_REPORTS, 
  SEED_STATUS_REPORTS,
  ZIMBABWE_CITIES,
  ZimbabweCity
} from '../data/seedData';
import {
  BUS_OPERATORS,
  INTERCITY_ROUTES,
  SEED_INTERCITY_REPORTS
} from '../data/intercityData';
import { SEED_TRANSPORTERS } from '../data/transportersData';
import { SEED_SOCIAL_INTERACTIONS } from '../data/socialInteractionsData';
import { calculateDistanceKm, DEFAULT_USER_LOCATION } from '../utils/geoUtils';
import { sqliteDb } from './sqliteDb';
import {
  auth,
  clearSavedGuestUsername,
  continueAsGuest,
  ensureCloudAuth,
  generateGuestUsername,
  getCurrentAuthStatus,
  getOrCreateGuestUsername,
  saveGuestUsername,
  signOutCloud,
  subscribeAuthState,
  syncFirebaseDisplayName,
} from './firebase';
import {
  CloudSnapshotData,
  deletePersonalCloudProfile,
  pullAllFromCloud,
  pushPendingWriteToCloud,
  subscribeToCloudCollections,
} from './cloudSync';

const STORAGE_KEYS = {
  DEVICE_ID: 'fambai_device_id',
  USER_PROFILE: 'fambai_user_profile',
  USER_LOCATION: 'fambai_user_location',
  DISPLAY_CURRENCY: 'fambai_display_currency',
  ROUTES: 'fambai_routes',
  RANKS: 'fambai_ranks',
  FARE_REPORTS: 'fambai_fare_reports',
  STATUS_REPORTS: 'fambai_status_reports',
  OUTBOX_PENDING: 'fambai_outbox_pending',
  LAST_REPORTS_BY_ROUTE: 'fambai_last_report_times',
  OFFLINE_SIMULATION: 'fambai_offline_simulated',
  BUS_OPERATORS: 'fambai_bus_operators',
  INTERCITY_ROUTES: 'fambai_intercity_routes',
  INTERCITY_REPORTS: 'fambai_intercity_reports',
  TRANSPORTERS: 'fambai_transporters',
  SOCIAL_INTERACTIONS: 'fambai_social_interactions',
  SOCIAL_REPLIES: 'fambai_social_replies',
  SOCIAL_REACTIONS: 'fambai_social_reactions',
  NOTIFICATIONS: 'fambai_notifications',
  BOARDING_CONFIRMATIONS: 'fambai_boarding_confirmations',
  COMMUTERS_DIRECTORY: 'fambai_commuters_directory',
  LOCATION_ANCHORS: 'fambai_location_anchors',
  LAST_SYNCED_AT: 'fambai_last_synced_at',
  PRODUCTION_CLEAN: 'fambai_production_clean_v1',
  EXPLICIT_LOGOUT: 'fambai_explicit_logout',
};

export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!id) {
      id = 'zw-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, id);
    }
    return id;
  } catch {
    return 'zw-guest-' + Math.random().toString(36).substring(2, 8);
  }
}

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore quota errors
  }
}

class FambaiOfflineStore {
  private deviceId: string;
  private userProfile: UserProfile;
  private displayCurrency: DisplayCurrency = 'USD';
  private routes: RouteItem[] = [];
  private ranks: Rank[] = [];
  private fareReports: FareReport[] = [];
  private statusReports: StatusReport[] = [];
  private busOperators: BusOperator[] = [];
  private intercityRoutes: IntercityRoute[] = [];
  private intercityReports: IntercityReport[] = [];
  private transporters: TransporterProfile[] = [];
  private socialInteractions: CommuterSocialInteraction[] = [];
  private socialReplies: SocialReply[] = [];
  private socialReactions: SocialReactionRecord[] = [];
  private notifications: CommuterNotification[] = [];
  private boardingConfirmations: BoardingConfirmation[] = [];
  private commutersDirectory: UserProfile[] = [];
  private locationAnchors: LocationAnchor[] = [];
  private outbox: PendingWrite[] = [];
  private userLocation: UserLocation;
  private simulatedOffline: boolean = false;
  private isSyncing: boolean = false;
  private lastSyncedAt: number | null = null;
  private lastSyncError: string | null = null;
  private cloudConnected: boolean = false;
  private sqliteReady: boolean = false;
  private currentAuthUid: string | null = null;
  private listeners: Set<() => void> = new Set();
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private fastRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private fastRetryAttempt: number = 0;
  private flushPromise: Promise<number> | null = null;
  private flushRequestedAgain: boolean = false;
  private globalSyncPromise: Promise<{ pushed: number; pulled: boolean; error?: string }> | null = null;
  private lastVisibilitySyncAt: number = 0;
  private cloudUnsubscribe: (() => void) | null = null;
  private activeSubscribedUid: string | null = null;
  private isExplicitlyLoggedOut: boolean = false;

  constructor() {
    this.deviceId = getOrCreateDeviceId();
    this.isExplicitlyLoggedOut = safeGet<boolean>(STORAGE_KEYS.EXPLICIT_LOGOUT, false);
    this.simulatedOffline = safeGet<boolean>(STORAGE_KEYS.OFFLINE_SIMULATION, false);
    this.displayCurrency = safeGet<DisplayCurrency>(STORAGE_KEYS.DISPLAY_CURRENCY, 'USD');
    this.lastSyncedAt = safeGet<number | null>(STORAGE_KEYS.LAST_SYNCED_AT, null);

    // Production Reset Check
    const hasCleanedForProduction = safeGet<boolean>(STORAGE_KEYS.PRODUCTION_CLEAN, false);
    if (!hasCleanedForProduction) {
      localStorage.removeItem(STORAGE_KEYS.SOCIAL_INTERACTIONS);
      localStorage.removeItem(STORAGE_KEYS.FARE_REPORTS);
      localStorage.removeItem(STORAGE_KEYS.STATUS_REPORTS);
      localStorage.removeItem(STORAGE_KEYS.INTERCITY_REPORTS);
      localStorage.removeItem(STORAGE_KEYS.TRANSPORTERS);
      localStorage.removeItem(STORAGE_KEYS.OUTBOX_PENDING);
      localStorage.removeItem(STORAGE_KEYS.LAST_REPORTS_BY_ROUTE);
      safeSet(STORAGE_KEYS.PRODUCTION_CLEAN, true);
    }

    const cachedLoc = safeGet<UserLocation | null>(STORAGE_KEYS.USER_LOCATION, null);
    this.userLocation = cachedLoc || DEFAULT_USER_LOCATION;

    // 1. Instant Cold-Start Offline Cache Hydration (zero internet required)
    this.initFromLocalCache();

    // 2. Setup user profile (cleared if explicitly logged out, otherwise auto-assigned User ID + Device ID + Guest username)
    if (this.isExplicitlyLoggedOut) {
      this.userProfile = {
        device_id: this.deviceId,
        userId: '',
        username: '',
        handle: '',
        name: undefined,
        phone: undefined,
        ownerUid: undefined,
        avatarColor: '#141414',
        commuterBadge: '',
        role: 'commuter',
        isGuest: false,
        authProvider: undefined,
        reputation_score: 0,
        reports_count: 0,
        createdAt: 0,
        updatedAt: 0,
      };
    } else {
      const existingProfile = safeGet<UserProfile | null>(STORAGE_KEYS.USER_PROFILE, null);
      const guestName = getOrCreateGuestUsername();
      const localAssignedUserId = `usr-${this.deviceId}`;
      if (existingProfile) {
        const isUntouchedLegacyDefault =
          existingProfile.username?.startsWith('Commuter_') &&
          !existingProfile.name &&
          !existingProfile.ownerUid;
        const resolvedUsername = isUntouchedLegacyDefault
          ? guestName
          : existingProfile.username || guestName;
        const resolvedHandle = isUntouchedLegacyDefault
          ? `@${guestName.toLowerCase()}`
          : existingProfile.handle || `@${resolvedUsername.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;

        this.userProfile = {
          ...existingProfile,
          device_id: this.deviceId,
          userId: existingProfile.userId || existingProfile.ownerUid || localAssignedUserId,
          username: resolvedUsername,
          handle: resolvedHandle,
          avatarColor: existingProfile.avatarColor || '#F27D26',
          commuterBadge: existingProfile.commuterBadge || 'Daily Commuter',
          role: existingProfile.role || 'commuter',
          isGuest:
            existingProfile.isGuest !== undefined
              ? existingProfile.isGuest
              : existingProfile.authProvider !== 'google',
          authProvider: existingProfile.authProvider || 'anonymous',
          updatedAt: existingProfile.updatedAt || Date.now(),
        };
        safeSet(STORAGE_KEYS.USER_PROFILE, this.userProfile);
      } else {
        this.userProfile = {
          device_id: this.deviceId,
          userId: localAssignedUserId,
          username: guestName,
          handle: `@${guestName.toLowerCase()}`,
          avatarColor: '#F27D26',
          commuterBadge: 'Daily Commuter',
          role: 'commuter',
          isGuest: true,
          authProvider: 'anonymous',
          reputation_score: 100,
          reports_count: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        safeSet(STORAGE_KEYS.USER_PROFILE, this.userProfile);
      }

      this.ensureLocalUserInDirectory();
    }

    // 3. Initialize Local SQLite + Firebase Auth + Bidirectional Cloud Sync
    this.initSqliteAndCloud();

    // 4. Listen to browser online/offline, visibility, focus & pageshow events for immediate sync
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.fastRetryAttempt = 0;
        this.notifyChange();
        this.onNetworkReconnected();
      });
      window.addEventListener('offline', () => {
        if (this.fastRetryTimer) {
          clearTimeout(this.fastRetryTimer);
          this.fastRetryTimer = null;
        }
        this.cloudConnected = false;
        this.detachCloudListeners();
        this.notifyChange();
      });
      window.addEventListener('focus', () => {
        this.triggerResumeSync();
      });
      window.addEventListener('pageshow', () => {
        this.triggerResumeSync();
      });
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            this.triggerResumeSync();
          }
        });
      }
    }
  }

  private triggerResumeSync(): void {
    if (!this.isEffectivelyOnline()) return;
    const now = Date.now();
    if (this.getPendingWritesCount() > 0) {
      this.globalSyncNow({ force: false, reconcileLocal: true });
      this.lastVisibilitySyncAt = now;
      return;
    }
    if (now - this.lastVisibilitySyncAt > 10000) {
      this.lastVisibilitySyncAt = now;
      this.attachCloudListeners();
      this.globalSyncNow({ force: false, reconcileLocal: false });
    }
  }

  private async onNetworkReconnected(): Promise<void> {
    if (!this.isEffectivelyOnline()) return;
    if (this.fastRetryTimer) {
      clearTimeout(this.fastRetryTimer);
      this.fastRetryTimer = null;
    }
    if (!this.isExplicitlyLoggedOut) {
      await ensureCloudAuth(true, this.userProfile.username);
    }
    this.attachCloudListeners();
    await this.globalSyncNow({ force: true, reconcileLocal: !this.isExplicitlyLoggedOut });
  }

  private backfillLocalOwnerUid(uid: string): void {
    let updatedAny = false;
    this.fareReports.forEach((f) => {
      if (f.reporter_device_id === this.deviceId && !f.ownerUid) {
        f.ownerUid = uid;
        updatedAny = true;
      }
    });
    if (updatedAny) safeSet(STORAGE_KEYS.FARE_REPORTS, this.fareReports);

    let statusChanged = false;
    this.statusReports.forEach((s) => {
      if (s.reporter_device_id === this.deviceId && !s.ownerUid) {
        s.ownerUid = uid;
        statusChanged = true;
      }
    });
    if (statusChanged) safeSet(STORAGE_KEYS.STATUS_REPORTS, this.statusReports);

    let icChanged = false;
    this.intercityReports.forEach((r) => {
      if (r.reporterDeviceId === this.deviceId && !r.ownerUid) {
        r.ownerUid = uid;
        icChanged = true;
      }
    });
    if (icChanged) safeSet(STORAGE_KEYS.INTERCITY_REPORTS, this.intercityReports);

    let transChanged = false;
    this.transporters.forEach((t) => {
      if (t.registeredByDeviceId === this.deviceId && !t.ownerUid) {
        t.ownerUid = uid;
        transChanged = true;
      }
    });
    if (transChanged) safeSet(STORAGE_KEYS.TRANSPORTERS, this.transporters);

    let socChanged = false;
    this.socialInteractions.forEach((s) => {
      if (s.deviceId === this.deviceId && !s.ownerUid) {
        s.ownerUid = uid;
        socChanged = true;
      }
    });
    if (socChanged) safeSet(STORAGE_KEYS.SOCIAL_INTERACTIONS, this.socialInteractions);

    let repChanged = false;
    this.socialReplies.forEach((r) => {
      if (r.deviceId === this.deviceId && !r.ownerUid) {
        r.ownerUid = uid;
        repChanged = true;
      }
    });
    if (repChanged) safeSet(STORAGE_KEYS.SOCIAL_REPLIES, this.socialReplies);

    let reactChanged = false;
    this.socialReactions.forEach((r) => {
      if (r.deviceId === this.deviceId && !r.ownerUid) {
        r.ownerUid = uid;
        reactChanged = true;
      }
    });
    if (reactChanged) safeSet(STORAGE_KEYS.SOCIAL_REACTIONS, this.socialReactions);

    let brdChanged = false;
    this.boardingConfirmations.forEach((b) => {
      if (b.deviceId === this.deviceId && !b.ownerUid) {
        b.ownerUid = uid;
        brdChanged = true;
      }
    });
    if (brdChanged) safeSet(STORAGE_KEYS.BOARDING_CONFIRMATIONS, this.boardingConfirmations);

    if (
      updatedAny ||
      statusChanged ||
      icChanged ||
      transChanged ||
      socChanged ||
      repChanged ||
      reactChanged ||
      brdChanged
    ) {
      this.mirrorAllToSqlite();
    }
  }

  private async initSqliteAndCloud(): Promise<void> {
    const ok = await sqliteDb.init();
    this.sqliteReady = ok;

    if (ok) {
      this.hydrateFromSqliteIfNewer();
      this.mirrorAllToSqlite();
    }

    this.notifyChange();
    this.startBackgroundSync();

    // Attach real-time global cloud listeners immediately when online
    if (this.isEffectivelyOnline()) {
      this.attachCloudListeners();
    }

    let initialAuthHandled = false;

    // Subscribe to Firebase Auth changes for auto-assigned cloud UID (Guest or Google) & dual-sync
    subscribeAuthState(async (user) => {
      const uid = user?.uid || null;
      this.currentAuthUid = uid;
      if (uid && user) {
        initialAuthHandled = true;
        this.isExplicitlyLoggedOut = false;
        try {
          localStorage.removeItem(STORAGE_KEYS.EXPLICIT_LOGOUT);
        } catch {
          // Ignore storage error
        }
        this.backfillLocalOwnerUid(uid);
        const nextIsGuest = !!user.isAnonymous;
        const nextProvider: 'anonymous' | 'google' = user.isAnonymous ? 'anonymous' : 'google';
        const nextUsername =
          this.userProfile.username ||
          (!user.isAnonymous && user.displayName
            ? user.displayName.trim().replace(/\s+/g, '_').slice(0, 32)
            : getOrCreateGuestUsername());
        const nextHandle =
          this.userProfile.handle || `@${nextUsername.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
        const nextName =
          !user.isAnonymous && user.displayName && !this.userProfile.name
            ? user.displayName
            : this.userProfile.name;

        let changed = false;
        if (
          this.userProfile.ownerUid !== uid ||
          !this.userProfile.userId ||
          this.userProfile.userId.startsWith('usr-zw-') ||
          this.userProfile.username !== nextUsername ||
          this.userProfile.handle !== nextHandle ||
          this.userProfile.isGuest !== nextIsGuest ||
          this.userProfile.authProvider !== nextProvider ||
          nextName !== this.userProfile.name
        ) {
          this.userProfile = {
            ...this.userProfile,
            device_id: this.deviceId,
            ownerUid: uid,
            userId: uid,
            username: nextUsername,
            handle: nextHandle,
            name: nextName,
            avatarColor: this.userProfile.avatarColor || '#F27D26',
            commuterBadge: this.userProfile.commuterBadge || 'Daily Commuter',
            reputation_score: this.userProfile.reputation_score || 100,
            createdAt: this.userProfile.createdAt || Date.now(),
            isGuest: nextIsGuest,
            authProvider: nextProvider,
            updatedAt: Date.now(),
          };
          safeSet(STORAGE_KEYS.USER_PROFILE, this.userProfile);
          this.ensureLocalUserInDirectory();
          changed = true;
        }
        if (user.isAnonymous && !user.displayName && this.userProfile.username) {
          await syncFirebaseDisplayName(this.userProfile.username);
        }
        if (changed) {
          this.syncProfileToOutbox(false);
        }
        if (this.isEffectivelyOnline()) {
          // Re-attach cloud listeners with authenticated UID (for notifications)
          if (this.activeSubscribedUid !== uid) {
            this.detachCloudListeners();
          }
          this.attachCloudListeners();
          await this.globalSyncNow({ force: false, reconcileLocal: true });
        }
      }
      this.notifyChange();
    });

    if (this.isEffectivelyOnline()) {
      const user = this.isExplicitlyLoggedOut
        ? null
        : await ensureCloudAuth(false, this.userProfile.username);
      this.attachCloudListeners();
      if (!user || !initialAuthHandled) {
        await this.globalSyncNow({ force: false, reconcileLocal: !!user });
      }
    }
  }

  private hydrateFromSqliteIfNewer(): void {
    if (!sqliteDb.isReady()) return;

    const sqlPriv = sqliteDb.getAll<{ device_id: string; phone?: string; ownerUid?: string; updatedAt?: number }>('private_profile');
    const myPriv = sqlPriv.find((p) => p.device_id === this.deviceId);
    if (!this.isExplicitlyLoggedOut && myPriv?.phone && !this.userProfile.phone) {
      this.userProfile.phone = myPriv.phone;
      safeSet(STORAGE_KEYS.USER_PROFILE, this.userProfile);
    }

    const sqlFares = sqliteDb.getAll<FareReport>('fare_reports');
    if (sqlFares.length > 0) this.mergeFareReports(sqlFares);

    const sqlStatuses = sqliteDb.getAll<StatusReport>('status_reports');
    if (sqlStatuses.length > 0) this.mergeStatusReports(sqlStatuses);

    const sqlRoutes = sqliteDb.getAll<RouteItem>('routes');
    if (sqlRoutes.length > 0) this.mergeRoutes(sqlRoutes);

    const sqlIc = sqliteDb.getAll<IntercityReport>('intercity_reports');
    if (sqlIc.length > 0) this.mergeIntercityReports(sqlIc);

    const sqlTrans = sqliteDb.getAll<TransporterProfile>('transporters');
    if (sqlTrans.length > 0) this.mergeTransporters(sqlTrans);

    const sqlSocial = sqliteDb.getAll<CommuterSocialInteraction>('social_interactions');
    if (sqlSocial.length > 0) this.mergeSocialInteractions(sqlSocial);

    const sqlReplies = sqliteDb.getAll<SocialReply>('social_replies');
    if (sqlReplies.length > 0) this.mergeSocialReplies(sqlReplies);

    const sqlReactions = sqliteDb.getAll<SocialReactionRecord>('social_reactions');
    if (sqlReactions.length > 0) this.mergeSocialReactions(sqlReactions);

    const sqlNotifs = sqliteDb.getAll<CommuterNotification>('notifications');
    if (sqlNotifs.length > 0) this.mergeNotifications(sqlNotifs);

    const sqlBoardings = sqliteDb.getAll<BoardingConfirmation>('boarding_confirmations');
    if (sqlBoardings.length > 0) this.mergeBoardingConfirmations(sqlBoardings);

    const sqlCommuters = sqliteDb.getAll<UserProfile>('commuters');
    if (sqlCommuters.length > 0) this.mergeCommuters(sqlCommuters);

    const sqlAnchors = sqliteDb.getAll<LocationAnchor>('location_anchors');
    if (sqlAnchors.length > 0) this.mergeLocationAnchors(sqlAnchors);

    const sqlOutbox = sqliteDb.getAll<PendingWrite>('outbox_pending');
    if (sqlOutbox.length > 0) {
      const outboxMap = new Map<string, PendingWrite>();
      this.outbox.forEach((w) => outboxMap.set(w.id, w));
      sqlOutbox.forEach((w) => {
        if (!outboxMap.has(w.id)) outboxMap.set(w.id, w);
      });
      this.outbox = Array.from(outboxMap.values()).sort((a, b) => b.created_at - a.created_at);
      safeSet(STORAGE_KEYS.OUTBOX_PENDING, this.outbox);
    }
  }

  private mirrorAllToSqlite(): void {
    if (!sqliteDb.isReady()) return;
    sqliteDb.replaceTable('commuters', this.commutersDirectory.map((c) => this.stripPhoneForPublic(c)));
    if (this.userProfile.phone !== undefined) {
      sqliteDb.upsertRecord('private_profile', this.deviceId, {
        device_id: this.deviceId,
        ownerUid: this.userProfile.ownerUid,
        phone: this.userProfile.phone,
        updatedAt: this.userProfile.updatedAt || Date.now(),
      });
    }
    sqliteDb.replaceTable('routes', this.routes);
    sqliteDb.replaceTable('fare_reports', this.fareReports);
    sqliteDb.replaceTable('status_reports', this.statusReports);
    sqliteDb.replaceTable('intercity_reports', this.intercityReports);
    sqliteDb.replaceTable('transporters', this.transporters);
    sqliteDb.replaceTable('social_interactions', this.socialInteractions);
    sqliteDb.replaceTable('social_replies', this.socialReplies);
    sqliteDb.replaceTable('social_reactions', this.socialReactions);
    sqliteDb.replaceTable('notifications', this.notifications);
    sqliteDb.replaceTable('boarding_confirmations', this.boardingConfirmations);
    sqliteDb.replaceTable('location_anchors', this.locationAnchors);
    sqliteDb.replaceTable('outbox_pending', this.outbox);
  }

  private stripPhoneForPublic(p: UserProfile): UserProfile {
    const copy = { ...p };
    delete copy.phone;
    return copy;
  }

  private initFromLocalCache() {
    const cachedRoutes = safeGet<RouteItem[]>(STORAGE_KEYS.ROUTES, []);
    const cachedRanks = safeGet<Rank[]>(STORAGE_KEYS.RANKS, []);
    const cachedFares = safeGet<FareReport[]>(STORAGE_KEYS.FARE_REPORTS, []);
    const cachedStatuses = safeGet<StatusReport[]>(STORAGE_KEYS.STATUS_REPORTS, []);
    const cachedOperators = safeGet<BusOperator[]>(STORAGE_KEYS.BUS_OPERATORS, []);
    const cachedIntercityRoutes = safeGet<IntercityRoute[]>(STORAGE_KEYS.INTERCITY_ROUTES, []);
    const cachedIntercityReports = safeGet<IntercityReport[]>(STORAGE_KEYS.INTERCITY_REPORTS, []);
    const cachedTransporters = safeGet<TransporterProfile[]>(STORAGE_KEYS.TRANSPORTERS, []);
    const cachedSocial = safeGet<CommuterSocialInteraction[]>(STORAGE_KEYS.SOCIAL_INTERACTIONS, []);
    const cachedReplies = safeGet<SocialReply[]>(STORAGE_KEYS.SOCIAL_REPLIES, []);
    const cachedReactions = safeGet<SocialReactionRecord[]>(STORAGE_KEYS.SOCIAL_REACTIONS, []);
    const cachedNotifications = safeGet<CommuterNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const cachedBoardings = safeGet<BoardingConfirmation[]>(STORAGE_KEYS.BOARDING_CONFIRMATIONS, []);
    const cachedCommuters = safeGet<UserProfile[]>(STORAGE_KEYS.COMMUTERS_DIRECTORY, []);
    const cachedAnchors = safeGet<LocationAnchor[]>(STORAGE_KEYS.LOCATION_ANCHORS, []);
    const cachedOutbox = safeGet<PendingWrite[]>(STORAGE_KEYS.OUTBOX_PENDING, []);

    const routeMap = new Map<string, RouteItem>();
    SEED_ROUTES.forEach((r) => routeMap.set(r.id, r));
    cachedRoutes.forEach((r) => {
      const existing = routeMap.get(r.id);
      routeMap.set(r.id, existing ? { ...existing, ...r } : r);
    });
    this.routes = Array.from(routeMap.values());
    safeSet(STORAGE_KEYS.ROUTES, this.routes);

    const rankMap = new Map<string, Rank>();
    SEED_RANKS.forEach((rnk) => rankMap.set(rnk.id, rnk));
    cachedRanks.forEach((rnk) => rankMap.set(rnk.id, rnk));
    this.ranks = Array.from(rankMap.values());
    safeSet(STORAGE_KEYS.RANKS, this.ranks);

    const fareMap = new Map<string, FareReport>();
    SEED_FARE_REPORTS.forEach((f) => fareMap.set(f.id, f));
    cachedFares.forEach((f) => fareMap.set(f.id, f));
    this.fareReports = Array.from(fareMap.values());
    safeSet(STORAGE_KEYS.FARE_REPORTS, this.fareReports);

    const statusMap = new Map<string, StatusReport>();
    SEED_STATUS_REPORTS.forEach((s) => statusMap.set(s.id, s));
    cachedStatuses.forEach((s) => statusMap.set(s.id, s));
    this.statusReports = Array.from(statusMap.values());
    safeSet(STORAGE_KEYS.STATUS_REPORTS, this.statusReports);

    const opMap = new Map<string, BusOperator>();
    BUS_OPERATORS.forEach((op) => opMap.set(op.id, op));
    cachedOperators.forEach((op) => opMap.set(op.id, op));
    this.busOperators = Array.from(opMap.values());
    safeSet(STORAGE_KEYS.BUS_OPERATORS, this.busOperators);

    const icRouteMap = new Map<string, IntercityRoute>();
    INTERCITY_ROUTES.forEach((r) => icRouteMap.set(r.id, r));
    cachedIntercityRoutes.forEach((r) => icRouteMap.set(r.id, r));
    this.intercityRoutes = Array.from(icRouteMap.values());
    safeSet(STORAGE_KEYS.INTERCITY_ROUTES, this.intercityRoutes);

    const icRepMap = new Map<string, IntercityReport>();
    SEED_INTERCITY_REPORTS.forEach((rep) => icRepMap.set(rep.id, rep));
    cachedIntercityReports.forEach((rep) => icRepMap.set(rep.id, rep));
    this.intercityReports = Array.from(icRepMap.values());
    safeSet(STORAGE_KEYS.INTERCITY_REPORTS, this.intercityReports);

    const transMap = new Map<string, TransporterProfile>();
    SEED_TRANSPORTERS.forEach((t) => transMap.set(t.id, t));
    cachedTransporters.forEach((t) => {
      const existing = transMap.get(t.id);
      transMap.set(t.id, existing ? { ...existing, ...t } : t);
    });
    this.transporters = Array.from(transMap.values());
    safeSet(STORAGE_KEYS.TRANSPORTERS, this.transporters);

    const socialMap = new Map<string, CommuterSocialInteraction>();
    SEED_SOCIAL_INTERACTIONS.forEach((s) => socialMap.set(s.id, s));
    cachedSocial.forEach((s) => {
      const existing = socialMap.get(s.id);
      socialMap.set(s.id, existing ? { ...existing, ...s } : s);
    });
    this.socialInteractions = Array.from(socialMap.values()).sort((a, b) => b.createdAt - a.createdAt);
    safeSet(STORAGE_KEYS.SOCIAL_INTERACTIONS, this.socialInteractions);

    this.socialReplies = cachedReplies.sort((a, b) => a.createdAt - b.createdAt);
    this.socialReactions = cachedReactions;
    this.notifications = cachedNotifications.sort((a, b) => b.createdAt - a.createdAt);
    this.boardingConfirmations = cachedBoardings.sort((a, b) => b.createdAt - a.createdAt);
    this.commutersDirectory = cachedCommuters;
    this.locationAnchors = cachedAnchors;
    this.outbox = cachedOutbox;
  }

  private ensureLocalUserInDirectory(): void {
    if (this.isExplicitlyLoggedOut || !this.userProfile.username) return;
    const publicProfile = this.stripPhoneForPublic(this.userProfile);
    const idx = this.commutersDirectory.findIndex((c) => c.device_id === this.deviceId);
    if (idx >= 0) {
      this.commutersDirectory[idx] = { ...this.commutersDirectory[idx], ...publicProfile };
    } else {
      this.commutersDirectory = [publicProfile, ...this.commutersDirectory];
    }
    safeSet(STORAGE_KEYS.COMMUTERS_DIRECTORY, this.commutersDirectory);
    if (sqliteDb.isReady()) {
      sqliteDb.upsertRecord('commuters', this.userProfile.device_id, publicProfile);
    }
  }

  private getPendingDeletedIds(deleteType: PendingWrite['type']): Set<string> {
    const ids = new Set<string>();
    for (const w of this.outbox) {
      if (w.type === deleteType && w.status !== 'synced' && w.payload?.id) {
        ids.add(w.payload.id);
      }
    }
    return ids;
  }

  private getPendingCreateIds(createType: PendingWrite['type'], extraAddRouteKey?: 'route' | 'fare' | 'status'): Set<string> {
    const ids = new Set<string>();
    for (const w of this.outbox) {
      if (w.status === 'synced') continue;
      if (w.type === createType && w.payload?.id) {
        ids.add(w.payload.id);
      }
      if (w.type === 'add_route' && extraAddRouteKey && w.payload?.[extraAddRouteKey]?.id) {
        ids.add(w.payload[extraAddRouteKey].id);
      }
    }
    return ids;
  }

  // --- CLOUD MERGE HELPERS ---
  private mergeCommuters(cloudList: UserProfile[], authoritative = false): void {
    const map = new Map<string, UserProfile>();
    if (!authoritative) {
      this.commutersDirectory.forEach((c) => map.set(c.device_id, this.stripPhoneForPublic(c)));
    }
    cloudList.forEach((c) => {
      const existing = map.get(c.device_id);
      const cleanC = this.stripPhoneForPublic(c);
      if (c.device_id === this.deviceId && !this.isExplicitlyLoggedOut) {
        const localUpdated = this.userProfile.updatedAt || 0;
        const cloudUpdated = c.updatedAt || 0;
        if (cloudUpdated > localUpdated) {
          this.userProfile = {
            ...this.userProfile,
            ...cleanC,
            phone: this.userProfile.phone,
            ownerUid: cleanC.ownerUid || this.userProfile.ownerUid,
            userId: cleanC.userId || cleanC.ownerUid || this.userProfile.userId,
          };
          safeSet(STORAGE_KEYS.USER_PROFILE, this.userProfile);
        }
        map.set(c.device_id, this.stripPhoneForPublic(this.userProfile));
      } else {
        map.set(c.device_id, existing ? { ...existing, ...cleanC } : cleanC);
      }
    });
    if (authoritative && !this.isExplicitlyLoggedOut && this.userProfile.username && !map.has(this.deviceId)) {
      map.set(this.deviceId, this.stripPhoneForPublic(this.userProfile));
    }
    this.commutersDirectory = Array.from(map.values()).sort(
      (a, b) => (b.reputation_score || 0) - (a.reputation_score || 0)
    );
    safeSet(STORAGE_KEYS.COMMUTERS_DIRECTORY, this.commutersDirectory);
    if (sqliteDb.isReady()) sqliteDb.replaceTable('commuters', this.commutersDirectory);
  }

  private mergeRoutes(cloudList: RouteItem[], authoritative = false): void {
    const seedIds = new Set(SEED_ROUTES.map((r) => r.id));
    const pendingRouteIds = this.getPendingCreateIds('add_route', 'route');
    const map = new Map<string, RouteItem>();
    this.routes.forEach((r) => {
      if (!authoritative || seedIds.has(r.id) || pendingRouteIds.has(r.id)) {
        map.set(r.id, r);
      }
    });
    cloudList.forEach((r) => {
      const existing = map.get(r.id);
      map.set(r.id, existing ? { ...existing, ...r } : r);
    });
    this.routes = Array.from(map.values());
    safeSet(STORAGE_KEYS.ROUTES, this.routes);
    if (sqliteDb.isReady()) sqliteDb.replaceTable('routes', this.routes);
  }

  private mergeFareReports(cloudList: FareReport[], authoritative = false): void {
    const deletedIds = this.getPendingDeletedIds('fare_delete');
    const pendingIds = this.getPendingCreateIds('fare_report', 'fare');
    const map = new Map<string, FareReport>();
    this.fareReports.forEach((f) => {
      if (!deletedIds.has(f.id) && (!authoritative || pendingIds.has(f.id))) {
        map.set(f.id, f);
      }
    });
    cloudList.forEach((f) => {
      if (deletedIds.has(f.id)) return;
      const existing = map.get(f.id);
      map.set(f.id, existing ? { ...existing, ...f, userVote: existing.userVote } : f);
    });
    this.fareReports = Array.from(map.values()).sort((a, b) => b.reported_at - a.reported_at);
    safeSet(STORAGE_KEYS.FARE_REPORTS, this.fareReports);
    if (sqliteDb.isReady()) sqliteDb.replaceTable('fare_reports', this.fareReports);
  }

  private mergeStatusReports(cloudList: StatusReport[], authoritative = false): void {
    const deletedIds = this.getPendingDeletedIds('status_delete');
    const pendingIds = this.getPendingCreateIds('status_report', 'status');
    const map = new Map<string, StatusReport>();
    this.statusReports.forEach((s) => {
      if (!deletedIds.has(s.id) && (!authoritative || pendingIds.has(s.id))) {
        map.set(s.id, s);
      }
    });
    cloudList.forEach((s) => {
      if (!deletedIds.has(s.id)) map.set(s.id, s);
    });
    this.statusReports = Array.from(map.values()).sort((a, b) => b.reported_at - a.reported_at);
    safeSet(STORAGE_KEYS.STATUS_REPORTS, this.statusReports);
    if (sqliteDb.isReady()) sqliteDb.replaceTable('status_reports', this.statusReports);
  }

  private mergeIntercityReports(cloudList: IntercityReport[], authoritative = false): void {
    const deletedIds = this.getPendingDeletedIds('intercity_delete');
    const pendingIds = this.getPendingCreateIds('intercity_report');
    const map = new Map<string, IntercityReport>();
    this.intercityReports.forEach((r) => {
      if (!deletedIds.has(r.id) && (!authoritative || pendingIds.has(r.id))) {
        map.set(r.id, r);
      }
    });
    cloudList.forEach((r) => {
      if (deletedIds.has(r.id)) return;
      const existing = map.get(r.id);
      map.set(r.id, existing ? { ...existing, ...r, userVote: existing.userVote } : r);
    });
    this.intercityReports = Array.from(map.values()).sort((a, b) => b.reportedAt - a.reportedAt);
    safeSet(STORAGE_KEYS.INTERCITY_REPORTS, this.intercityReports);
    if (sqliteDb.isReady()) sqliteDb.replaceTable('intercity_reports', this.intercityReports);
  }

  private mergeTransporters(cloudList: TransporterProfile[], authoritative = false): void {
    const deletedIds = this.getPendingDeletedIds('transporter_delete');
    const pendingIds = this.getPendingCreateIds('transporter_register');
    const pendingEditIds = this.getPendingCreateIds('transporter_update');
    const map = new Map<string, TransporterProfile>();
    this.transporters.forEach((t) => {
      if (!deletedIds.has(t.id) && (!authoritative || pendingIds.has(t.id) || pendingEditIds.has(t.id))) {
        map.set(t.id, t);
      }
    });
    cloudList.forEach((t) => {
      if (deletedIds.has(t.id)) return;
      const existing = map.get(t.id);
      if (existing) {
        const newer = (t.lastRouteUpdate || 0) >= (existing.lastRouteUpdate || 0) ? { ...existing, ...t } : { ...t, ...existing };
        map.set(t.id, { ...newer, userLiked: existing.userLiked });
      } else {
        map.set(t.id, t);
      }
    });
    this.transporters = Array.from(map.values()).sort((a, b) => b.lastRouteUpdate - a.lastRouteUpdate);
    safeSet(STORAGE_KEYS.TRANSPORTERS, this.transporters);
    if (sqliteDb.isReady()) sqliteDb.replaceTable('transporters', this.transporters);
  }

  private mergeSocialInteractions(cloudList: CommuterSocialInteraction[], authoritative = false): void {
    const deletedIds = this.getPendingDeletedIds('social_interaction_delete');
    const pendingIds = this.getPendingCreateIds('social_interaction');
    const pendingEditIds = this.getPendingCreateIds('social_interaction_edit');
    const map = new Map<string, CommuterSocialInteraction>();
    this.socialInteractions.forEach((s) => {
      if (!deletedIds.has(s.id) && (!authoritative || pendingIds.has(s.id) || pendingEditIds.has(s.id))) {
        map.set(s.id, s);
      }
    });
    cloudList.forEach((s) => {
      if (deletedIds.has(s.id)) return;
      const existing = map.get(s.id);
      if (existing) {
        const newer = (s.updatedAt || s.createdAt) >= (existing.updatedAt || existing.createdAt)
          ? { ...existing, ...s }
          : { ...s, ...existing };
        map.set(s.id, { ...newer, userReaction: existing.userReaction });
      } else {
        map.set(s.id, s);
      }
    });
    this.socialInteractions = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
    safeSet(STORAGE_KEYS.SOCIAL_INTERACTIONS, this.socialInteractions);
    if (sqliteDb.isReady()) sqliteDb.replaceTable('social_interactions', this.socialInteractions);
  }

  private mergeSocialReplies(cloudList: SocialReply[], authoritative = false): void {
    const deletedIds = this.getPendingDeletedIds('social_reply_delete');
    const pendingIds = this.getPendingCreateIds('social_reply');
    const pendingEditIds = this.getPendingCreateIds('social_reply_edit');
    const map = new Map<string, SocialReply>();
    this.socialReplies.forEach((r) => {
      if (!deletedIds.has(r.id) && (!authoritative || pendingIds.has(r.id) || pendingEditIds.has(r.id))) {
        map.set(r.id, r);
      }
    });
    cloudList.forEach((r) => {
      if (deletedIds.has(r.id)) return;
      const existing = map.get(r.id);
      if (existing) {
        const newer = (r.updatedAt || r.createdAt) >= (existing.updatedAt || existing.createdAt)
          ? { ...existing, ...r }
          : { ...r, ...existing };
        map.set(r.id, newer);
      } else {
        map.set(r.id, r);
      }
    });
    this.socialReplies = Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
    safeSet(STORAGE_KEYS.SOCIAL_REPLIES, this.socialReplies);
    if (sqliteDb.isReady()) sqliteDb.replaceTable('social_replies', this.socialReplies);
  }

  private mergeSocialReactions(cloudList: SocialReactionRecord[], authoritative = false): void {
    const deletedIds = this.getPendingDeletedIds('social_reaction_delete');
    const pendingIds = this.getPendingCreateIds('social_reaction_record');
    const map = new Map<string, SocialReactionRecord>();
    this.socialReactions.forEach((rec) => {
      if (!deletedIds.has(rec.id) && (!authoritative || pendingIds.has(rec.id))) {
        map.set(rec.id, rec);
      }
    });
    cloudList.forEach((rec) => {
      if (deletedIds.has(rec.id)) return;
      const existing = map.get(rec.id);
      if (!existing || (rec.updatedAt || rec.createdAt) >= (existing.updatedAt || existing.createdAt)) {
        map.set(rec.id, rec);
      }
    });
    this.socialReactions = Array.from(map.values());
    safeSet(STORAGE_KEYS.SOCIAL_REACTIONS, this.socialReactions);
    if (sqliteDb.isReady()) sqliteDb.replaceTable('social_reactions', this.socialReactions);
  }

  private mergeNotifications(cloudList: CommuterNotification[]): void {
    const map = new Map<string, CommuterNotification>();
    this.notifications.forEach((n) => map.set(n.id, n));
    cloudList.forEach((n) => {
      const existing = map.get(n.id);
      map.set(n.id, existing ? { ...existing, ...n, read: existing.read || n.read } : n);
    });
    this.notifications = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
    safeSet(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
    if (sqliteDb.isReady()) sqliteDb.replaceTable('notifications', this.notifications);
  }

  private mergeBoardingConfirmations(cloudList: BoardingConfirmation[], authoritative = false): void {
    const pendingIds = this.getPendingCreateIds('boarding_confirmation');
    const map = new Map<string, BoardingConfirmation>();
    this.boardingConfirmations.forEach((b) => {
      if (!authoritative || pendingIds.has(b.id)) {
        map.set(b.id, b);
      }
    });
    cloudList.forEach((b) => map.set(b.id, b));
    this.boardingConfirmations = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
    safeSet(STORAGE_KEYS.BOARDING_CONFIRMATIONS, this.boardingConfirmations);
    if (sqliteDb.isReady()) sqliteDb.replaceTable('boarding_confirmations', this.boardingConfirmations);
  }

  private mergeLocationAnchors(cloudList: LocationAnchor[]): void {
    const map = new Map<string, LocationAnchor>();
    this.locationAnchors.forEach((a) => map.set(a.deviceId, a));
    cloudList.forEach((a) => map.set(a.deviceId, a));
    this.locationAnchors = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
    safeSet(STORAGE_KEYS.LOCATION_ANCHORS, this.locationAnchors);
    if (sqliteDb.isReady()) sqliteDb.replaceTable('location_anchors', this.locationAnchors);
  }

  private applyCloudSnapshot(data: CloudSnapshotData): void {
    if (!this.isExplicitlyLoggedOut && data.privatePhone && !this.userProfile.phone) {
      this.userProfile.phone = data.privatePhone;
      safeSet(STORAGE_KEYS.USER_PROFILE, this.userProfile);
    }
    const authFlags = data.authoritative;
    this.mergeCommuters(data.commuters, authFlags?.commuters);
    this.mergeRoutes(data.routes, authFlags?.routes);
    this.mergeFareReports(data.fareReports, authFlags?.fareReports);
    this.mergeStatusReports(data.statusReports, authFlags?.statusReports);
    this.mergeIntercityReports(data.intercityReports, authFlags?.intercityReports);
    this.mergeTransporters(data.transporters, authFlags?.transporters);
    this.mergeSocialInteractions(data.socialInteractions, authFlags?.socialInteractions);
    this.mergeSocialReplies(data.socialReplies, authFlags?.socialReplies);
    this.mergeSocialReactions(data.socialReactions, authFlags?.socialReactions);
    if (!this.isExplicitlyLoggedOut) {
      this.mergeNotifications(data.notifications);
    }
    this.mergeBoardingConfirmations(data.boardingConfirmations, authFlags?.boardingConfirmations);
    this.mergeLocationAnchors(data.locationAnchors);
    this.cloudConnected = true;
    this.lastSyncedAt = Date.now();
    this.lastSyncError = null;
    safeSet(STORAGE_KEYS.LAST_SYNCED_AT, this.lastSyncedAt);
    this.notifyChange();
  }

  private attachCloudListeners(): void {
    const uid = auth.currentUser?.uid || null;
    if (this.cloudUnsubscribe && this.activeSubscribedUid === uid) return;
    if (!this.isEffectivelyOnline()) return;

    this.detachCloudListeners();
    try {
      this.activeSubscribedUid = uid;
      this.cloudUnsubscribe = subscribeToCloudCollections((key, items) => {
        if (!this.isEffectivelyOnline()) return;
        switch (key) {
          case 'commuters':
            this.mergeCommuters(items as UserProfile[], true);
            break;
          case 'routes':
            this.mergeRoutes(items as RouteItem[], true);
            break;
          case 'fareReports':
            this.mergeFareReports(items as FareReport[], true);
            break;
          case 'statusReports':
            this.mergeStatusReports(items as StatusReport[], true);
            break;
          case 'intercityReports':
            this.mergeIntercityReports(items as IntercityReport[], true);
            break;
          case 'transporters':
            this.mergeTransporters(items as TransporterProfile[], true);
            break;
          case 'socialInteractions':
            this.mergeSocialInteractions(items as CommuterSocialInteraction[], true);
            break;
          case 'socialReplies':
            this.mergeSocialReplies(items as SocialReply[], true);
            break;
          case 'socialReactions':
            this.mergeSocialReactions(items as SocialReactionRecord[], true);
            break;
          case 'notifications':
            this.mergeNotifications(items as CommuterNotification[]);
            break;
          case 'boardingConfirmations':
            this.mergeBoardingConfirmations(items as BoardingConfirmation[], true);
            break;
          case 'locationAnchors':
            this.mergeLocationAnchors(items as LocationAnchor[]);
            break;
        }
        this.cloudConnected = true;
        this.lastSyncedAt = Date.now();
        safeSet(STORAGE_KEYS.LAST_SYNCED_AT, this.lastSyncedAt);
        this.notifyChange();
      }, uid);
    } catch {
      // Ignore attach warning when offline
    }
  }

  private detachCloudListeners(): void {
    if (this.cloudUnsubscribe) {
      this.cloudUnsubscribe();
      this.cloudUnsubscribe = null;
      this.activeSubscribedUid = null;
    }
  }

  // --- SUBSCRIPTION ---
  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notifyChange(): void {
    this.listeners.forEach((fn) => fn());
  }

  // --- OWNERSHIP CHECK ---
  public isOwnerOf(ownerUid?: string, itemDeviceId?: string): boolean {
    if (this.isExplicitlyLoggedOut) return false;
    const uid = this.currentAuthUid || auth.currentUser?.uid;
    if (ownerUid && uid && ownerUid === uid) return true;
    if (itemDeviceId && itemDeviceId === this.deviceId) {
      if (!ownerUid || !uid || ownerUid === this.userProfile.ownerUid) return true;
    }
    return false;
  }

  public isLoggedOut(): boolean {
    return this.isExplicitlyLoggedOut && !this.currentAuthUid && !auth.currentUser?.uid;
  }

  // --- REACTION AGGREGATION HELPERS ---
  private computeReactionSummary(
    targetType: ReactionTargetType,
    targetId: string,
    baseUpOrLike: number = 0,
    baseDownOrDislike: number = 0
  ): {
    upOrLikeCount: number;
    downOrDislikeCount: number;
    myReaction?: 'up' | 'down' | 'like' | 'dislike';
  } {
    const matching = this.socialReactions.filter(
      (r) => r.targetType === targetType && r.targetId === targetId
    );
    const upReactions = matching.filter((r) => r.reaction === 'up' || r.reaction === 'like').length;
    const downReactions = matching.filter((r) => r.reaction === 'down' || r.reaction === 'dislike').length;
    const mine = matching.find((r) => r.deviceId === this.deviceId);
    return {
      upOrLikeCount: Math.max(baseUpOrLike, upReactions),
      downOrDislikeCount: Math.max(baseDownOrDislike, downReactions),
      myReaction: mine?.reaction,
    };
  }

  private toggleReactionRecord(
    targetType: ReactionTargetType,
    targetId: string,
    desired: 'up' | 'down' | 'like' | 'dislike',
    autoFlush = true
  ): { added: boolean; removed: boolean } {
    const recId = `${targetType}_${targetId}_${this.deviceId}`;
    const existingIdx = this.socialReactions.findIndex((r) => r.id === recId);
    const now = Date.now();
    const uid = this.currentAuthUid || auth.currentUser?.uid || this.userProfile.ownerUid;

    if (existingIdx >= 0 && this.socialReactions[existingIdx].reaction === desired) {
      // Undo reaction
      this.socialReactions.splice(existingIdx, 1);
      safeSet(STORAGE_KEYS.SOCIAL_REACTIONS, this.socialReactions);
      if (sqliteDb.isReady()) sqliteDb.deleteRecord('social_reactions', recId);
      this.enqueueWrite('social_reaction_delete', { id: recId }, autoFlush);
      this.notifyChange();
      return { added: false, removed: true };
    }

    const record: SocialReactionRecord = {
      id: recId,
      targetType,
      targetId,
      reaction: desired,
      deviceId: this.deviceId,
      ownerUid: uid,
      username: this.getUsername(),
      createdAt: existingIdx >= 0 ? this.socialReactions[existingIdx].createdAt : now,
      updatedAt: now,
    };

    if (existingIdx >= 0) {
      this.socialReactions[existingIdx] = record;
    } else {
      this.socialReactions = [record, ...this.socialReactions];
    }

    safeSet(STORAGE_KEYS.SOCIAL_REACTIONS, this.socialReactions);
    if (sqliteDb.isReady()) sqliteDb.upsertRecord('social_reactions', record.id, record, now);
    this.enqueueWrite('social_reaction_record', record, autoFlush);
    this.notifyChange();
    return { added: true, removed: false };
  }

  // --- SYNC STATUS & CURRENCY ---
  public getSyncStatus(): SyncStatusInfo {
    const authStat = getCurrentAuthStatus();
    return {
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncedAt,
      lastSyncError: this.lastSyncError,
      cloudConnected: this.cloudConnected && this.isEffectivelyOnline(),
      sqliteReady: this.sqliteReady,
      sqliteRowCount: sqliteDb.isReady() ? sqliteDb.getTotalRowCount() : 0,
      authReady: !!authStat.uid,
      authUid: authStat.uid,
      anonAuthBlocked: authStat.anonAuthBlocked,
    };
  }

  public getAuthStatus() {
    return getCurrentAuthStatus();
  }

  public getDisplayCurrency(): DisplayCurrency {
    return this.displayCurrency;
  }

  public setDisplayCurrency(currency: DisplayCurrency): void {
    this.displayCurrency = currency;
    safeSet(STORAGE_KEYS.DISPLAY_CURRENCY, currency);
    this.notifyChange();
  }

  // --- PROFILE & IDENTITY ---
  public getDeviceId(): string {
    return this.deviceId;
  }

  public getUserId(): string {
    return this.userProfile.ownerUid || this.userProfile.userId || `usr-${this.deviceId}`;
  }

  public getUserProfile(): UserProfile {
    return { ...this.userProfile };
  }

  public getUsername(): string {
    return this.userProfile.username || 'Commuter';
  }

  public getUserHandle(): string {
    return this.userProfile.handle || '@commuter';
  }

  public getUserBadge(): string {
    return this.userProfile.commuterBadge || 'Daily Commuter';
  }

  public getCommutersDirectory(): UserProfile[] {
    this.ensureLocalUserInDirectory();
    return [...this.commutersDirectory];
  }

  private compactOutboxForNewWrite(type: PendingWrite['type'], payload: any): boolean {
    // Coalesce singleton profile / anchor updates so older unsent snapshots don't pile up
    if (type === 'profile_update' || type === 'private_profile_update' || type === 'location_anchor') {
      this.outbox = this.outbox.filter((w) => !(w.type === type && w.status !== 'syncing'));
    }

    // If deleting an item that only ever existed offline in the outbox, cancel both create + delete
    const deleteToCreateMap: Partial<Record<PendingWrite['type'], PendingWrite['type']>> = {
      fare_delete: 'fare_report',
      status_delete: 'status_report',
      intercity_delete: 'intercity_report',
      transporter_delete: 'transporter_register',
      social_interaction_delete: 'social_interaction',
      social_reply_delete: 'social_reply',
      social_reaction_delete: 'social_reaction_record',
    };
    const matchingCreateType = deleteToCreateMap[type];
    if (matchingCreateType && payload?.id) {
      const unsentCreate = this.outbox.find(
        (w) => w.type === matchingCreateType && w.status === 'pending' && w.payload?.id === payload.id
      );
      if (unsentCreate) {
        this.outbox = this.outbox.filter(
          (w) =>
            !(
              w.payload?.id === payload.id &&
              (w.type === matchingCreateType ||
                w.type === 'transporter_update' ||
                w.type === 'social_interaction_edit' ||
                w.type === 'social_reply_edit')
            )
        );
        return false; // Nothing to enqueue; offline item never reached cloud
      }
    }

    if (type === 'social_reaction_record' && payload?.id) {
      this.outbox = this.outbox.filter(
        (w) =>
          !(
            (w.type === 'social_reaction_record' || w.type === 'social_reaction_delete') &&
            w.status !== 'syncing' &&
            w.payload?.id === payload.id
          )
      );
    }

    return true;
  }

  private enqueueWrite(type: PendingWrite['type'], payload: any, triggerSync = true): void {
    const shouldEnqueue = this.compactOutboxForNewWrite(type, payload);
    if (shouldEnqueue) {
      const pendingWrite: PendingWrite = {
        id: `outbox-${type}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        type,
        payload,
        created_at: Date.now(),
        retry_count: 0,
        status: 'pending',
      };
      this.outbox = [pendingWrite, ...this.outbox];
    }
    safeSet(STORAGE_KEYS.OUTBOX_PENDING, this.outbox);
    if (sqliteDb.isReady()) {
      sqliteDb.replaceTable('outbox_pending', this.outbox);
    }
    this.notifyChange();
    if (triggerSync && this.isEffectivelyOnline()) {
      this.flushOutbox();
    }
  }

  private syncProfileToOutbox(triggerFlush = true): void {
    this.userProfile.updatedAt = Date.now();
    safeSet(STORAGE_KEYS.USER_PROFILE, this.userProfile);
    if (sqliteDb.isReady() && this.userProfile.phone !== undefined) {
      sqliteDb.upsertRecord('private_profile', this.deviceId, {
        device_id: this.deviceId,
        ownerUid: this.userProfile.ownerUid,
        phone: this.userProfile.phone,
        updatedAt: this.userProfile.updatedAt,
      });
    }
    this.ensureLocalUserInDirectory();
    this.enqueueWrite('profile_update', { ...this.userProfile }, triggerFlush);
  }

  public updateUserProfile(updates: Partial<UserProfile>): UserProfile {
    this.isExplicitlyLoggedOut = false;
    try {
      localStorage.removeItem(STORAGE_KEYS.EXPLICIT_LOGOUT);
    } catch {
      // Ignore storage error
    }
    let handle = updates.handle || this.userProfile.handle;
    if (updates.username && !updates.handle) {
      handle = '@' + updates.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    }
    if (updates.username && /^guest_[A-Za-z0-9]{3,16}$/.test(updates.username.trim())) {
      saveGuestUsername(updates.username.trim());
    }
    this.userProfile = {
      ...this.userProfile,
      ...updates,
      device_id: this.deviceId,
      userId: this.userProfile.userId || this.userProfile.ownerUid || `usr-${this.deviceId}`,
      commuterBadge: updates.commuterBadge || this.userProfile.commuterBadge || 'Daily Commuter',
      avatarColor: updates.avatarColor || this.userProfile.avatarColor || '#F27D26',
      createdAt: this.userProfile.createdAt || Date.now(),
      handle,
      updatedAt: Date.now(),
    };
    safeSet(STORAGE_KEYS.USER_PROFILE, this.userProfile);
    if (sqliteDb.isReady() && updates.phone !== undefined) {
      sqliteDb.upsertRecord('private_profile', this.deviceId, {
        device_id: this.deviceId,
        ownerUid: this.userProfile.ownerUid,
        phone: this.userProfile.phone || '',
        updatedAt: this.userProfile.updatedAt,
      });
    }
    if (updates.username && this.isEffectivelyOnline()) {
      syncFirebaseDisplayName(this.userProfile.username);
    }
    this.ensureLocalUserInDirectory();
    this.enqueueWrite('profile_update', { ...this.userProfile }, true);
    this.notifyChange();
    return { ...this.userProfile };
  }

  public async activateGuestAccount(regenerate = false): Promise<{
    success: boolean;
    guestName: string;
    error?: string;
    operationNotAllowed?: boolean;
  }> {
    this.isExplicitlyLoggedOut = false;
    try {
      localStorage.removeItem(STORAGE_KEYS.EXPLICIT_LOGOUT);
    } catch {
      // Ignore storage error
    }

    const currentName = this.userProfile.username;
    const guestName = regenerate
      ? generateGuestUsername()
      : /^guest_[A-Za-z0-9]{3,16}$/.test(currentName)
      ? currentName
      : getOrCreateGuestUsername();

    saveGuestUsername(guestName);

    const shouldUseGuestName =
      regenerate || !currentName || currentName.startsWith('Commuter_') || currentName === 'Commuter';
    const targetUsername = shouldUseGuestName ? guestName : currentName;
    const targetHandle = shouldUseGuestName
      ? `@${guestName.toLowerCase()}`
      : this.userProfile.handle || `@${targetUsername.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;

    this.userProfile = {
      ...this.userProfile,
      device_id: this.deviceId,
      userId: this.userProfile.ownerUid || this.userProfile.userId || `usr-${this.deviceId}`,
      username: targetUsername,
      handle: targetHandle,
      commuterBadge: this.userProfile.commuterBadge || 'Daily Commuter',
      avatarColor: this.userProfile.avatarColor || '#F27D26',
      reputation_score: this.userProfile.reputation_score || 100,
      createdAt: this.userProfile.createdAt || Date.now(),
      isGuest: auth.currentUser ? auth.currentUser.isAnonymous : true,
      authProvider: auth.currentUser && !auth.currentUser.isAnonymous ? 'google' : 'anonymous',
      updatedAt: Date.now(),
    };
    safeSet(STORAGE_KEYS.USER_PROFILE, this.userProfile);
    this.ensureLocalUserInDirectory();
    this.enqueueWrite('profile_update', { ...this.userProfile }, false);
    this.notifyChange();

    if (!this.isEffectivelyOnline()) {
      return {
        success: false,
        guestName: targetUsername,
        error: `Guest ID ${targetUsername} saved offline in SQLite. It will auto-sync when internet connects.`,
      };
    }

    const res = await continueAsGuest(targetUsername);
    if (res.user) {
      await syncFirebaseDisplayName(targetUsername);
      const syncRes = await this.globalSyncNow({ force: true, reconcileLocal: true });
      this.notifyChange();
      return {
        success: !syncRes.error,
        guestName: targetUsername,
        error: syncRes.error,
      };
    }

    this.notifyChange();
    return {
      success: false,
      guestName: targetUsername,
      error: res.error,
      operationNotAllowed: res.operationNotAllowed,
    };
  }

  public async logoutAndClearPersonalData(): Promise<void> {
    const oldUid = auth.currentUser?.uid || this.currentAuthUid || this.userProfile.ownerUid;
    const oldDeviceId = this.deviceId;

    // 1. Delete personal cloud profile, private phone PII & anchor while keeping all global contributions intact
    try {
      await deletePersonalCloudProfile(oldDeviceId);
    } catch {
      // Proceed with local cleanup even if offline
    }

    // 2. Sign out of Firebase Auth (works for both Google & Anonymous accounts)
    await signOutCloud();

    // 3. Mark explicit logout so auto-auth doesn't immediately sign back in behind the user's back
    this.isExplicitlyLoggedOut = true;
    safeSet(STORAGE_KEYS.EXPLICIT_LOGOUT, true);
    this.currentAuthUid = null;

    // 4. Remove all personal profile storage, notifications, private location & device identity association
    try {
      localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
      localStorage.removeItem(STORAGE_KEYS.USER_LOCATION);
      localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
      localStorage.removeItem(STORAGE_KEYS.OUTBOX_PENDING);
      localStorage.removeItem(STORAGE_KEYS.LAST_REPORTS_BY_ROUTE);
      localStorage.removeItem(STORAGE_KEYS.DEVICE_ID);
    } catch {
      // Ignore storage error
    }
    clearSavedGuestUsername();

    // Rotate device ID so prior device submissions no longer appear in My Submissions
    this.deviceId = getOrCreateDeviceId();

    this.notifications = [];
    this.outbox = [];
    this.userLocation = DEFAULT_USER_LOCATION;

    // Remove the logged-out user's personal entry from local commuters directory & location anchors
    this.commutersDirectory = this.commutersDirectory.filter(
      (c) => c.device_id !== oldDeviceId && (!oldUid || c.ownerUid !== oldUid)
    );
    safeSet(STORAGE_KEYS.COMMUTERS_DIRECTORY, this.commutersDirectory);

    this.locationAnchors = this.locationAnchors.filter(
      (a) => a.deviceId !== oldDeviceId && (!oldUid || a.ownerUid !== oldUid)
    );
    safeSet(STORAGE_KEYS.LOCATION_ANCHORS, this.locationAnchors);

    // Clear personal tables in SQLite while keeping global contributions/interactions tables intact
    if (sqliteDb.isReady()) {
      sqliteDb.clearTable('private_profile');
      sqliteDb.clearTable('notifications');
      sqliteDb.clearTable('outbox_pending');
      sqliteDb.replaceTable('commuters', this.commutersDirectory);
      sqliteDb.replaceTable('location_anchors', this.locationAnchors);
    }

    // Reset in-memory personal profile to empty logged-out state
    this.userProfile = {
      device_id: this.deviceId,
      userId: '',
      username: '',
      handle: '',
      name: undefined,
      phone: undefined,
      ownerUid: undefined,
      avatarColor: '#141414',
      commuterBadge: '',
      role: 'commuter',
      isGuest: false,
      authProvider: undefined,
      reputation_score: 0,
      reports_count: 0,
      createdAt: 0,
      updatedAt: 0,
    };

    // Re-attach public global read listeners so global view stays live
    this.detachCloudListeners();
    if (this.isEffectivelyOnline()) {
      this.attachCloudListeners();
    }

    this.notifyChange();
  }

  public updatePhone(phone: string): void {
    this.userProfile.phone = phone;
    this.userProfile.reputation_score += 15;
    this.userProfile.updatedAt = Date.now();
    safeSet(STORAGE_KEYS.USER_PROFILE, this.userProfile);
    if (sqliteDb.isReady()) {
      sqliteDb.upsertRecord('private_profile', this.deviceId, {
        device_id: this.deviceId,
        ownerUid: this.userProfile.ownerUid,
        phone,
        updatedAt: this.userProfile.updatedAt,
      });
    }
    this.ensureLocalUserInDirectory();
    this.enqueueWrite('private_profile_update', {
      device_id: this.deviceId,
      phone,
      updatedAt: this.userProfile.updatedAt,
    }, true);
    this.notifyChange();
  }

  // --- MENTION EXTRACTION & NOTIFICATIONS ---
  private extractMentions(text: string): {
    mentionedHandles: string[];
    mentionedDeviceIds: string[];
    matchedCommuters: UserProfile[];
  } {
    const matches = text.match(/@[a-zA-Z0-9_]+/g) || [];
    const mentionedHandles = Array.from(new Set(matches.map((m) => m.toLowerCase())));
    const matchedCommuters: UserProfile[] = [];
    const mentionedDeviceIds = new Set<string>();

    for (const h of mentionedHandles) {
      const found = this.commutersDirectory.find(
        (c) =>
          (c.handle || '').toLowerCase() === h ||
          '@' + (c.username || '').trim().toLowerCase().replace(/\s+/g, '_') === h
      );
      if (found) {
        matchedCommuters.push(found);
        mentionedDeviceIds.add(found.device_id);
      }
    }

    return {
      mentionedHandles,
      mentionedDeviceIds: Array.from(mentionedDeviceIds),
      matchedCommuters,
    };
  }

  private createNotification(params: {
    type: NotificationType;
    recipientDeviceId: string;
    recipientUid?: string;
    targetType: string;
    targetId: string;
    postId?: string;
    snippet: string;
    allowSelf?: boolean;
  }): void {
    if (!params.recipientDeviceId) return;
    if (!params.allowSelf && params.recipientDeviceId === this.deviceId) return;

    const recipientProfile = this.commutersDirectory.find(
      (c) => c.device_id === params.recipientDeviceId
    );
    const resolvedRecipientUid = params.recipientUid || recipientProfile?.ownerUid;
    const senderUid = this.currentAuthUid || auth.currentUser?.uid || this.userProfile.ownerUid;

    const notif: CommuterNotification = {
      id: `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      type: params.type,
      recipientDeviceId: params.recipientDeviceId,
      recipientUid: resolvedRecipientUid,
      senderDeviceId: this.deviceId,
      senderUid,
      senderUsername: this.getUsername(),
      senderHandle: this.getUserHandle(),
      targetType: params.targetType,
      targetId: params.targetId,
      postId: params.postId,
      snippet: params.snippet.slice(0, 180),
      read: false,
      createdAt: Date.now(),
    };

    this.notifications = [notif, ...this.notifications];
    safeSet(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
    if (sqliteDb.isReady()) {
      sqliteDb.upsertRecord('notifications', notif.id, notif, notif.createdAt);
    }
    this.enqueueWrite('notification_create', notif, false);
  }

  public getNotifications(): CommuterNotification[] {
    const uid = this.currentAuthUid || auth.currentUser?.uid;
    return this.notifications
      .filter((n) => n.recipientDeviceId === this.deviceId || (uid && n.recipientUid === uid))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  public getUnreadNotificationsCount(): number {
    return this.getNotifications().filter((n) => !n.read).length;
  }

  public markNotificationRead(notifId: string): void {
    const n = this.notifications.find((item) => item.id === notifId);
    if (!n || n.read) return;
    n.read = true;
    safeSet(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
    if (sqliteDb.isReady()) {
      sqliteDb.upsertRecord('notifications', n.id, n, Date.now());
    }
    this.enqueueWrite('notification_update', { id: n.id, read: true }, true);
    this.notifyChange();
  }

  public markAllNotificationsRead(): void {
    const mine = this.getNotifications().filter((n) => !n.read);
    if (mine.length === 0) return;
    const mineIds = new Set(mine.map((m) => m.id));
    this.notifications.forEach((n) => {
      if (mineIds.has(n.id)) {
        n.read = true;
        if (sqliteDb.isReady()) sqliteDb.upsertRecord('notifications', n.id, n, Date.now());
        this.enqueueWrite('notification_update', { id: n.id, read: true }, false);
      }
    });
    safeSet(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
    this.notifyChange();
    this.flushOutbox();
  }

  // --- LOCATION ANCHORS ---
  public getUserLocation(): UserLocation {
    return { ...this.userLocation };
  }

  public getNearestRankToUser(loc: UserLocation = this.userLocation): Rank | undefined {
    if (this.ranks.length === 0) return undefined;
    let closest = this.ranks[0];
    let minDist = calculateDistanceKm(loc.lat, loc.lng, closest.lat, closest.lng);
    for (let i = 1; i < this.ranks.length; i++) {
      const r = this.ranks[i];
      const d = calculateDistanceKm(loc.lat, loc.lng, r.lat, r.lng);
      if (d < minDist) {
        minDist = d;
        closest = r;
      }
    }
    return closest;
  }

  public setUserLocation(loc: UserLocation): void {
    this.userLocation = { ...loc, timestamp: Date.now() };
    safeSet(STORAGE_KEYS.USER_LOCATION, this.userLocation);

    const nearest = this.getNearestRankToUser(this.userLocation);
    const uid = this.currentAuthUid || auth.currentUser?.uid || this.userProfile.ownerUid;
    const anchor: LocationAnchor = {
      deviceId: this.deviceId,
      ownerUid: uid,
      username: this.getUsername(),
      lat: this.userLocation.lat,
      lng: this.userLocation.lng,
      name: this.userLocation.name,
      source: this.userLocation.source,
      accuracyMeters: this.userLocation.accuracyMeters,
      nearestRankId: nearest?.id,
      nearestRankName: nearest?.name,
      timestamp: this.userLocation.timestamp,
    };

    const idx = this.locationAnchors.findIndex((a) => a.deviceId === this.deviceId);
    if (idx >= 0) this.locationAnchors[idx] = anchor;
    else this.locationAnchors = [anchor, ...this.locationAnchors];
    safeSet(STORAGE_KEYS.LOCATION_ANCHORS, this.locationAnchors);
    if (sqliteDb.isReady()) sqliteDb.upsertRecord('location_anchors', anchor.deviceId, anchor, anchor.timestamp);

    this.enqueueWrite('location_anchor', anchor, true);
    this.notifyChange();
  }

  public getLocationAnchors(): LocationAnchor[] {
    return [...this.locationAnchors];
  }

  // --- ONE-TAP "I BOARDED HERE" ---
  public confirmBoardingAtRank(rankId?: string): {
    success: boolean;
    confirmation?: BoardingConfirmation;
    rank?: Rank;
    alreadyBoarded?: boolean;
  } {
    const rank = rankId ? this.getRankById(rankId) : this.getNearestRankToUser(this.userLocation);
    if (!rank) return { success: false };

    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentSame = this.boardingConfirmations.find(
      (b) => b.rankId === rank.id && b.deviceId === this.deviceId && b.createdAt > oneHourAgo
    );
    if (recentSame) {
      return { success: true, confirmation: recentSame, rank, alreadyBoarded: true };
    }

    const uid = this.currentAuthUid || auth.currentUser?.uid || this.userProfile.ownerUid;
    const confirmation: BoardingConfirmation = {
      id: `brd-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      rankId: rank.id,
      rankName: rank.name,
      city: rank.city,
      deviceId: this.deviceId,
      ownerUid: uid,
      username: this.getUsername(),
      userHandle: this.getUserHandle(),
      statement: 'I boarded here',
      lat: this.userLocation.lat,
      lng: this.userLocation.lng,
      locationSource: this.userLocation.source,
      createdAt: Date.now(),
    };

    this.boardingConfirmations = [confirmation, ...this.boardingConfirmations];
    safeSet(STORAGE_KEYS.BOARDING_CONFIRMATIONS, this.boardingConfirmations);
    if (sqliteDb.isReady()) {
      sqliteDb.upsertRecord('boarding_confirmations', confirmation.id, confirmation, confirmation.createdAt);
    }

    this.userProfile.reports_count += 1;
    this.userProfile.reputation_score += 5;
    this.syncProfileToOutbox(false);

    this.enqueueWrite('boarding_confirmation', confirmation, true);
    this.notifyChange();
    return { success: true, confirmation, rank, alreadyBoarded: false };
  }

  public getBoardingConfirmationsForRank(rankId: string): BoardingConfirmation[] {
    return this.boardingConfirmations
      .filter((b) => b.rankId === rankId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  public getBoardingCountForRank(rankId: string): number {
    const uniqueDevices = new Set<string>();
    for (const b of this.boardingConfirmations) {
      if (b.rankId === rankId) {
        uniqueDevices.add(b.deviceId);
      }
    }
    return uniqueDevices.size;
  }

  public getBoardingStatementForRank(rankId: string): string {
    const count = this.getBoardingCountForRank(rankId);
    if (count === 0) return '0 commuters boarded here yet';
    if (count === 1) return '1 commuter boarded here';
    return `${count} commuters boarded here`;
  }

  public hasUserBoardedRankRecently(rankId: string): boolean {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return this.boardingConfirmations.some(
      (b) => b.rankId === rankId && b.deviceId === this.deviceId && b.createdAt > oneHourAgo
    );
  }

  public getMyBoardingConfirmations(): BoardingConfirmation[] {
    if (this.isExplicitlyLoggedOut) return [];
    return this.boardingConfirmations
      .filter((b) => b.deviceId === this.deviceId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  // --- RATING HELPER FOR TERMINI / TRANSPORTERS / COMMUTERS ---
  public getRatingSummaryForTarget(targetType: SocialTargetType, targetId: string): { avg: number; count: number } {
    const rated = this.socialInteractions.filter(
      (s) => s.targetType === targetType && s.targetId === targetId && typeof s.rating === 'number'
    );
    if (rated.length === 0) return { avg: 0, count: 0 };
    const total = rated.reduce((sum, s) => sum + (s.rating || 0), 0);
    return { avg: Number((total / rated.length).toFixed(1)), count: rated.length };
  }

  // --- CONNECTIVITY ---
  public isEffectivelyOnline(): boolean {
    if (this.simulatedOffline) return false;
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  }

  public isOfflineSimulated(): boolean {
    return this.simulatedOffline;
  }

  public setOfflineSimulation(val: boolean): void {
    this.simulatedOffline = val;
    safeSet(STORAGE_KEYS.OFFLINE_SIMULATION, val);
    this.notifyChange();
    if (!val) {
      this.onNetworkReconnected();
    } else {
      this.cloudConnected = false;
      this.detachCloudListeners();
      this.notifyChange();
    }
  }

  public getPendingWritesCount(): number {
    return this.outbox.filter((w) => w.status === 'pending' || w.status === 'syncing' || w.status === 'failed').length;
  }

  public getOutboxItems(): PendingWrite[] {
    return [...this.outbox];
  }

  // --- ROUTES & RANKS ---
  public getRoutes(): RouteItem[] {
    return [...this.routes];
  }

  public getRanks(): Rank[] {
    return [...this.ranks];
  }

  public getRouteById(id: string): RouteItem | undefined {
    return this.routes.find((r) => r.id === id);
  }

  public getRankById(id: string): Rank | undefined {
    return this.ranks.find((r) => r.id === id);
  }

  public getCities(): ZimbabweCity[] {
    return ZIMBABWE_CITIES;
  }

  public getRoutesByCity(city: string): RouteItem[] {
    if (!city || city === 'All Cities') return [...this.routes];
    return this.routes.filter((r) => (r.city || '').toLowerCase() === city.toLowerCase());
  }

  public getRanksByCity(city: string): Rank[] {
    if (!city || city === 'All Cities') return [...this.ranks];
    return this.ranks.filter((rnk) => (rnk.city || '').toLowerCase() === city.toLowerCase());
  }

  public getRoutesByCategory(category: RouteCategory): RouteItem[] {
    return this.routes.filter((r) => r.category === category);
  }

  // --- INTERCITY ---
  public getBusOperators(): BusOperator[] {
    return [...this.busOperators];
  }

  public getBusOperatorById(id: string): BusOperator | undefined {
    return this.busOperators.find((op) => op.id === id);
  }

  public getIntercityRoutes(): IntercityRoute[] {
    return [...this.intercityRoutes];
  }

  public getIntercityRouteById(id: string): IntercityRoute | undefined {
    return this.intercityRoutes.find((r) => r.id === id);
  }

  private hydrateIntercityVote(rep: IntercityReport): IntercityReport {
    const summary = this.computeReactionSummary('intercity', rep.id, rep.upvotes || 0, rep.downvotes || 0);
    return {
      ...rep,
      upvotes: summary.upOrLikeCount,
      downvotes: summary.downOrDislikeCount,
      userVote: summary.myReaction === 'up' || summary.myReaction === 'down' ? summary.myReaction : rep.userVote,
    };
  }

  public getIntercityReports(routeId?: string): IntercityReport[] {
    const base = routeId
      ? this.intercityReports.filter((r) => r.routeId === routeId)
      : [...this.intercityReports];
    return base.map((r) => this.hydrateIntercityVote(r)).sort((a, b) => b.reportedAt - a.reportedAt);
  }

  public addIntercityReport(data: {
    routeId: string;
    operatorId: string;
    operatorName: string;
    farePaidUSD: number;
    farePaidZiG?: number;
    farePaidZAR?: number;
    departureTime?: string;
    departureTerminal: string;
    seatAvailability: 'plenty' | 'filling_fast' | 'full';
    busConditionRating: number;
    roadStatusNote?: string;
  }): IntercityReport {
    const now = Date.now();
    const uid = this.currentAuthUid || auth.currentUser?.uid || this.userProfile.ownerUid;
    const newReport: IntercityReport = {
      id: 'rep-ic-' + now.toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      routeId: data.routeId,
      operatorId: data.operatorId,
      operatorName: data.operatorName,
      farePaidUSD: data.farePaidUSD,
      farePaidZiG: data.farePaidZiG,
      farePaidZAR: data.farePaidZAR,
      departureTime: data.departureTime,
      departureTerminal: data.departureTerminal,
      seatAvailability: data.seatAvailability,
      busConditionRating: data.busConditionRating,
      roadStatusNote: data.roadStatusNote,
      reportedAt: now,
      reporterDeviceId: this.deviceId,
      ownerUid: uid,
      reporterUsername: this.getUsername(),
      upvotes: 0,
      downvotes: 0,
    };

    this.intercityReports = [newReport, ...this.intercityReports];
    safeSet(STORAGE_KEYS.INTERCITY_REPORTS, this.intercityReports);
    if (sqliteDb.isReady()) {
      sqliteDb.upsertRecord('intercity_reports', newReport.id, newReport, now);
    }

    // Create owner's own reaction record without premature flush race
    this.toggleReactionRecord('intercity', newReport.id, 'up', false);

    this.userProfile.reports_count += 1;
    this.userProfile.reputation_score += 15;
    this.syncProfileToOutbox(false);

    this.enqueueWrite('intercity_report', newReport, true);
    return this.hydrateIntercityVote(newReport);
  }

  public voteIntercityReport(reportId: string, direction: 'up' | 'down'): void {
    const rep = this.intercityReports.find((r) => r.id === reportId);
    if (!rep) return;
    this.toggleReactionRecord('intercity', reportId, direction);
  }

  public deleteIntercityReport(reportId: string): boolean {
    const rep = this.intercityReports.find((r) => r.id === reportId);
    if (!rep || !this.isOwnerOf(rep.ownerUid, rep.reporterDeviceId)) return false;
    this.intercityReports = this.intercityReports.filter((r) => r.id !== reportId);
    safeSet(STORAGE_KEYS.INTERCITY_REPORTS, this.intercityReports);
    if (sqliteDb.isReady()) sqliteDb.deleteRecord('intercity_reports', reportId);
    this.enqueueWrite('intercity_delete', { id: reportId }, true);
    this.notifyChange();
    return true;
  }

  // --- TRANSPORTERS ---
  private hydrateTransporterLikes(t: TransporterProfile): TransporterProfile {
    const summary = this.computeReactionSummary('transporter', t.id, t.likes || 0, 0);
    return {
      ...t,
      likes: summary.upOrLikeCount,
      userLiked: summary.myReaction === 'like' || summary.myReaction === 'up',
    };
  }

  public getTransporters(city?: string, type?: string): TransporterProfile[] {
    let list = [...this.transporters];
    if (city && city !== 'All Cities') {
      list = list.filter((t) => (t.city || '').toLowerCase() === city.toLowerCase());
    }
    if (type && type !== 'all') {
      list = list.filter((t) => t.transportType === type);
    }
    return list.map((t) => this.hydrateTransporterLikes(t)).sort((a, b) => b.lastRouteUpdate - a.lastRouteUpdate);
  }

  public getTransporterById(id: string): TransporterProfile | undefined {
    const found = this.transporters.find((t) => t.id === id);
    return found ? this.hydrateTransporterLikes(found) : undefined;
  }

  public getTransportersForRoute(routeId: string, routeName?: string): TransporterProfile[] {
    const rName = (routeName || '').toLowerCase();
    return this.transporters
      .filter((t) => {
        if (t.currentRouteId && t.currentRouteId === routeId) return true;
        if (rName && t.currentRouteName && t.currentRouteName.toLowerCase().includes(rName)) return true;
        return false;
      })
      .map((t) => this.hydrateTransporterLikes(t));
  }

  public registerTransporter(data: {
    operatorName: string;
    contactPhone: string;
    transportType: TransporterVehicleType;
    transportTypeLabel: string;
    currentRouteName: string;
    currentRouteId?: string;
    city: string;
    vehiclePlate?: string;
    baseTerminus?: string;
    statusNote?: string;
  }): TransporterProfile {
    const now = Date.now();
    const uid = this.currentAuthUid || auth.currentUser?.uid || this.userProfile.ownerUid;
    const newTransporter: TransporterProfile = {
      id: 'trans-' + now.toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      operatorName: data.operatorName.trim(),
      contactPhone: data.contactPhone.trim(),
      transportType: data.transportType,
      transportTypeLabel: data.transportTypeLabel,
      currentRouteName: data.currentRouteName.trim(),
      currentRouteId: data.currentRouteId,
      city: data.city,
      vehiclePlate: data.vehiclePlate ? data.vehiclePlate.trim().toUpperCase() : undefined,
      baseTerminus: data.baseTerminus ? data.baseTerminus.trim() : undefined,
      status: 'active',
      statusNote: data.statusNote ? data.statusNote.trim() : undefined,
      registeredAt: now,
      lastRouteUpdate: now,
      registeredByDeviceId: this.deviceId,
      ownerUid: uid,
      username: this.getUsername(),
      userHandle: this.getUserHandle(),
      likes: 0,
    };

    this.transporters = [newTransporter, ...this.transporters];
    safeSet(STORAGE_KEYS.TRANSPORTERS, this.transporters);
    if (sqliteDb.isReady()) {
      sqliteDb.upsertRecord('transporters', newTransporter.id, newTransporter, now);
    }

    this.toggleReactionRecord('transporter', newTransporter.id, 'like', false);

    this.userProfile.role = 'transporter';
    this.userProfile.commuterBadge = 'Registered Transporter';
    this.userProfile.reports_count += 1;
    this.userProfile.reputation_score += 20;
    this.syncProfileToOutbox(false);

    this.enqueueWrite('transporter_register', newTransporter, true);
    return this.hydrateTransporterLikes(newTransporter);
  }

  public updateTransporterRoute(
    transporterId: string,
    updates: {
      currentRouteName: string;
      currentRouteId?: string;
      city?: string;
      baseTerminus?: string;
      status?: TransporterProfile['status'];
      statusNote?: string;
      contactPhone?: string;
    }
  ): boolean {
    const item = this.transporters.find((t) => t.id === transporterId);
    if (!item || !this.isOwnerOf(item.ownerUid, item.registeredByDeviceId)) return false;

    item.currentRouteName = updates.currentRouteName.trim();
    if (updates.currentRouteId !== undefined) item.currentRouteId = updates.currentRouteId;
    if (updates.city) item.city = updates.city;
    if (updates.baseTerminus !== undefined) item.baseTerminus = updates.baseTerminus;
    if (updates.status) item.status = updates.status;
    if (updates.statusNote !== undefined) item.statusNote = updates.statusNote;
    if (updates.contactPhone) item.contactPhone = updates.contactPhone.trim();
    item.lastRouteUpdate = Date.now();

    safeSet(STORAGE_KEYS.TRANSPORTERS, this.transporters);
    if (sqliteDb.isReady()) {
      sqliteDb.upsertRecord('transporters', item.id, item, item.lastRouteUpdate);
    }

    this.enqueueWrite(
      'transporter_update',
      {
        id: item.id,
        updates: {
          currentRouteName: item.currentRouteName,
          currentRouteId: item.currentRouteId,
          city: item.city,
          baseTerminus: item.baseTerminus,
          status: item.status,
          statusNote: item.statusNote,
          contactPhone: item.contactPhone,
          lastRouteUpdate: item.lastRouteUpdate,
        },
      },
      true
    );
    this.notifyChange();
    return true;
  }

  public deleteTransporter(transporterId: string): boolean {
    const item = this.transporters.find((t) => t.id === transporterId);
    if (!item || !this.isOwnerOf(item.ownerUid, item.registeredByDeviceId)) return false;
    this.transporters = this.transporters.filter((t) => t.id !== transporterId);
    safeSet(STORAGE_KEYS.TRANSPORTERS, this.transporters);
    if (sqliteDb.isReady()) sqliteDb.deleteRecord('transporters', transporterId);
    this.enqueueWrite('transporter_delete', { id: transporterId }, true);
    this.notifyChange();
    return true;
  }

  public toggleLikeTransporter(transporterId: string): void {
    const item = this.transporters.find((t) => t.id === transporterId);
    if (!item) return;
    this.toggleReactionRecord('transporter', transporterId, 'like');
  }

  // --- SOCIAL INTERACTIONS, THREADS & RATINGS ---
  private hydrateSocialReactions(item: CommuterSocialInteraction): CommuterSocialInteraction {
    const summary = this.computeReactionSummary('social', item.id, item.likes || 0, item.dislikes || 0);
    return {
      ...item,
      likes: summary.upOrLikeCount,
      dislikes: summary.downOrDislikeCount,
      userReaction:
        summary.myReaction === 'like' || summary.myReaction === 'dislike'
          ? summary.myReaction
          : item.userReaction,
    };
  }

  public getSocialInteractions(targetType?: string, targetId?: string): CommuterSocialInteraction[] {
    let list = [...this.socialInteractions];
    if (targetType) list = list.filter((s) => s.targetType === targetType);
    if (targetId) list = list.filter((s) => s.targetId === targetId);
    return list.map((s) => this.hydrateSocialReactions(s)).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getAllSocialInteractions(): CommuterSocialInteraction[] {
    return this.socialInteractions
      .map((s) => this.hydrateSocialReactions(s))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  public addSocialInteraction(data: {
    targetType: CommuterSocialInteraction['targetType'];
    targetId: string;
    targetName: string;
    postType?: SocialPostType;
    comment: string;
    rating?: number;
    confirmedFare?: { amount: number; currency: Currency };
    confirmedDepartureTime?: string;
    amenitiesReview?: AmenityFeedback;
    isAbuseReport?: boolean;
    abuseType?: AbuseCategory;
    abuseLocation?: string;
    abusePlateNumber?: string;
    recommendedLocation?: string;
    recommendedCommuterUsername?: string;
  }): CommuterSocialInteraction {
    const now = Date.now();
    const uid = this.currentAuthUid || auth.currentUser?.uid || this.userProfile.ownerUid;
    const trimmedComment = data.comment.trim();
    const { mentionedHandles, mentionedDeviceIds, matchedCommuters } = this.extractMentions(trimmedComment);

    const resolvedPostType: SocialPostType =
      data.postType || (data.isAbuseReport ? 'abuse' : trimmedComment.includes('?') ? 'question' : 'review');

    const newInteraction: CommuterSocialInteraction = {
      id: 'soc-' + now.toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      targetType: data.targetType,
      targetId: data.targetId,
      targetName: data.targetName,
      postType: resolvedPostType,
      username: this.getUsername(),
      userHandle: this.getUserHandle(),
      userBadge: this.getUserBadge(),
      avatarBg: this.userProfile.avatarColor || '#F27D26',
      comment: trimmedComment,
      rating: data.rating,
      likes: 0,
      dislikes: 0,
      createdAt: now,
      deviceId: this.deviceId,
      ownerUid: uid,
      mentionedHandles: mentionedHandles.length > 0 ? mentionedHandles : undefined,
      mentionedDeviceIds: mentionedDeviceIds.length > 0 ? mentionedDeviceIds : undefined,
      recommendedLocation: data.recommendedLocation,
      recommendedCommuterUsername: data.recommendedCommuterUsername,
      confirmedFare: data.confirmedFare,
      confirmedDepartureTime: data.confirmedDepartureTime,
      amenitiesReview: data.amenitiesReview,
      isAbuseReport: data.isAbuseReport,
      abuseType: data.abuseType,
      abuseLocation: data.abuseLocation,
      abusePlateNumber: data.abusePlateNumber,
    };

    this.socialInteractions = [newInteraction, ...this.socialInteractions];
    safeSet(STORAGE_KEYS.SOCIAL_INTERACTIONS, this.socialInteractions);
    if (sqliteDb.isReady()) {
      sqliteDb.upsertRecord('social_interactions', newInteraction.id, newInteraction, now);
    }

    this.toggleReactionRecord('social', newInteraction.id, 'like', false);

    this.userProfile.reputation_score += data.isAbuseReport ? 20 : 10;
    this.userProfile.reports_count += 1;
    this.syncProfileToOutbox(false);

    this.enqueueWrite('social_interaction', newInteraction, false);

    // Generate Notifications for @tags
    for (const targetUser of matchedCommuters) {
      this.createNotification({
        type: 'tag',
        recipientDeviceId: targetUser.device_id,
        recipientUid: targetUser.ownerUid,
        targetType: data.targetType,
        targetId: data.targetId,
        postId: newInteraction.id,
        snippet: `${this.getUsername()} tagged you in Commuter Buzz: "${trimmedComment.slice(0, 90)}"`,
      });
    }

    // Generate Notification when rating a Commuter/User
    if (data.targetType === 'commuter' && data.targetId) {
      this.createNotification({
        type: 'rating',
        recipientDeviceId: data.targetId,
        targetType: 'commuter',
        targetId: data.targetId,
        postId: newInteraction.id,
        snippet: `${this.getUsername()} rated you ${data.rating ? `${data.rating}★` : ''} and commented: "${trimmedComment.slice(0, 80)}"`,
      });
    }

    if (data.confirmedFare && data.targetType === 'route') {
      this.reportFare(
        data.targetId,
        data.confirmedFare.amount,
        data.confirmedFare.currency,
        'Social Commuter Confirmation',
        data.confirmedDepartureTime || 'Confirmed on route'
      );
    } else {
      this.flushOutbox();
    }

    return this.hydrateSocialReactions(newInteraction);
  }

  public updateSocialInteraction(
    interactionId: string,
    updates: { comment: string; rating?: number }
  ): boolean {
    const item = this.socialInteractions.find((s) => s.id === interactionId);
    if (!item || !this.isOwnerOf(item.ownerUid, item.deviceId)) return false;

    const trimmed = updates.comment.trim();
    if (!trimmed) return false;

    const { mentionedHandles, mentionedDeviceIds } = this.extractMentions(trimmed);
    item.comment = trimmed;
    if (updates.rating !== undefined) item.rating = updates.rating;
    item.mentionedHandles = mentionedHandles.length > 0 ? mentionedHandles : undefined;
    item.mentionedDeviceIds = mentionedDeviceIds.length > 0 ? mentionedDeviceIds : undefined;
    item.updatedAt = Date.now();

    safeSet(STORAGE_KEYS.SOCIAL_INTERACTIONS, this.socialInteractions);
    if (sqliteDb.isReady()) {
      sqliteDb.upsertRecord('social_interactions', item.id, item, item.updatedAt);
    }

    this.enqueueWrite(
      'social_interaction_edit',
      {
        id: item.id,
        updates: {
          comment: item.comment,
          rating: item.rating,
          mentionedHandles: item.mentionedHandles,
          mentionedDeviceIds: item.mentionedDeviceIds,
          updatedAt: item.updatedAt,
        },
      },
      true
    );
    this.notifyChange();
    return true;
  }

  public deleteSocialInteraction(interactionId: string): boolean {
    const item = this.socialInteractions.find((s) => s.id === interactionId);
    if (!item || !this.isOwnerOf(item.ownerUid, item.deviceId)) return false;

    this.socialInteractions = this.socialInteractions.filter((s) => s.id !== interactionId);
    safeSet(STORAGE_KEYS.SOCIAL_INTERACTIONS, this.socialInteractions);
    if (sqliteDb.isReady()) sqliteDb.deleteRecord('social_interactions', interactionId);

    this.enqueueWrite('social_interaction_delete', { id: interactionId }, true);
    this.notifyChange();
    return true;
  }

  public reactSocialInteraction(interactionId: string, reaction: 'like' | 'dislike'): void {
    const item = this.socialInteractions.find((s) => s.id === interactionId);
    if (!item) return;
    const { added } = this.toggleReactionRecord('social', interactionId, reaction);
    if (added && reaction === 'like' && item.deviceId && item.deviceId !== this.deviceId) {
      this.createNotification({
        type: 'like',
        recipientDeviceId: item.deviceId,
        recipientUid: item.ownerUid,
        targetType: item.targetType,
        targetId: item.targetId,
        postId: item.id,
        snippet: `${this.getUsername()} liked your post on ${item.targetName}: "${item.comment.slice(0, 70)}"`,
      });
      this.flushOutbox();
    }
  }

  // --- THREADED SOCIAL REPLIES ---
  public getRepliesForInteraction(interactionId: string): SocialReply[] {
    return this.socialReplies
      .filter((r) => r.interactionId === interactionId)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  public getRepliesCountForInteraction(interactionId: string): number {
    return this.socialReplies.filter((r) => r.interactionId === interactionId).length;
  }

  public addSocialReply(interactionId: string, comment: string): SocialReply | null {
    const parent = this.socialInteractions.find((s) => s.id === interactionId);
    const trimmed = comment.trim();
    if (!parent || !trimmed) return null;

    const now = Date.now();
    const uid = this.currentAuthUid || auth.currentUser?.uid || this.userProfile.ownerUid;
    const { mentionedHandles, mentionedDeviceIds, matchedCommuters } = this.extractMentions(trimmed);

    const newReply: SocialReply = {
      id: 'rep-' + now.toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      interactionId,
      parentAuthorDeviceId: parent.deviceId,
      parentAuthorUsername: parent.username,
      deviceId: this.deviceId,
      ownerUid: uid,
      username: this.getUsername(),
      userHandle: this.getUserHandle(),
      userBadge: this.getUserBadge(),
      avatarBg: this.userProfile.avatarColor || '#F27D26',
      comment: trimmed,
      mentionedHandles: mentionedHandles.length > 0 ? mentionedHandles : undefined,
      mentionedDeviceIds: mentionedDeviceIds.length > 0 ? mentionedDeviceIds : undefined,
      createdAt: now,
    };

    this.socialReplies = [...this.socialReplies, newReply];
    safeSet(STORAGE_KEYS.SOCIAL_REPLIES, this.socialReplies);
    if (sqliteDb.isReady()) {
      sqliteDb.upsertRecord('social_replies', newReply.id, newReply, now);
    }

    this.userProfile.reputation_score += 5;
    this.syncProfileToOutbox(false);
    this.enqueueWrite('social_reply', newReply, false);

    // Notify parent post author
    if (parent.deviceId && parent.deviceId !== this.deviceId) {
      this.createNotification({
        type: 'reply',
        recipientDeviceId: parent.deviceId,
        recipientUid: parent.ownerUid,
        targetType: parent.targetType,
        targetId: parent.targetId,
        postId: parent.id,
        snippet: `${this.getUsername()} replied on ${parent.targetName}: "${trimmed.slice(0, 80)}"`,
      });
    }

    // Notify any @tagged commuters
    for (const targetUser of matchedCommuters) {
      if (targetUser.device_id !== parent.deviceId) {
        this.createNotification({
          type: 'tag',
          recipientDeviceId: targetUser.device_id,
          recipientUid: targetUser.ownerUid,
          targetType: parent.targetType,
          targetId: parent.targetId,
          postId: parent.id,
          snippet: `${this.getUsername()} tagged you in a reply: "${trimmed.slice(0, 80)}"`,
        });
      }
    }

    this.notifyChange();
    this.flushOutbox();
    return newReply;
  }

  public updateSocialReply(replyId: string, comment: string): boolean {
    const reply = this.socialReplies.find((r) => r.id === replyId);
    const trimmed = comment.trim();
    if (!reply || !trimmed || !this.isOwnerOf(reply.ownerUid, reply.deviceId)) return false;

    const { mentionedHandles, mentionedDeviceIds } = this.extractMentions(trimmed);
    reply.comment = trimmed;
    reply.mentionedHandles = mentionedHandles.length > 0 ? mentionedHandles : undefined;
    reply.mentionedDeviceIds = mentionedDeviceIds.length > 0 ? mentionedDeviceIds : undefined;
    reply.updatedAt = Date.now();

    safeSet(STORAGE_KEYS.SOCIAL_REPLIES, this.socialReplies);
    if (sqliteDb.isReady()) {
      sqliteDb.upsertRecord('social_replies', reply.id, reply, reply.updatedAt);
    }

    this.enqueueWrite(
      'social_reply_edit',
      {
        id: reply.id,
        updates: {
          comment: reply.comment,
          mentionedHandles: reply.mentionedHandles,
          mentionedDeviceIds: reply.mentionedDeviceIds,
          updatedAt: reply.updatedAt,
        },
      },
      true
    );
    this.notifyChange();
    return true;
  }

  public deleteSocialReply(replyId: string): boolean {
    const reply = this.socialReplies.find((r) => r.id === replyId);
    if (!reply || !this.isOwnerOf(reply.ownerUid, reply.deviceId)) return false;

    this.socialReplies = this.socialReplies.filter((r) => r.id !== replyId);
    safeSet(STORAGE_KEYS.SOCIAL_REPLIES, this.socialReplies);
    if (sqliteDb.isReady()) sqliteDb.deleteRecord('social_replies', replyId);

    this.enqueueWrite('social_reply_delete', { id: replyId }, true);
    this.notifyChange();
    return true;
  }

  // --- STATUS & FARES ---
  private hydrateFareVote(f: FareReport): FareReport {
    const summary = this.computeReactionSummary('fare', f.id, f.upvotes || 0, f.downvotes || 0);
    return {
      ...f,
      upvotes: summary.upOrLikeCount,
      downvotes: summary.downOrDislikeCount,
      userVote: summary.myReaction === 'up' || summary.myReaction === 'down' ? summary.myReaction : f.userVote,
    };
  }

  public getActiveStatusesForRoute(routeId: string): StatusReport[] {
    const now = Date.now();
    return this.statusReports
      .filter((s) => s.route_id === routeId && s.expires_at > now)
      .sort((a, b) => b.reported_at - a.reported_at);
  }

  public getFareReportsForRoute(routeId: string): FareReport[] {
    return this.fareReports
      .filter((f) => f.route_id === routeId)
      .map((f) => this.hydrateFareVote(f))
      .sort((a, b) => b.reported_at - a.reported_at);
  }

  public getRouteSummary(routeId: string): ActiveRouteSummary | null {
    const route = this.getRouteById(routeId);
    if (!route) return null;

    const activeStatuses = this.getActiveStatusesForRoute(routeId);
    const fares = this.getFareReportsForRoute(routeId);
    const latestFare = fares[0];
    const latestStatus = activeStatuses[0];

    const usdFares = fares.filter((f) => f.currency === 'USD').slice(0, 5);
    const avgUSD = usdFares.length > 0
      ? usdFares.reduce((sum, f) => sum + f.fare_amount, 0) / usdFares.length
      : undefined;

    const zwlFares = fares.filter((f) => f.currency === 'ZWL' || f.currency === 'ZWG').slice(0, 5);
    const avgZWL = zwlFares.length > 0
      ? zwlFares.reduce((sum, f) => sum + f.fare_amount, 0) / zwlFares.length
      : undefined;

    const zarFares = fares.filter((f) => f.currency === 'ZAR').slice(0, 5);
    const avgZAR = zarFares.length > 0
      ? zarFares.reduce((sum, f) => sum + f.fare_amount, 0) / zarFares.length
      : undefined;

    const bwpFares = fares.filter((f) => f.currency === 'BWP').slice(0, 5);
    const avgBWP = bwpFares.length > 0
      ? bwpFares.reduce((sum, f) => sum + f.fare_amount, 0) / bwpFares.length
      : undefined;

    let fareConfidence: 'high' | 'medium' | 'outdated' = 'high';
    let confidenceReason = 'Recently confirmed by commuters';

    if (!latestFare) {
      fareConfidence = 'outdated';
      confidenceReason = 'No recent fare reported yet';
    } else {
      const ageHours = (Date.now() - latestFare.reported_at) / (1000 * 60 * 60);
      const totalVotes = (latestFare.upvotes || 0) + (latestFare.downvotes || 0);
      const upRatio = totalVotes > 0 ? (latestFare.upvotes || 0) / totalVotes : 1;

      if (ageHours > 6) {
        fareConfidence = 'outdated';
        confidenceReason = `Reported ${Math.round(ageHours)}h ago — may be outdated`;
      } else if (ageHours > 2 || (totalVotes >= 3 && upRatio < 0.7)) {
        fareConfidence = 'medium';
        confidenceReason = `Reported ${Math.round(ageHours * 60)} min ago with moderate confirmations`;
      } else {
        fareConfidence = 'high';
        confidenceReason = `Active & verified by ${latestFare.upvotes} commuters`;
      }
    }

    return {
      route,
      latestFare,
      latestStatus,
      activeStatuses,
      fareConfidence,
      confidenceReason,
      averageFareUSD: avgUSD ? Number(avgUSD.toFixed(2)) : undefined,
      averageFareZWL: avgZWL ? Math.round(avgZWL) : undefined,
      averageFareZAR: avgZAR ? Number(avgZAR.toFixed(1)) : undefined,
      averageFareBWP: avgBWP ? Number(avgBWP.toFixed(1)) : undefined,
    };
  }

  public checkSpamLimit(routeId: string): { allowed: boolean; remainingSeconds: number } {
    const record = safeGet<Record<string, number>>(STORAGE_KEYS.LAST_REPORTS_BY_ROUTE, {});
    const lastTime = record[routeId];
    if (!lastTime) return { allowed: true, remainingSeconds: 0 };

    const elapsedMs = Date.now() - lastTime;
    const cooldownMs = 5 * 60 * 1000;
    if (elapsedMs < cooldownMs) {
      const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
      return { allowed: false, remainingSeconds };
    }
    return { allowed: true, remainingSeconds: 0 };
  }

  private markReportTime(routeId: string): void {
    const record = safeGet<Record<string, number>>(STORAGE_KEYS.LAST_REPORTS_BY_ROUTE, {});
    record[routeId] = Date.now();
    safeSet(STORAGE_KEYS.LAST_REPORTS_BY_ROUTE, record);
  }

  public addRouteWithFare(data: {
    name: string;
    origin: string;
    destination: string;
    city: string;
    category?: RouteCategory;
    distanceKm?: number;
    rankIds: string[];
    transportType: string;
    fareAmount: number;
    currency: Currency;
    departureStatus: string;
    statusType?: StatusType;
    note?: string;
  }): { route: RouteItem; fare: FareReport } {
    const now = Date.now();
    const uid = this.currentAuthUid || auth.currentUser?.uid || this.userProfile.ownerUid;
    const routeId = 'route-' + now.toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    const newRoute: RouteItem = {
      id: routeId,
      name: data.name.trim(),
      origin: data.origin.trim(),
      destination: data.destination.trim(),
      city: data.city,
      category: data.category || 'cbd_location',
      distanceKm: data.distanceKm,
      commonVehicle: data.transportType,
      ranksServedIds: data.rankIds.length > 0 ? data.rankIds : ['rank-copacabana'],
      waypoints: [
        { name: data.origin.trim(), lat: -17.83, lng: 31.05 },
        { name: data.destination.trim(), lat: -17.84, lng: 31.04 },
      ],
      createdByDeviceId: this.deviceId,
      createdByUsername: this.getUsername(),
      ownerUid: uid,
      createdAt: now,
    };

    this.routes = [newRoute, ...this.routes];
    safeSet(STORAGE_KEYS.ROUTES, this.routes);
    if (sqliteDb.isReady()) sqliteDb.upsertRecord('routes', newRoute.id, newRoute, now);

    const fareId = 'fare-' + now.toString(36) + '-' + Math.random().toString(36).substring(2, 6);
    const newFare: FareReport = {
      id: fareId,
      route_id: routeId,
      fare_amount: data.fareAmount,
      currency: data.currency,
      reported_at: now,
      reporter_device_id: this.deviceId,
      ownerUid: uid,
      reporter_username: this.getUsername(),
      reporter_badge: this.getUserBadge(),
      upvotes: 0,
      downvotes: 0,
      source: 'user',
      transport_type: data.transportType,
      departure_status: data.departureStatus,
      route_name: newRoute.name,
      city: newRoute.city,
    };

    this.fareReports = [newFare, ...this.fareReports];
    safeSet(STORAGE_KEYS.FARE_REPORTS, this.fareReports);
    if (sqliteDb.isReady()) sqliteDb.upsertRecord('fare_reports', newFare.id, newFare, now);
    this.markReportTime(routeId);
    this.toggleReactionRecord('fare', newFare.id, 'up', false);

    let newStatus: StatusReport | undefined;
    if (data.statusType) {
      const statusId = 'status-' + now.toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      newStatus = {
        id: statusId,
        route_id: routeId,
        type: data.statusType,
        note: data.note ? data.note.trim().slice(0, 100) : undefined,
        reported_at: now,
        expires_at: now + 90 * 60 * 1000,
        reporter_device_id: this.deviceId,
        ownerUid: uid,
        reporter_username: this.getUsername(),
        source: 'user',
      };
      this.statusReports = [newStatus, ...this.statusReports];
      safeSet(STORAGE_KEYS.STATUS_REPORTS, this.statusReports);
      if (sqliteDb.isReady()) sqliteDb.upsertRecord('status_reports', newStatus.id, newStatus, now);
    }

    this.userProfile.reports_count += 2;
    this.userProfile.reputation_score += 25;
    this.syncProfileToOutbox(false);

    this.enqueueWrite('add_route', { route: newRoute, fare: newFare, status: newStatus }, true);
    return { route: newRoute, fare: this.hydrateFareVote(newFare) };
  }

  public reportFare(
    routeId: string,
    amount: number,
    currency: Currency,
    transportType?: string,
    departureStatus?: string
  ): { success: boolean; error?: string } {
    const spamCheck = this.checkSpamLimit(routeId);
    if (!spamCheck.allowed) {
      return {
        success: false,
        error: `Spam protection: Please wait ${spamCheck.remainingSeconds}s before reporting this route again.`,
      };
    }

    const now = Date.now();
    const uid = this.currentAuthUid || auth.currentUser?.uid || this.userProfile.ownerUid;
    const route = this.getRouteById(routeId);
    const newReport: FareReport = {
      id: 'fare-' + now.toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      route_id: routeId,
      fare_amount: amount,
      currency,
      reported_at: now,
      reporter_device_id: this.deviceId,
      ownerUid: uid,
      reporter_username: this.getUsername(),
      reporter_badge: this.getUserBadge(),
      upvotes: 0,
      downvotes: 0,
      source: 'user',
      transport_type: transportType || route?.commonVehicle || 'Toyota HiAce Kombi',
      departure_status: departureStatus || 'Loading right now',
      route_name: route?.name,
      city: route?.city,
    };

    this.fareReports = [newReport, ...this.fareReports];
    safeSet(STORAGE_KEYS.FARE_REPORTS, this.fareReports);
    if (sqliteDb.isReady()) sqliteDb.upsertRecord('fare_reports', newReport.id, newReport, now);
    this.markReportTime(routeId);
    this.toggleReactionRecord('fare', newReport.id, 'up', false);

    this.userProfile.reports_count += 1;
    this.userProfile.reputation_score += 5;
    this.syncProfileToOutbox(false);

    this.enqueueWrite('fare_report', newReport, true);
    return { success: true };
  }

  public deleteFareReport(fareId: string): boolean {
    const fare = this.fareReports.find((f) => f.id === fareId);
    if (!fare || !this.isOwnerOf(fare.ownerUid, fare.reporter_device_id)) return false;
    this.fareReports = this.fareReports.filter((f) => f.id !== fareId);
    safeSet(STORAGE_KEYS.FARE_REPORTS, this.fareReports);
    if (sqliteDb.isReady()) sqliteDb.deleteRecord('fare_reports', fareId);
    this.enqueueWrite('fare_delete', { id: fareId }, true);
    this.notifyChange();
    return true;
  }

  public getAllFareReports(): FareReport[] {
    return this.fareReports
      .map((f) => {
        const route = this.getRouteById(f.route_id);
        return this.hydrateFareVote({
          ...f,
          route_name: f.route_name || route?.name || 'Commuter Route',
          city: f.city || route?.city || 'Harare',
          transport_type: f.transport_type || route?.commonVehicle || 'Toyota HiAce Kombi',
          departure_status: f.departure_status || 'In Transit / Loading',
        });
      })
      .sort((a, b) => b.reported_at - a.reported_at);
  }

  public getAllStatusReports(): (StatusReport & { route_name?: string; city?: string })[] {
    const now = Date.now();
    return this.statusReports
      .filter((s) => s.expires_at > now)
      .map((s) => {
        const route = this.getRouteById(s.route_id);
        return {
          ...s,
          route_name: route?.name || 'Local Route',
          city: route?.city || 'Harare',
        };
      })
      .sort((a, b) => b.reported_at - a.reported_at);
  }

  public reportStatus(routeId: string, type: StatusType, note?: string): { success: boolean; error?: string } {
    const spamCheck = this.checkSpamLimit(routeId);
    if (!spamCheck.allowed) {
      return {
        success: false,
        error: `Spam protection: Please wait ${spamCheck.remainingSeconds}s before submitting a status for this route again.`,
      };
    }

    const now = Date.now();
    const uid = this.currentAuthUid || auth.currentUser?.uid || this.userProfile.ownerUid;
    const newStatus: StatusReport = {
      id: 'status-' + now.toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      route_id: routeId,
      type,
      note: note ? note.trim().slice(0, 100) : undefined,
      reported_at: now,
      expires_at: now + 90 * 60 * 1000,
      reporter_device_id: this.deviceId,
      ownerUid: uid,
      reporter_username: this.getUsername(),
      source: 'user',
    };

    this.statusReports = [newStatus, ...this.statusReports];
    safeSet(STORAGE_KEYS.STATUS_REPORTS, this.statusReports);
    if (sqliteDb.isReady()) sqliteDb.upsertRecord('status_reports', newStatus.id, newStatus, now);
    this.markReportTime(routeId);

    this.userProfile.reports_count += 1;
    this.userProfile.reputation_score += 5;
    this.syncProfileToOutbox(false);

    this.enqueueWrite('status_report', newStatus, true);
    return { success: true };
  }

  public deleteStatusReport(statusId: string): boolean {
    const st = this.statusReports.find((s) => s.id === statusId);
    if (!st || !this.isOwnerOf(st.ownerUid, st.reporter_device_id)) return false;
    this.statusReports = this.statusReports.filter((s) => s.id !== statusId);
    safeSet(STORAGE_KEYS.STATUS_REPORTS, this.statusReports);
    if (sqliteDb.isReady()) sqliteDb.deleteRecord('status_reports', statusId);
    this.enqueueWrite('status_delete', { id: statusId }, true);
    this.notifyChange();
    return true;
  }

  public voteFare(fareId: string, voteType: 'up' | 'down'): void {
    const fare = this.fareReports.find((f) => f.id === fareId);
    if (!fare) return;
    this.toggleReactionRecord('fare', fareId, voteType);
  }

  private scheduleFastRetry(): void {
    if (this.fastRetryTimer || !this.isEffectivelyOnline()) return;
    const authStat = getCurrentAuthStatus();
    if (!authStat.uid && authStat.anonAuthBlocked) return;
    if (this.fastRetryAttempt >= 4) return;
    const delays = [1200, 3000, 6000, 12000];
    const delay = delays[Math.min(this.fastRetryAttempt, delays.length - 1)];
    this.fastRetryAttempt += 1;
    this.fastRetryTimer = setTimeout(() => {
      this.fastRetryTimer = null;
      if (this.isEffectivelyOnline() && this.getPendingWritesCount() > 0) {
        this.flushOutbox();
      }
    }, delay);
  }

  private persistOutboxClearedSynced(): void {
    this.outbox = this.outbox.filter((w) => w.status !== 'synced');
    safeSet(STORAGE_KEYS.OUTBOX_PENDING, this.outbox);
    if (sqliteDb.isReady()) sqliteDb.replaceTable('outbox_pending', this.outbox);
  }

  private reconcileUnsyncedLocalRecordsToOutbox(snapshot: CloudSnapshotData): number {
    const uid = auth.currentUser?.uid;
    if (!uid) return 0;

    let addedCount = 0;
    const queueIfMissing = (
      type: PendingWrite['type'],
      id: string | undefined,
      payload: any,
      cloudSet: Set<string>,
      deletedSet?: Set<string>
    ) => {
      if (!id || cloudSet.has(id) || deletedSet?.has(id)) return;
      const alreadyQueued = this.outbox.some(
        (w) => w.type === type && w.status !== 'synced' && (w.payload?.id === id || w.payload?.device_id === id || w.payload?.deviceId === id)
      );
      if (alreadyQueued) return;
      this.enqueueWrite(type, payload, false);
      addedCount += 1;
    };

    if (snapshot.authoritative.commuters) {
      const cloudCommuters = new Set(snapshot.commuters.map((c) => c.device_id));
      if (!cloudCommuters.has(this.deviceId) && !cloudCommuters.has(uid)) {
        queueIfMissing('profile_update', this.deviceId, { ...this.userProfile }, cloudCommuters);
      }
    }

    if (snapshot.authoritative.routes) {
      const cloudRoutes = new Set(snapshot.routes.map((r) => r.id));
      for (const r of this.routes) {
        if (r.createdByDeviceId === this.deviceId || (r.ownerUid && r.ownerUid === uid)) {
          queueIfMissing('add_route', r.id, { route: r }, cloudRoutes);
        }
      }
    }

    if (snapshot.authoritative.fareReports) {
      const cloudFares = new Set(snapshot.fareReports.map((f) => f.id));
      const delFares = this.getPendingDeletedIds('fare_delete');
      for (const f of this.fareReports) {
        if (this.isOwnerOf(f.ownerUid, f.reporter_device_id)) {
          queueIfMissing('fare_report', f.id, f, cloudFares, delFares);
        }
      }
    }

    if (snapshot.authoritative.statusReports) {
      const cloudStatuses = new Set(snapshot.statusReports.map((s) => s.id));
      const delStatuses = this.getPendingDeletedIds('status_delete');
      for (const s of this.statusReports) {
        if (this.isOwnerOf(s.ownerUid, s.reporter_device_id)) {
          queueIfMissing('status_report', s.id, s, cloudStatuses, delStatuses);
        }
      }
    }

    if (snapshot.authoritative.intercityReports) {
      const cloudIc = new Set(snapshot.intercityReports.map((r) => r.id));
      const delIc = this.getPendingDeletedIds('intercity_delete');
      for (const r of this.intercityReports) {
        if (this.isOwnerOf(r.ownerUid, r.reporterDeviceId)) {
          queueIfMissing('intercity_report', r.id, r, cloudIc, delIc);
        }
      }
    }

    if (snapshot.authoritative.transporters) {
      const cloudTrans = new Set(snapshot.transporters.map((t) => t.id));
      const delTrans = this.getPendingDeletedIds('transporter_delete');
      for (const t of this.transporters) {
        if (this.isOwnerOf(t.ownerUid, t.registeredByDeviceId)) {
          queueIfMissing('transporter_register', t.id, t, cloudTrans, delTrans);
        }
      }
    }

    if (snapshot.authoritative.socialInteractions) {
      const cloudSoc = new Set(snapshot.socialInteractions.map((s) => s.id));
      const delSoc = this.getPendingDeletedIds('social_interaction_delete');
      for (const s of this.socialInteractions) {
        if (this.isOwnerOf(s.ownerUid, s.deviceId)) {
          queueIfMissing('social_interaction', s.id, s, cloudSoc, delSoc);
        }
      }
    }

    if (snapshot.authoritative.socialReplies) {
      const cloudReplies = new Set(snapshot.socialReplies.map((r) => r.id));
      const delReplies = this.getPendingDeletedIds('social_reply_delete');
      for (const r of this.socialReplies) {
        if (this.isOwnerOf(r.ownerUid, r.deviceId)) {
          queueIfMissing('social_reply', r.id, r, cloudReplies, delReplies);
        }
      }
    }

    if (snapshot.authoritative.socialReactions) {
      const cloudReacts = new Set(snapshot.socialReactions.map((r) => r.id));
      const delReacts = this.getPendingDeletedIds('social_reaction_delete');
      for (const r of this.socialReactions) {
        if (this.isOwnerOf(r.ownerUid, r.deviceId)) {
          queueIfMissing('social_reaction_record', r.id, r, cloudReacts, delReacts);
        }
      }
    }

    if (snapshot.authoritative.boardingConfirmations) {
      const cloudBoardings = new Set(snapshot.boardingConfirmations.map((b) => b.id));
      for (const b of this.boardingConfirmations) {
        if (this.isOwnerOf(b.ownerUid, b.deviceId)) {
          queueIfMissing('boarding_confirmation', b.id, b, cloudBoardings);
        }
      }
    }

    if (snapshot.authoritative.locationAnchors) {
      const cloudAnchors = new Set(snapshot.locationAnchors.map((a) => a.deviceId));
      const myAnchor = this.locationAnchors.find((a) => a.deviceId === this.deviceId);
      if (myAnchor && !cloudAnchors.has(this.deviceId) && !cloudAnchors.has(uid)) {
        queueIfMissing('location_anchor', this.deviceId, myAnchor, cloudAnchors);
      }
    }

    return addedCount;
  }

  // --- CLOUD SYNC & OUTBOX FLUSH ---
  public async flushOutbox(force = false): Promise<number> {
    if (!this.isEffectivelyOnline()) return 0;

    if (this.flushPromise) {
      this.flushRequestedAgain = true;
      return this.flushPromise;
    }

    this.flushPromise = (async () => {
      let totalPushed = 0;

      do {
        this.flushRequestedAgain = false;

        if (force) {
          this.outbox.forEach((w) => {
            if (w.status === 'failed') {
              w.status = 'pending';
            }
          });
        }

        const pending = this.outbox.filter(
          (w) => w.status === 'pending' || w.status === 'failed'
        );
        if (pending.length === 0) break;

        this.isSyncing = true;
        this.lastSyncError = null;
        this.notifyChange();

        let pushedInPass = 0;
        let authBlocked = false;
        let hitTransientError = false;
        const ordered = [...pending].reverse();

        for (const item of ordered) {
          if (!this.isEffectivelyOnline()) {
            item.status = 'failed';
            item.retry_count += 1;
            hitTransientError = true;
            break;
          }

          item.status = 'syncing';
          try {
            await pushPendingWriteToCloud(item);
            item.status = 'synced';
            item.error = undefined;
            pushedInPass += 1;
            totalPushed += 1;
          } catch (err: any) {
            const msg = err?.message || 'Cloud sync error';
            if (msg.includes('Sign in required')) {
              item.status = 'pending';
              item.error = msg;
              this.lastSyncError = msg;
              authBlocked = true;
              break;
            }
            item.status = 'failed';
            item.retry_count += 1;
            item.error = msg;
            this.lastSyncError = msg;
            hitTransientError = true;
          }
        }

        // Immediately clear synced items from queue so outbox never accumulates stale items
        this.persistOutboxClearedSynced();

        if (pushedInPass > 0) {
          this.fastRetryAttempt = 0;
          this.cloudConnected = true;
          this.lastSyncedAt = Date.now();
          safeSet(STORAGE_KEYS.LAST_SYNCED_AT, this.lastSyncedAt);
        }

        if (authBlocked) {
          break;
        }

        if (hitTransientError && this.getPendingWritesCount() > 0) {
          this.scheduleFastRetry();
          break;
        }
      } while (this.flushRequestedAgain && this.isEffectivelyOnline());

      this.isSyncing = false;
      this.notifyChange();
      return totalPushed;
    })();

    try {
      return await this.flushPromise;
    } finally {
      this.flushPromise = null;
    }
  }

  public async globalSyncNow(options?: {
    force?: boolean;
    reconcileLocal?: boolean;
  }): Promise<{ pushed: number; pulled: boolean; error?: string }> {
    const force = options?.force ?? true;
    const reconcileLocal = options?.reconcileLocal ?? true;

    if (!this.isEffectivelyOnline()) {
      return {
        pushed: 0,
        pulled: false,
        error: 'Device is offline. Changes are saved safely in local SQLite and will auto-sync once connected.',
      };
    }

    if (this.globalSyncPromise) {
      return this.globalSyncPromise;
    }

    this.globalSyncPromise = (async () => {
      let pushed = 0;
      try {
        if (!this.isExplicitlyLoggedOut) {
          await ensureCloudAuth(force, this.userProfile.username);
        }
        pushed += await this.flushOutbox(force);

        this.isSyncing = true;
        this.notifyChange();

        let snapshot = await pullAllFromCloud(this.deviceId);

        if (reconcileLocal && auth.currentUser) {
          const reconciledCount = this.reconcileUnsyncedLocalRecordsToOutbox(snapshot);
          if (reconciledCount > 0) {
            this.isSyncing = false;
            pushed += await this.flushOutbox(true);
            this.isSyncing = true;
            this.notifyChange();
            snapshot = await pullAllFromCloud(this.deviceId);
          }
        }

        this.applyCloudSnapshot(snapshot);
        this.attachCloudListeners();

        this.isSyncing = false;
        this.notifyChange();
        return { pushed, pulled: true, error: this.lastSyncError || undefined };
      } catch (err: any) {
        this.isSyncing = false;
        this.lastSyncError = err?.message || 'Unable to reach cloud database';
        this.notifyChange();
        return { pushed, pulled: false, error: this.lastSyncError || undefined };
      } finally {
        this.globalSyncPromise = null;
      }
    })();

    return this.globalSyncPromise;
  }

  private startBackgroundSync(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => {
      if (this.isEffectivelyOnline() && this.getPendingWritesCount() > 0) {
        this.flushOutbox();
      }
    }, 10000);
  }

  public getMyReports(): { fares: FareReport[]; statuses: StatusReport[] } {
    if (this.isExplicitlyLoggedOut) {
      return { fares: [], statuses: [] };
    }
    const myFares = this.fareReports
      .filter((f) => this.isOwnerOf(f.ownerUid, f.reporter_device_id))
      .map((f) => this.hydrateFareVote(f));
    const myStatuses = this.statusReports.filter((s) => this.isOwnerOf(s.ownerUid, s.reporter_device_id));
    return { fares: myFares, statuses: myStatuses };
  }

  public resetToSeed(): void {
    localStorage.removeItem(STORAGE_KEYS.ROUTES);
    localStorage.removeItem(STORAGE_KEYS.RANKS);
    localStorage.removeItem(STORAGE_KEYS.FARE_REPORTS);
    localStorage.removeItem(STORAGE_KEYS.STATUS_REPORTS);
    localStorage.removeItem(STORAGE_KEYS.INTERCITY_REPORTS);
    localStorage.removeItem(STORAGE_KEYS.OUTBOX_PENDING);
    localStorage.removeItem(STORAGE_KEYS.LAST_REPORTS_BY_ROUTE);
    localStorage.removeItem(STORAGE_KEYS.TRANSPORTERS);
    localStorage.removeItem(STORAGE_KEYS.SOCIAL_INTERACTIONS);
    localStorage.removeItem(STORAGE_KEYS.SOCIAL_REPLIES);
    localStorage.removeItem(STORAGE_KEYS.SOCIAL_REACTIONS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.BOARDING_CONFIRMATIONS);
    localStorage.removeItem(STORAGE_KEYS.COMMUTERS_DIRECTORY);
    localStorage.removeItem(STORAGE_KEYS.LOCATION_ANCHORS);
    sqliteDb.clearAllUserTables();
    this.initFromLocalCache();
    this.ensureLocalUserInDirectory();
    this.notifyChange();
  }
}

export const offlineStore = new FambaiOfflineStore();
