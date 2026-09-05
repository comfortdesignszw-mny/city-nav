import { 
  RouteItem, 
  Rank, 
  FareReport, 
  StatusReport, 
  UserProfile, 
  PendingWrite, 
  ActiveRouteSummary, 
  Currency, 
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
  AbuseCategory
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
import { DEFAULT_USER_LOCATION } from '../utils/geoUtils';

const STORAGE_KEYS = {
  DEVICE_ID: 'fambai_device_id',
  USER_PROFILE: 'fambai_user_profile',
  USER_LOCATION: 'fambai_user_location',
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
  PRODUCTION_CLEAN: 'fambai_production_clean_v1',
};

// Generate UUID for anonymous device identification
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

// Storage helper with fallback
function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`Error reading from localStorage key: ${key}`, e);
    return fallback;
  }
}

function safeSet<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Error writing to localStorage key: ${key}`, e);
  }
}

class FambaiOfflineStore {
  private deviceId: string;
  private userProfile: UserProfile;
  private routes: RouteItem[] = [];
  private ranks: Rank[] = [];
  private fareReports: FareReport[] = [];
  private statusReports: StatusReport[] = [];
  private busOperators: BusOperator[] = [];
  private intercityRoutes: IntercityRoute[] = [];
  private intercityReports: IntercityReport[] = [];
  private transporters: TransporterProfile[] = [];
  private socialInteractions: CommuterSocialInteraction[] = [];
  private outbox: PendingWrite[] = [];
  private userLocation: UserLocation;
  private simulatedOffline: boolean = false;
  private isSyncing: boolean = false;
  private listeners: Set<() => void> = new Set();
  private syncTimer: any = null;

  constructor() {
    this.deviceId = getOrCreateDeviceId();
    this.simulatedOffline = safeGet<boolean>(STORAGE_KEYS.OFFLINE_SIMULATION, false);

    // Production Reset Check: Ensure stale demo data is flushed for production while preserving profile
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
    
    // User Location hydration (defaults to Copacabana, Harare if not set)
    const cachedLoc = safeGet<UserLocation | null>(STORAGE_KEYS.USER_LOCATION, null);
    this.userLocation = cachedLoc || DEFAULT_USER_LOCATION;

    // 1. Instant Cache Hydration from Local SQLite/LocalStorage representation
    this.initFromLocalCache();

    // 2. Setup user profile with friendly default username & handle
    const existingProfile = safeGet<UserProfile | null>(STORAGE_KEYS.USER_PROFILE, null);
    const defaultSuffix = this.deviceId.slice(-4).toUpperCase();
    if (existingProfile) {
      this.userProfile = {
        ...existingProfile,
        username: existingProfile.username || `Commuter_${defaultSuffix}`,
        handle: existingProfile.handle || `@commuter_${defaultSuffix.toLowerCase()}`,
        avatarColor: existingProfile.avatarColor || '#F27D26',
        commuterBadge: existingProfile.commuterBadge || 'Daily Commuter',
        role: existingProfile.role || 'commuter',
      };
      safeSet(STORAGE_KEYS.USER_PROFILE, this.userProfile);
    } else {
      this.userProfile = {
        device_id: this.deviceId,
        username: `Commuter_${defaultSuffix}`,
        handle: `@commuter_${defaultSuffix.toLowerCase()}`,
        avatarColor: '#F27D26',
        commuterBadge: 'Daily Commuter',
        role: 'commuter',
        reputation_score: 100,
        reports_count: 0,
        createdAt: Date.now(),
      };
      safeSet(STORAGE_KEYS.USER_PROFILE, this.userProfile);
    }

    // 3. Start background sync loop
    this.startBackgroundSync();

    // 4. Listen to browser online events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notifyChange();
        this.flushOutbox();
      });
      window.addEventListener('offline', () => {
        this.notifyChange();
      });
    }
  }

  private initFromLocalCache() {
    const cachedRoutes = safeGet<RouteItem[]>(STORAGE_KEYS.ROUTES, []);
    const cachedRanks = safeGet<Rank[]>(STORAGE_KEYS.RANKS, []);
    const cachedFares = safeGet<FareReport[]>(STORAGE_KEYS.FARE_REPORTS, []);
    const cachedStatuses = safeGet<StatusReport[]>(STORAGE_KEYS.STATUS_REPORTS, []);
    const cachedOperators = safeGet<BusOperator[]>(STORAGE_KEYS.BUS_OPERATORS, []);
    const cachedIntercityRoutes = safeGet<IntercityRoute[]>(STORAGE_KEYS.INTERCITY_ROUTES, []);
    const cachedIntercityReports = safeGet<IntercityReport[]>(STORAGE_KEYS.INTERCITY_REPORTS, []);
    const cachedOutbox = safeGet<PendingWrite[]>(STORAGE_KEYS.OUTBOX_PENDING, []);

    // Merge seeded routes with any local user-added routes
    const routeMap = new Map<string, RouteItem>();
    SEED_ROUTES.forEach((r) => routeMap.set(r.id, r));
    cachedRoutes.forEach((r) => {
      const existing = routeMap.get(r.id);
      routeMap.set(r.id, existing ? { ...existing, ...r } : r);
    });
    this.routes = Array.from(routeMap.values());
    safeSet(STORAGE_KEYS.ROUTES, this.routes);

    // Merge seeded ranks with local ranks
    const rankMap = new Map<string, Rank>();
    SEED_RANKS.forEach((rnk) => rankMap.set(rnk.id, rnk));
    cachedRanks.forEach((rnk) => rankMap.set(rnk.id, rnk));
    this.ranks = Array.from(rankMap.values());
    safeSet(STORAGE_KEYS.RANKS, this.ranks);

    // Merge fares
    const fareMap = new Map<string, FareReport>();
    SEED_FARE_REPORTS.forEach((f) => fareMap.set(f.id, f));
    cachedFares.forEach((f) => fareMap.set(f.id, f));
    this.fareReports = Array.from(fareMap.values());
    safeSet(STORAGE_KEYS.FARE_REPORTS, this.fareReports);

    // Merge statuses
    const statusMap = new Map<string, StatusReport>();
    SEED_STATUS_REPORTS.forEach((s) => statusMap.set(s.id, s));
    cachedStatuses.forEach((s) => statusMap.set(s.id, s));
    this.statusReports = Array.from(statusMap.values());
    safeSet(STORAGE_KEYS.STATUS_REPORTS, this.statusReports);

    // Merge bus operators
    const opMap = new Map<string, BusOperator>();
    BUS_OPERATORS.forEach((op) => opMap.set(op.id, op));
    cachedOperators.forEach((op) => opMap.set(op.id, op));
    this.busOperators = Array.from(opMap.values());
    safeSet(STORAGE_KEYS.BUS_OPERATORS, this.busOperators);

    // Merge intercity routes
    const icRouteMap = new Map<string, IntercityRoute>();
    INTERCITY_ROUTES.forEach((r) => icRouteMap.set(r.id, r));
    cachedIntercityRoutes.forEach((r) => icRouteMap.set(r.id, r));
    this.intercityRoutes = Array.from(icRouteMap.values());
    safeSet(STORAGE_KEYS.INTERCITY_ROUTES, this.intercityRoutes);

    // Merge intercity reports
    const icRepMap = new Map<string, IntercityReport>();
    SEED_INTERCITY_REPORTS.forEach((rep) => icRepMap.set(rep.id, rep));
    cachedIntercityReports.forEach((rep) => icRepMap.set(rep.id, rep));
    this.intercityReports = Array.from(icRepMap.values());
    safeSet(STORAGE_KEYS.INTERCITY_REPORTS, this.intercityReports);

    // Merge transporters
    const cachedTransporters = safeGet<TransporterProfile[]>(STORAGE_KEYS.TRANSPORTERS, []);
    const transMap = new Map<string, TransporterProfile>();
    SEED_TRANSPORTERS.forEach((t) => transMap.set(t.id, t));
    cachedTransporters.forEach((t) => {
      const existing = transMap.get(t.id);
      transMap.set(t.id, existing ? { ...existing, ...t } : t);
    });
    this.transporters = Array.from(transMap.values());
    safeSet(STORAGE_KEYS.TRANSPORTERS, this.transporters);

    // Merge social interactions
    const cachedSocial = safeGet<CommuterSocialInteraction[]>(STORAGE_KEYS.SOCIAL_INTERACTIONS, []);
    const socialMap = new Map<string, CommuterSocialInteraction>();
    SEED_SOCIAL_INTERACTIONS.forEach((s) => socialMap.set(s.id, s));
    cachedSocial.forEach((s) => {
      const existing = socialMap.get(s.id);
      socialMap.set(s.id, existing ? { ...existing, ...s } : s);
    });
    this.socialInteractions = Array.from(socialMap.values()).sort((a, b) => b.createdAt - a.createdAt);
    safeSet(STORAGE_KEYS.SOCIAL_INTERACTIONS, this.socialInteractions);

    this.outbox = cachedOutbox;
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notifyChange(): void {
    this.listeners.forEach((fn) => fn());
  }

  public getDeviceId(): string {
    return this.deviceId;
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

  public updateUserProfile(updates: Partial<UserProfile>): UserProfile {
    let handle = updates.handle || this.userProfile.handle;
    if (updates.username && !updates.handle) {
      handle = '@' + updates.username.trim().toLowerCase().replace(/\s+/g, '_');
    }
    this.userProfile = {
      ...this.userProfile,
      ...updates,
      handle,
    };
    safeSet(STORAGE_KEYS.USER_PROFILE, this.userProfile);
    this.notifyChange();
    return { ...this.userProfile };
  }

  public updatePhone(phone: string): void {
    this.userProfile.phone = phone;
    this.userProfile.reputation_score += 15; // Bonus for linking phone
    safeSet(STORAGE_KEYS.USER_PROFILE, this.userProfile);
    this.notifyChange();
  }

  public getUserLocation(): UserLocation {
    return { ...this.userLocation };
  }

  public setUserLocation(loc: UserLocation): void {
    this.userLocation = { ...loc, timestamp: Date.now() };
    safeSet(STORAGE_KEYS.USER_LOCATION, this.userLocation);
    this.notifyChange();
  }

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
      // Back online, try flushing outbox
      this.flushOutbox();
    }
  }

  public getPendingWritesCount(): number {
    return this.outbox.filter((w) => w.status === 'pending' || w.status === 'syncing').length;
  }

  public getOutboxItems(): PendingWrite[] {
    return [...this.outbox];
  }

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

  // Intercity Bus Knowledgebase Methods
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

  public getIntercityReports(routeId?: string): IntercityReport[] {
    if (routeId) {
      return this.intercityReports
        .filter((r) => r.routeId === routeId)
        .sort((a, b) => b.reportedAt - a.reportedAt);
    }
    return [...this.intercityReports].sort((a, b) => b.reportedAt - a.reportedAt);
  }

  public addIntercityReport(data: {
    routeId: string;
    operatorId: string;
    operatorName: string;
    farePaidUSD: number;
    farePaidZiG?: number;
    departureTime?: string;
    departureTerminal: string;
    seatAvailability: 'plenty' | 'filling_fast' | 'full';
    busConditionRating: number;
    roadStatusNote?: string;
  }): IntercityReport {
    const newReport: IntercityReport = {
      id: 'rep-ic-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      routeId: data.routeId,
      operatorId: data.operatorId,
      operatorName: data.operatorName,
      farePaidUSD: data.farePaidUSD,
      farePaidZiG: data.farePaidZiG,
      departureTime: data.departureTime,
      departureTerminal: data.departureTerminal,
      seatAvailability: data.seatAvailability,
      busConditionRating: data.busConditionRating,
      roadStatusNote: data.roadStatusNote,
      reportedAt: Date.now(),
      reporterDeviceId: this.deviceId,
      upvotes: 1,
      downvotes: 0,
      userVote: 'up',
    };

    this.intercityReports = [newReport, ...this.intercityReports];
    safeSet(STORAGE_KEYS.INTERCITY_REPORTS, this.intercityReports);

    // Reward user profile
    this.userProfile.reports_count += 1;
    this.userProfile.reputation_score += 15;
    safeSet(STORAGE_KEYS.USER_PROFILE, this.userProfile);

    // Queue in outbox
    const pendingWrite: PendingWrite = {
      id: 'outbox-ic-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      type: 'intercity_report',
      payload: newReport,
      created_at: Date.now(),
      retry_count: 0,
      status: 'pending',
    };
    this.outbox = [pendingWrite, ...this.outbox];
    safeSet(STORAGE_KEYS.OUTBOX_PENDING, this.outbox);

    this.notifyChange();
    this.flushOutbox();

    return newReport;
  }

  public voteIntercityReport(reportId: string, direction: 'up' | 'down'): void {
    const rep = this.intercityReports.find((r) => r.id === reportId);
    if (!rep) return;
    if (rep.userVote === direction) return;

    if (rep.userVote === 'up') rep.upvotes = Math.max(0, rep.upvotes - 1);
    if (rep.userVote === 'down') rep.downvotes = Math.max(0, rep.downvotes - 1);

    if (direction === 'up') rep.upvotes += 1;
    if (direction === 'down') rep.downvotes += 1;
    rep.userVote = direction;

    safeSet(STORAGE_KEYS.INTERCITY_REPORTS, this.intercityReports);
    this.notifyChange();
  }

  // ==========================================
  // TRANSPORTERS & OPERATORS DIRECTORY METHODS
  // ==========================================
  public getTransporters(city?: string, type?: string): TransporterProfile[] {
    let list = [...this.transporters];
    if (city && city !== 'All Cities') {
      list = list.filter((t) => (t.city || '').toLowerCase() === city.toLowerCase());
    }
    if (type && type !== 'all') {
      list = list.filter((t) => t.transportType === type);
    }
    return list.sort((a, b) => b.lastRouteUpdate - a.lastRouteUpdate);
  }

  public getTransporterById(id: string): TransporterProfile | undefined {
    return this.transporters.find((t) => t.id === id);
  }

  public getTransportersForRoute(routeId: string, routeName?: string): TransporterProfile[] {
    const rName = (routeName || '').toLowerCase();
    return this.transporters.filter((t) => {
      if (t.currentRouteId && t.currentRouteId === routeId) return true;
      if (rName && t.currentRouteName && t.currentRouteName.toLowerCase().includes(rName)) return true;
      return false;
    });
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
    const newTransporter: TransporterProfile = {
      id: 'trans-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
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
      registeredAt: Date.now(),
      lastRouteUpdate: Date.now(),
      registeredByDeviceId: this.deviceId,
      username: this.getUsername(),
      userHandle: this.getUserHandle(),
      likes: 1,
      userLiked: true,
    };

    this.transporters = [newTransporter, ...this.transporters];
    safeSet(STORAGE_KEYS.TRANSPORTERS, this.transporters);

    // Update user profile badge to Transporter
    this.updateUserProfile({ role: 'transporter', commuterBadge: 'Registered Transporter' });

    this.notifyChange();
    return newTransporter;
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
    if (!item) return false;

    item.currentRouteName = updates.currentRouteName.trim();
    if (updates.currentRouteId !== undefined) item.currentRouteId = updates.currentRouteId;
    if (updates.city) item.city = updates.city;
    if (updates.baseTerminus !== undefined) item.baseTerminus = updates.baseTerminus;
    if (updates.status) item.status = updates.status;
    if (updates.statusNote !== undefined) item.statusNote = updates.statusNote;
    if (updates.contactPhone) item.contactPhone = updates.contactPhone.trim();
    item.lastRouteUpdate = Date.now();

    safeSet(STORAGE_KEYS.TRANSPORTERS, this.transporters);
    this.notifyChange();
    return true;
  }

  public toggleLikeTransporter(transporterId: string): void {
    const item = this.transporters.find((t) => t.id === transporterId);
    if (!item) return;

    if (item.userLiked) {
      item.likes = Math.max(0, item.likes - 1);
      item.userLiked = false;
    } else {
      item.likes += 1;
      item.userLiked = true;
    }

    safeSet(STORAGE_KEYS.TRANSPORTERS, this.transporters);
    this.notifyChange();
  }

  // ==========================================
  // SOCIAL INTERACTIONS & COMMUTER BUZZ METHODS
  // ==========================================
  public getSocialInteractions(targetType?: string, targetId?: string): CommuterSocialInteraction[] {
    let list = [...this.socialInteractions];
    if (targetType) {
      list = list.filter((s) => s.targetType === targetType);
    }
    if (targetId) {
      list = list.filter((s) => s.targetId === targetId);
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }

  public getAllSocialInteractions(): CommuterSocialInteraction[] {
    return [...this.socialInteractions].sort((a, b) => b.createdAt - a.createdAt);
  }

  public addSocialInteraction(data: {
    targetType: CommuterSocialInteraction['targetType'];
    targetId: string;
    targetName: string;
    comment: string;
    rating?: number;
    confirmedFare?: { amount: number; currency: Currency };
    confirmedDepartureTime?: string;
    amenitiesReview?: AmenityFeedback;
    isAbuseReport?: boolean;
    abuseType?: AbuseCategory;
    abuseLocation?: string;
    abusePlateNumber?: string;
  }): CommuterSocialInteraction {
    const newInteraction: CommuterSocialInteraction = {
      id: 'soc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      targetType: data.targetType,
      targetId: data.targetId,
      targetName: data.targetName,
      username: this.getUsername(),
      userHandle: this.getUserHandle(),
      userBadge: this.getUserBadge(),
      avatarBg: this.userProfile.avatarColor || '#F27D26',
      comment: data.comment.trim(),
      rating: data.rating,
      likes: 1, // Author like
      dislikes: 0,
      userReaction: 'like',
      createdAt: Date.now(),
      deviceId: this.deviceId,
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

    // Reward commuter reputation
    this.userProfile.reputation_score += data.isAbuseReport ? 20 : 10;
    this.userProfile.reports_count += 1;
    safeSet(STORAGE_KEYS.USER_PROFILE, this.userProfile);

    // If confirmed fare provided, automatically record it as a fare report too!
    if (data.confirmedFare && data.targetType === 'route') {
      this.reportFare(
        data.targetId,
        data.confirmedFare.amount,
        data.confirmedFare.currency,
        'Social Commuter Confirmation',
        data.confirmedDepartureTime || 'Confirmed on route'
      );
    }

    this.notifyChange();
    return newInteraction;
  }

  public reactSocialInteraction(interactionId: string, reaction: 'like' | 'dislike'): void {
    const item = this.socialInteractions.find((s) => s.id === interactionId);
    if (!item) return;

    if (item.userReaction === reaction) {
      // Undo reaction
      if (reaction === 'like') item.likes = Math.max(0, item.likes - 1);
      if (reaction === 'dislike') item.dislikes = Math.max(0, item.dislikes - 1);
      item.userReaction = undefined;
    } else {
      if (item.userReaction === 'like') item.likes = Math.max(0, item.likes - 1);
      if (item.userReaction === 'dislike') item.dislikes = Math.max(0, item.dislikes - 1);

      if (reaction === 'like') item.likes += 1;
      if (reaction === 'dislike') item.dislikes += 1;
      item.userReaction = reaction;
    }

    safeSet(STORAGE_KEYS.SOCIAL_INTERACTIONS, this.socialInteractions);
    this.notifyChange();
  }

  // Auto-expire status reports past their expires_at
  public getActiveStatusesForRoute(routeId: string): StatusReport[] {
    const now = Date.now();
    return this.statusReports
      .filter((s) => s.route_id === routeId && s.expires_at > now)
      .sort((a, b) => b.reported_at - a.reported_at);
  }

  public getFareReportsForRoute(routeId: string): FareReport[] {
    return this.fareReports
      .filter((f) => f.route_id === routeId)
      .sort((a, b) => b.reported_at - a.reported_at);
  }

  // Calculate summary and fare confidence indicator
  public getRouteSummary(routeId: string): ActiveRouteSummary | null {
    const route = this.getRouteById(routeId);
    if (!route) return null;

    const activeStatuses = this.getActiveStatusesForRoute(routeId);
    const fares = this.getFareReportsForRoute(routeId);
    const latestFare = fares[0];
    const latestStatus = activeStatuses[0];

    // Calculate averages across currencies
    const usdFares = fares.filter((f) => f.currency === 'USD').slice(0, 5);
    const avgUSD = usdFares.length > 0 
      ? usdFares.reduce((sum, f) => sum + f.fare_amount, 0) / usdFares.length 
      : undefined;

    const zwlFares = fares.filter((f) => f.currency === 'ZWL').slice(0, 5);
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

    // Confidence indicator: recency + upvotes
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

  // Spam guard: limit reporting same route within 5 minutes (300 seconds)
  public checkSpamLimit(routeId: string): { allowed: boolean; remainingSeconds: number } {
    const record = safeGet<Record<string, number>>(STORAGE_KEYS.LAST_REPORTS_BY_ROUTE, {});
    const lastTime = record[routeId];
    if (!lastTime) return { allowed: true, remainingSeconds: 0 };

    const elapsedMs = Date.now() - lastTime;
    const cooldownMs = 5 * 60 * 1000; // 5 minutes
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

  // --- OUTBOX PATTERN WRITES ---

  // Add a new route with live fare and transport type carrying passengers
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
    const routeId = 'route-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
    
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
    };

    // 1. Add route to local routes
    this.routes = [newRoute, ...this.routes];
    safeSet(STORAGE_KEYS.ROUTES, this.routes);

    // 2. Add fare report with current transport type & departure status
    const fareId = 'fare-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
    const newFare: FareReport = {
      id: fareId,
      route_id: routeId,
      fare_amount: data.fareAmount,
      currency: data.currency,
      reported_at: Date.now(),
      reporter_device_id: this.deviceId,
      upvotes: 1,
      downvotes: 0,
      userVote: 'up',
      source: 'user',
      transport_type: data.transportType,
      departure_status: data.departureStatus,
      route_name: newRoute.name,
      city: newRoute.city,
    };

    this.fareReports = [newFare, ...this.fareReports];
    safeSet(STORAGE_KEYS.FARE_REPORTS, this.fareReports);
    this.markReportTime(routeId);

    // 3. Add initial status if provided
    if (data.statusType) {
      const statusId = 'status-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      const newStatus: StatusReport = {
        id: statusId,
        route_id: routeId,
        type: data.statusType,
        note: data.note ? data.note.trim().slice(0, 100) : undefined,
        reported_at: Date.now(),
        expires_at: Date.now() + 90 * 60 * 1000,
        reporter_device_id: this.deviceId,
        source: 'user',
      };
      this.statusReports = [newStatus, ...this.statusReports];
      safeSet(STORAGE_KEYS.STATUS_REPORTS, this.statusReports);
    }

    // 4. Reward user profile
    this.userProfile.reports_count += 2;
    this.userProfile.reputation_score += 25;
    safeSet(STORAGE_KEYS.USER_PROFILE, this.userProfile);

    // 5. Outbox pending write
    const pendingWrite: PendingWrite = {
      id: 'outbox-route-' + Date.now().toString(36),
      type: 'add_route',
      payload: { route: newRoute, fare: newFare },
      created_at: Date.now(),
      retry_count: 0,
      status: 'pending',
    };
    this.outbox = [pendingWrite, ...this.outbox];
    safeSet(STORAGE_KEYS.OUTBOX_PENDING, this.outbox);

    this.notifyChange();
    this.flushOutbox();

    return { route: newRoute, fare: newFare };
  }

  // Report Fare
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

    const route = this.getRouteById(routeId);
    const newReport: FareReport = {
      id: 'fare-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      route_id: routeId,
      fare_amount: amount,
      currency,
      reported_at: Date.now(),
      reporter_device_id: this.deviceId,
      reporter_username: this.getUsername(),
      reporter_badge: this.getUserBadge(),
      upvotes: 1, // Self confirmation
      downvotes: 0,
      userVote: 'up',
      source: 'user',
      transport_type: transportType || route?.commonVehicle || 'Toyota HiAce Kombi',
      departure_status: departureStatus || 'Loading right now',
      route_name: route?.name,
      city: route?.city,
    };

    // 1. Optimistic Local SQLite/Cache update
    this.fareReports = [newReport, ...this.fareReports];
    safeSet(STORAGE_KEYS.FARE_REPORTS, this.fareReports);
    this.markReportTime(routeId);

    // Update user stats
    this.userProfile.reports_count += 1;
    this.userProfile.reputation_score += 5;
    safeSet(STORAGE_KEYS.USER_PROFILE, this.userProfile);

    // 2. Queue in Outbox table
    const pendingWrite: PendingWrite = {
      id: 'outbox-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      type: 'fare_report',
      payload: newReport,
      created_at: Date.now(),
      retry_count: 0,
      status: 'pending',
    };
    this.outbox = [pendingWrite, ...this.outbox];
    safeSet(STORAGE_KEYS.OUTBOX_PENDING, this.outbox);

    this.notifyChange();

    // 3. Attempt silent background sync
    this.flushOutbox();

    return { success: true };
  }

  // Get all fare reports with route metadata, sorted strictly latest first
  public getAllFareReports(): FareReport[] {
    return this.fareReports
      .map((f) => {
        const route = this.getRouteById(f.route_id);
        return {
          ...f,
          route_name: f.route_name || route?.name || 'Commuter Route',
          city: f.city || route?.city || 'Harare',
          transport_type: f.transport_type || route?.commonVehicle || 'Toyota HiAce Kombi',
          departure_status: f.departure_status || 'In Transit / Loading',
        };
      })
      .sort((a, b) => b.reported_at - a.reported_at);
  }

  // Get all active status alerts, sorted strictly latest first
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

  // Report Status
  public reportStatus(routeId: string, type: StatusType, note?: string): { success: boolean; error?: string } {
    const spamCheck = this.checkSpamLimit(routeId);
    if (!spamCheck.allowed) {
      return {
        success: false,
        error: `Spam protection: Please wait ${spamCheck.remainingSeconds}s before submitting a status for this route again.`,
      };
    }

    const newStatus: StatusReport = {
      id: 'status-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      route_id: routeId,
      type,
      note: note ? note.trim().slice(0, 100) : undefined,
      reported_at: Date.now(),
      expires_at: Date.now() + 90 * 60 * 1000, // 90 min expiration
      reporter_device_id: this.deviceId,
      source: 'user',
    };

    // 1. Optimistic update
    this.statusReports = [newStatus, ...this.statusReports];
    safeSet(STORAGE_KEYS.STATUS_REPORTS, this.statusReports);
    this.markReportTime(routeId);

    // Update user stats
    this.userProfile.reports_count += 1;
    this.userProfile.reputation_score += 5;
    safeSet(STORAGE_KEYS.USER_PROFILE, this.userProfile);

    // 2. Queue in Outbox
    const pendingWrite: PendingWrite = {
      id: 'outbox-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      type: 'status_report',
      payload: newStatus,
      created_at: Date.now(),
      retry_count: 0,
      status: 'pending',
    };
    this.outbox = [pendingWrite, ...this.outbox];
    safeSet(STORAGE_KEYS.OUTBOX_PENDING, this.outbox);

    this.notifyChange();

    // 3. Silent background sync
    this.flushOutbox();

    return { success: true };
  }

  // Upvote or downvote a fare
  public voteFare(fareId: string, voteType: 'up' | 'down'): void {
    const fare = this.fareReports.find((f) => f.id === fareId);
    if (!fare) return;

    const prevVote = fare.userVote;
    if (prevVote === voteType) return; // Already voted this way

    if (prevVote === 'up') fare.upvotes = Math.max(0, fare.upvotes - 1);
    if (prevVote === 'down') fare.downvotes = Math.max(0, fare.downvotes - 1);

    if (voteType === 'up') fare.upvotes += 1;
    if (voteType === 'down') fare.downvotes += 1;
    fare.userVote = voteType;

    safeSet(STORAGE_KEYS.FARE_REPORTS, this.fareReports);

    // Queue in outbox
    const pendingWrite: PendingWrite = {
      id: 'outbox-vote-' + Date.now(),
      type: 'fare_vote',
      payload: { fareId, voteType, deviceId: this.deviceId },
      created_at: Date.now(),
      retry_count: 0,
      status: 'pending',
    };
    this.outbox = [pendingWrite, ...this.outbox];
    safeSet(STORAGE_KEYS.OUTBOX_PENDING, this.outbox);

    this.notifyChange();
    this.flushOutbox();
  }

  // Background Outbox Sync worker (silent, non-blocking)
  public async flushOutbox(): Promise<void> {
    if (this.isSyncing) return;
    if (!this.isEffectivelyOnline()) {
      return; // Stay queued in local store until connectivity returns
    }

    const pending = this.outbox.filter((w) => w.status === 'pending' || w.status === 'failed');
    if (pending.length === 0) return;

    this.isSyncing = true;
    this.notifyChange();

    for (const item of pending) {
      item.status = 'syncing';
      try {
        // Simulating cloud / Firestore synchronization with backoff
        await new Promise((resolve) => setTimeout(resolve, 350));

        if (!this.isEffectivelyOnline()) {
          item.status = 'failed';
          item.retry_count += 1;
          break;
        }

        item.status = 'synced';
      } catch (err: any) {
        item.status = 'failed';
        item.retry_count += 1;
        item.error = err?.message || 'Sync failed';
      }
    }

    // Retain only last 20 synced for history in My Reports, purge older synced
    const activePending = this.outbox.filter((w) => w.status !== 'synced');
    const recentSynced = this.outbox.filter((w) => w.status === 'synced').slice(0, 20);
    this.outbox = [...activePending, ...recentSynced];
    safeSet(STORAGE_KEYS.OUTBOX_PENDING, this.outbox);

    this.isSyncing = false;
    this.notifyChange();
  }

  private startBackgroundSync(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
    // Silent periodic background check every 25 seconds
    this.syncTimer = setInterval(() => {
      if (this.getPendingWritesCount() > 0 && this.isEffectivelyOnline()) {
        this.flushOutbox();
      }
    }, 25000);
  }

  // Get device report history
  public getMyReports(): { fares: FareReport[]; statuses: StatusReport[] } {
    const myFares = this.fareReports.filter((f) => f.reporter_device_id === this.deviceId);
    const myStatuses = this.statusReports.filter((s) => s.reporter_device_id === this.deviceId);
    return { fares: myFares, statuses: myStatuses };
  }

  // Reset data to clean production state
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
    this.initFromLocalCache();
    this.notifyChange();
  }
}

export const offlineStore = new FambaiOfflineStore();
