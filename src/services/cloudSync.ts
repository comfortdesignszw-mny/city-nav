import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  query,
  setDoc,
  Unsubscribe,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, ensureCloudAuth, handleFirestoreError, OperationType } from './firebase';
import {
  BoardingConfirmation,
  CommuterNotification,
  CommuterSocialInteraction,
  FareReport,
  IntercityReport,
  IntercityRoute,
  LocationAnchor,
  PendingWrite,
  RouteItem,
  SocialReactionRecord,
  SocialReply,
  StatusReport,
  TransporterProfile,
  UserProfile,
} from '../types';

export interface CloudSnapshotData {
  commuters: UserProfile[];
  routes: RouteItem[];
  fareReports: FareReport[];
  statusReports: StatusReport[];
  intercityRoutes: IntercityRoute[];
  intercityReports: IntercityReport[];
  transporters: TransporterProfile[];
  socialInteractions: CommuterSocialInteraction[];
  socialReplies: SocialReply[];
  socialReactions: SocialReactionRecord[];
  notifications: CommuterNotification[];
  boardingConfirmations: BoardingConfirmation[];
  locationAnchors: LocationAnchor[];
  privatePhone?: string;
  authoritative: {
    commuters: boolean;
    routes: boolean;
    fareReports: boolean;
    statusReports: boolean;
    intercityRoutes: boolean;
    intercityReports: boolean;
    transporters: boolean;
    socialInteractions: boolean;
    socialReplies: boolean;
    socialReactions: boolean;
    notifications: boolean;
    boardingConfirmations: boolean;
    locationAnchors: boolean;
  };
}

function stripUndefined<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      clean[key] = val;
    }
  }
  return clean;
}

function nonEmpty(val: string | undefined | null, maxLen: number): string | undefined {
  if (!val) return undefined;
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
}

function sanitizeCommuterForCloud(profile: UserProfile, uid: string): Record<string, any> {
  const isAnon = auth.currentUser ? !!auth.currentUser.isAnonymous : profile.isGuest ?? true;
  const rawUserId = nonEmpty(profile.userId, 128);
  const safeUserId = rawUserId && rawUserId.length >= 3 ? rawUserId : uid;
  const cleanName =
    typeof profile.name === 'string' && profile.name.trim().length > 0
      ? profile.name.trim().slice(0, 60)
      : undefined;
  const rawAvatar = nonEmpty(profile.avatarColor, 20);
  const safeAvatar = rawAvatar && rawAvatar.length >= 3 ? rawAvatar : '#F27D26';
  const rawRep = Number(profile.reputation_score);
  const rawReports = Number(profile.reports_count);
  const rawCreated = Number(profile.createdAt);
  const rawUpdated = Number(profile.updatedAt);

  return stripUndefined({
    device_id: profile.device_id,
    userId: safeUserId.slice(0, 128),
    ownerUid: uid,
    username: nonEmpty(profile.username, 40) || 'guest_User1',
    handle: nonEmpty(profile.handle, 45) || '@guest_user1',
    name: cleanName,
    avatarColor: safeAvatar,
    commuterBadge: nonEmpty(profile.commuterBadge, 60) || 'Daily Commuter',
    role: profile.role === 'transporter' ? 'transporter' : 'commuter',
    isGuest: typeof profile.isGuest === 'boolean' ? profile.isGuest : isAnon,
    authProvider: profile.authProvider || (isAnon ? 'anonymous' : 'google'),
    reputation_score: Number.isFinite(rawRep) ? Math.min(1000000, Math.max(0, rawRep)) : 100,
    reports_count: Number.isFinite(rawReports) ? Math.min(1000000, Math.max(0, rawReports)) : 0,
    createdAt: Number.isFinite(rawCreated) && rawCreated > 0 ? rawCreated : Date.now(),
    updatedAt: Number.isFinite(rawUpdated) && rawUpdated > 0 ? rawUpdated : Date.now(),
  });
}

export interface ReturningAccountRecord {
  ownerUid: string;
  email: string;
  primaryDeviceId: string;
  username: string;
  handle: string;
  name?: string;
  avatarColor: string;
  commuterBadge: string;
  role: 'commuter' | 'transporter';
  reputation_score: number;
  reports_count: number;
  createdAt: number;
  updatedAt: number;
  lastLoginAt: number;
}

function sanitizeAccountForCloud(
  account: ReturningAccountRecord
): Record<string, any> {
  return stripUndefined({
    ownerUid: account.ownerUid.slice(0, 128),
    email: account.email.slice(0, 160),
    primaryDeviceId: account.primaryDeviceId.slice(0, 128),
    username: nonEmpty(account.username, 40) || 'Commuter',
    handle: nonEmpty(account.handle, 45) || '@commuter',
    name: account.name !== undefined ? account.name.slice(0, 60) : undefined,
    avatarColor: nonEmpty(account.avatarColor, 20) || '#F27D26',
    commuterBadge: nonEmpty(account.commuterBadge, 60) || 'Daily Commuter',
    role: account.role === 'transporter' ? 'transporter' : 'commuter',
    reputation_score: Number(account.reputation_score || 0),
    reports_count: Number(account.reports_count || 0),
    createdAt: Number(account.createdAt || Date.now()),
    updatedAt: Number(account.updatedAt || Date.now()),
    lastLoginAt: Number(account.lastLoginAt || Date.now()),
  });
}

export async function lookupOrRegisterGoogleAccount(
  user: User,
  fallbackProfile: UserProfile
): Promise<{ isReturning: boolean; account: ReturningAccountRecord | null }> {
  if (
    !user ||
    user.isAnonymous ||
    !user.email ||
    !user.emailVerified ||
    (typeof navigator !== 'undefined' && !navigator.onLine)
  ) {
    return { isReturning: false, account: null };
  }

  const uid = user.uid;
  const email = user.email;
  const now = Date.now();
  const accountRef = doc(db, 'accounts', uid);

  try {
    let existing: ReturningAccountRecord | null = null;

    // 1. Direct lookup by UID
    try {
      const serverSnap = await getDocFromServer(accountRef);
      if (serverSnap.exists()) {
        existing = serverSnap.data() as ReturningAccountRecord;
      }
    } catch {
      const cachedSnap = await getDoc(accountRef);
      if (cachedSnap.exists()) {
        existing = cachedSnap.data() as ReturningAccountRecord;
      }
    }

    // 2. Explicit email lookup in /accounts to confirm returning email in system
    if (!existing) {
      try {
        const emailQuery = query(
          collection(db, 'accounts'),
          where('email', '==', email),
          where('ownerUid', '==', uid)
        );
        const qSnap = await getDocsFromServer(emailQuery);
        if (!qSnap.empty) {
          existing = qSnap.docs[0].data() as ReturningAccountRecord;
        }
      } catch {
        // Ignore query error and proceed to legacy commuter check
      }
    }

    if (existing) {
      const updatedAccount: ReturningAccountRecord = {
        ...existing,
        ownerUid: uid,
        email,
        lastLoginAt: now,
        updatedAt: Math.max(existing.updatedAt || 0, now),
      };
      await updateDoc(accountRef, {
        lastLoginAt: now,
        updatedAt: updatedAccount.updatedAt,
      });
      return { isReturning: true, account: updatedAccount };
    }

    // 3. Fallback check for pre-existing Google commuter profile owned by this UID
    let legacyCommuter: UserProfile | null = null;
    try {
      const commuterSnap = await getDocsFromServer(
        query(collection(db, 'commuters'), where('ownerUid', '==', uid))
      );
      if (!commuterSnap.empty) {
        legacyCommuter = commuterSnap.docs[0].data() as UserProfile;
      }
    } catch {
      // Ignore legacy commuter lookup errors
    }

    const baseName =
      legacyCommuter?.name ||
      fallbackProfile.name ||
      user.displayName ||
      undefined;
    const baseUsername =
      legacyCommuter?.username ||
      nonEmpty(fallbackProfile.username, 40) ||
      (user.displayName
        ? user.displayName.trim().replace(/\s+/g, '_').slice(0, 32)
        : email.split('@')[0].slice(0, 32));
    const baseHandle =
      legacyCommuter?.handle ||
      nonEmpty(fallbackProfile.handle, 45) ||
      `@${baseUsername.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;

    const newAccount: ReturningAccountRecord = {
      ownerUid: uid,
      email,
      primaryDeviceId: legacyCommuter?.device_id || fallbackProfile.device_id || uid,
      username: baseUsername,
      handle: baseHandle,
      name: baseName,
      avatarColor: legacyCommuter?.avatarColor || fallbackProfile.avatarColor || '#F27D26',
      commuterBadge: legacyCommuter?.commuterBadge || fallbackProfile.commuterBadge || 'Daily Commuter',
      role: (legacyCommuter?.role || fallbackProfile.role) === 'transporter' ? 'transporter' : 'commuter',
      reputation_score: Math.max(legacyCommuter?.reputation_score || 0, fallbackProfile.reputation_score || 100),
      reports_count: Math.max(legacyCommuter?.reports_count || 0, fallbackProfile.reports_count || 0),
      createdAt: legacyCommuter?.createdAt || fallbackProfile.createdAt || now,
      updatedAt: now,
      lastLoginAt: now,
    };

    await setDoc(accountRef, sanitizeAccountForCloud(newAccount));
    return { isReturning: !!legacyCommuter, account: newAccount };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `accounts/${uid}`);
  }
}

function sanitizeRouteForCloud(route: RouteItem, uid: string): Record<string, any> {
  return stripUndefined({
    id: route.id,
    name: (nonEmpty(route.name, 120) || 'Commuter Route'),
    origin: (nonEmpty(route.origin, 100) || 'Origin'),
    destination: (nonEmpty(route.destination, 100) || 'Destination'),
    city: (nonEmpty(route.city, 60) || 'Harare'),
    province: route.province !== undefined ? route.province.slice(0, 60) : undefined,
    category: route.category || 'cbd_location',
    distanceKm: typeof route.distanceKm === 'number' ? route.distanceKm : undefined,
    commonVehicle: route.commonVehicle !== undefined ? route.commonVehicle.slice(0, 100) : undefined,
    ranksServedIds: Array.isArray(route.ranksServedIds) ? route.ranksServedIds.slice(0, 20) : [],
    waypoints: Array.isArray(route.waypoints) ? route.waypoints.slice(0, 30) : [],
    createdByDeviceId: nonEmpty(route.createdByDeviceId, 128),
    createdByUsername: nonEmpty(route.createdByUsername, 40),
    ownerUid: uid,
    createdAt: Number(route.createdAt || Date.now()),
  });
}

function sanitizeFareForCloud(fare: FareReport, uid: string): Record<string, any> {
  return stripUndefined({
    id: fare.id,
    route_id: fare.route_id,
    fare_amount: Math.max(0.01, Number(fare.fare_amount)),
    currency: fare.currency,
    reported_at: Number(fare.reported_at),
    reporter_device_id: fare.reporter_device_id,
    ownerUid: uid,
    reporter_username: nonEmpty(fare.reporter_username, 40),
    reporter_badge: nonEmpty(fare.reporter_badge, 60),
    upvotes: Number(fare.upvotes || 0),
    downvotes: Number(fare.downvotes || 0),
    source: nonEmpty(fare.source, 20),
    transport_type: nonEmpty(fare.transport_type, 100),
    departure_status: nonEmpty(fare.departure_status, 120),
    route_name: nonEmpty(fare.route_name, 120),
    city: nonEmpty(fare.city, 60),
  });
}

function sanitizeStatusForCloud(status: StatusReport, uid: string): Record<string, any> {
  return stripUndefined({
    id: status.id,
    route_id: status.route_id,
    type: status.type,
    note: status.note !== undefined ? status.note.slice(0, 120) : undefined,
    reported_at: Number(status.reported_at),
    expires_at: Number(status.expires_at),
    reporter_device_id: status.reporter_device_id,
    ownerUid: uid,
    reporter_username: nonEmpty(status.reporter_username, 40),
    source: nonEmpty(status.source, 20),
  });
}

function sanitizeIntercityForCloud(rep: IntercityReport, uid: string): Record<string, any> {
  return stripUndefined({
    id: rep.id,
    routeId: rep.routeId,
    operatorId: rep.operatorId,
    operatorName: nonEmpty(rep.operatorName, 100) || 'Intercity Coach',
    farePaidUSD: Math.max(0.01, Number(rep.farePaidUSD)),
    farePaidZiG: typeof rep.farePaidZiG === 'number' ? rep.farePaidZiG : undefined,
    farePaidZAR: typeof rep.farePaidZAR === 'number' ? rep.farePaidZAR : undefined,
    departureTime: rep.departureTime !== undefined ? rep.departureTime.slice(0, 40) : undefined,
    departureTerminal: nonEmpty(rep.departureTerminal, 120) || 'Main Terminus',
    seatAvailability: rep.seatAvailability,
    busConditionRating: Math.min(5, Math.max(1, Number(rep.busConditionRating || 3))),
    roadStatusNote: rep.roadStatusNote !== undefined ? rep.roadStatusNote.slice(0, 150) : undefined,
    reportedAt: Number(rep.reportedAt),
    reporterDeviceId: rep.reporterDeviceId,
    ownerUid: uid,
    reporterUsername: nonEmpty(rep.reporterUsername, 40),
    upvotes: Number(rep.upvotes || 0),
    downvotes: Number(rep.downvotes || 0),
  });
}

function sanitizeIntercityRouteForCloud(route: IntercityRoute, uid: string): Record<string, any> {
  const minFare = Math.max(0.5, Number(route.fareRange?.min || route.averageFareUSD || 10));
  const maxFare = Math.max(minFare, Number(route.fareRange?.max || minFare));
  const avgFare = Math.max(0.5, Number(route.averageFareUSD || (minFare + maxFare) / 2));
  return stripUndefined({
    id: route.id,
    name: nonEmpty(route.name, 120) || 'Intercity Highway Corridor',
    originCity: nonEmpty(route.originCity, 60) || 'Harare',
    destinationCity: nonEmpty(route.destinationCity, 60) || 'Bulawayo',
    distanceKm: Math.min(10000, Math.max(1, Number(route.distanceKm || 100))),
    estimatedDurationHours: Math.min(200, Math.max(0.25, Number(route.estimatedDurationHours || 2))),
    highwayCode: nonEmpty(route.highwayCode, 40) || 'Highway Corridor',
    keyStops: Array.isArray(route.keyStops) ? route.keyStops.slice(0, 30) : [],
    departureHubs: Array.isArray(route.departureHubs) ? route.departureHubs.slice(0, 10) : [],
    operators: Array.isArray(route.operators) ? route.operators.slice(0, 30) : [],
    averageFareUSD: avgFare,
    fareRange: { min: minFare, max: maxFare },
    createdByDeviceId: nonEmpty(route.createdByDeviceId, 128),
    createdByUsername: nonEmpty(route.createdByUsername, 40),
    ownerUid: uid,
    createdAt: Number(route.createdAt || Date.now()),
  });
}

function sanitizeTransporterForCloud(t: TransporterProfile, uid: string): Record<string, any> {
  return stripUndefined({
    id: t.id,
    operatorName: nonEmpty(t.operatorName, 100) || 'Transporter',
    contactPhone: (nonEmpty(t.contactPhone, 40) || '0000').padEnd(4, '0'),
    transportType: t.transportType,
    transportTypeLabel: nonEmpty(t.transportTypeLabel, 80) || 'Commuter Vehicle',
    currentRouteName: nonEmpty(t.currentRouteName, 120) || 'Local Route',
    currentRouteId: nonEmpty(t.currentRouteId, 128),
    city: nonEmpty(t.city, 60) || 'Harare',
    vehiclePlate: t.vehiclePlate !== undefined ? t.vehiclePlate.slice(0, 30) : undefined,
    baseTerminus: t.baseTerminus !== undefined ? t.baseTerminus.slice(0, 100) : undefined,
    status: t.status,
    statusNote: t.statusNote !== undefined ? t.statusNote.slice(0, 160) : undefined,
    registeredAt: Number(t.registeredAt),
    lastRouteUpdate: Number(t.lastRouteUpdate),
    registeredByDeviceId: t.registeredByDeviceId,
    ownerUid: uid,
    username: nonEmpty(t.username, 40),
    userHandle: nonEmpty(t.userHandle, 45),
    likes: Number(t.likes || 0),
  });
}

function sanitizeSocialForCloud(item: CommuterSocialInteraction, uid: string): Record<string, any> {
  return stripUndefined({
    id: item.id,
    targetType: item.targetType,
    targetId: nonEmpty(item.targetId, 128) || 'general',
    targetName: nonEmpty(item.targetName, 120) || 'Commuter Buzz',
    postType: item.postType || (item.isAbuseReport ? 'abuse' : 'review'),
    username: nonEmpty(item.username, 40) || 'Commuter',
    userHandle: nonEmpty(item.userHandle, 45) || '@commuter',
    userBadge: nonEmpty(item.userBadge, 60) || 'Daily Commuter',
    avatarBg: nonEmpty(item.avatarBg, 20) || '#F27D26',
    comment: nonEmpty(item.comment, 500) || 'Commuter update',
    rating: typeof item.rating === 'number' ? item.rating : undefined,
    likes: Number(item.likes || 0),
    dislikes: Number(item.dislikes || 0),
    createdAt: Number(item.createdAt),
    updatedAt: item.updatedAt ? Number(item.updatedAt) : undefined,
    deviceId: item.deviceId,
    ownerUid: uid,
    mentionedHandles: Array.isArray(item.mentionedHandles) ? item.mentionedHandles.slice(0, 20) : undefined,
    mentionedDeviceIds: Array.isArray(item.mentionedDeviceIds) ? item.mentionedDeviceIds.slice(0, 20) : undefined,
    recommendedLocation: item.recommendedLocation !== undefined ? item.recommendedLocation.slice(0, 120) : undefined,
    recommendedCommuterUsername:
      item.recommendedCommuterUsername !== undefined
        ? item.recommendedCommuterUsername.slice(0, 60)
        : undefined,
    confirmedFare: item.confirmedFare ? stripUndefined(item.confirmedFare) : undefined,
    confirmedDepartureTime:
      item.confirmedDepartureTime !== undefined ? item.confirmedDepartureTime.slice(0, 80) : undefined,
    amenitiesReview: item.amenitiesReview ? stripUndefined(item.amenitiesReview) : undefined,
    isAbuseReport: typeof item.isAbuseReport === 'boolean' ? item.isAbuseReport : undefined,
    abuseType: nonEmpty(item.abuseType, 40),
    abuseLocation: item.abuseLocation !== undefined ? item.abuseLocation.slice(0, 100) : undefined,
    abusePlateNumber: item.abusePlateNumber !== undefined ? item.abusePlateNumber.slice(0, 30) : undefined,
  });
}

function sanitizeReplyForCloud(reply: SocialReply, uid: string): Record<string, any> {
  return stripUndefined({
    id: reply.id,
    interactionId: reply.interactionId,
    parentAuthorDeviceId: nonEmpty(reply.parentAuthorDeviceId, 128),
    parentAuthorUsername: nonEmpty(reply.parentAuthorUsername, 40),
    deviceId: reply.deviceId,
    ownerUid: uid,
    username: nonEmpty(reply.username, 40) || 'Commuter',
    userHandle: nonEmpty(reply.userHandle, 45) || '@commuter',
    userBadge: nonEmpty(reply.userBadge, 60) || 'Daily Commuter',
    avatarBg: nonEmpty(reply.avatarBg, 20) || '#F27D26',
    comment: nonEmpty(reply.comment, 500) || 'Reply',
    mentionedHandles: Array.isArray(reply.mentionedHandles) ? reply.mentionedHandles.slice(0, 20) : undefined,
    mentionedDeviceIds: Array.isArray(reply.mentionedDeviceIds) ? reply.mentionedDeviceIds.slice(0, 20) : undefined,
    createdAt: Number(reply.createdAt),
    updatedAt: reply.updatedAt ? Number(reply.updatedAt) : undefined,
  });
}

function sanitizeReactionForCloud(rec: SocialReactionRecord, uid: string): Record<string, any> {
  return stripUndefined({
    id: rec.id,
    targetType: rec.targetType,
    targetId: rec.targetId,
    reaction: rec.reaction,
    deviceId: rec.deviceId,
    ownerUid: uid,
    username: nonEmpty(rec.username, 40),
    createdAt: Number(rec.createdAt),
    updatedAt: Number(rec.updatedAt),
  });
}

function sanitizeNotificationForCloud(n: CommuterNotification, uid: string): Record<string, any> {
  return stripUndefined({
    id: n.id,
    type: n.type,
    recipientDeviceId: n.recipientDeviceId,
    recipientUid: nonEmpty(n.recipientUid, 128),
    senderDeviceId: n.senderDeviceId,
    senderUid: uid,
    senderUsername: nonEmpty(n.senderUsername, 40) || 'Commuter',
    senderHandle: nonEmpty(n.senderHandle, 45) || '@commuter',
    targetType: nonEmpty(n.targetType, 40) || 'buzz',
    targetId: nonEmpty(n.targetId, 128) || n.id,
    postId: nonEmpty(n.postId, 128),
    snippet: nonEmpty(n.snippet, 200) || 'New Commuter Buzz activity',
    read: Boolean(n.read),
    createdAt: Number(n.createdAt),
  });
}

function sanitizeBoardingForCloud(b: BoardingConfirmation, uid: string): Record<string, any> {
  return stripUndefined({
    id: b.id,
    rankId: b.rankId,
    rankName: nonEmpty(b.rankName, 120) || 'Rank',
    city: nonEmpty(b.city, 60) || 'Harare',
    deviceId: b.deviceId,
    ownerUid: uid,
    username: nonEmpty(b.username, 40) || 'Commuter',
    userHandle: nonEmpty(b.userHandle, 45) || '@commuter',
    statement: nonEmpty(b.statement, 120) || 'I boarded here',
    lat: typeof b.lat === 'number' ? b.lat : undefined,
    lng: typeof b.lng === 'number' ? b.lng : undefined,
    locationSource: nonEmpty(b.locationSource, 20),
    createdAt: Number(b.createdAt),
  });
}

function sanitizeLocationAnchorForCloud(anchor: LocationAnchor, uid: string): Record<string, any> {
  const rawAcc = Number(anchor.accuracyMeters);
  return stripUndefined({
    deviceId: anchor.deviceId,
    ownerUid: uid,
    username: nonEmpty(anchor.username, 40) || 'Commuter',
    lat: Number(anchor.lat),
    lng: Number(anchor.lng),
    name: nonEmpty(anchor.name, 120) || 'Current Location',
    source: anchor.source,
    accuracyMeters:
      typeof anchor.accuracyMeters === 'number' && Number.isFinite(rawAcc) && rawAcc >= 0
        ? rawAcc
        : undefined,
    nearestRankId: nonEmpty(anchor.nearestRankId, 128),
    nearestRankName: nonEmpty(anchor.nearestRankName, 120),
    timestamp: Number(anchor.timestamp) > 0 ? Number(anchor.timestamp) : Date.now(),
  });
}

async function getDocServerOrCache(ref: ReturnType<typeof doc>) {
  try {
    return await getDocFromServer(ref);
  } catch {
    return await getDoc(ref);
  }
}

async function safeDeleteCloudDoc(collectionName: string, docId: string, uid: string): Promise<void> {
  const ref = doc(db, collectionName, docId);
  const path = `${collectionName}/${docId}`;
  try {
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      return;
    }
    const data = existingSnap.data() as { ownerUid?: string } | undefined;
    if (data?.ownerUid && data.ownerUid !== uid) {
      return;
    }
    await deleteDoc(ref);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

async function safeUpdateCloudDoc(
  collectionName: string,
  docId: string,
  updates: Record<string, any>,
  uid: string
): Promise<void> {
  const ref = doc(db, collectionName, docId);
  const path = `${collectionName}/${docId}`;
  try {
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      return;
    }
    const data = existingSnap.data() as { ownerUid?: string } | undefined;
    if (data?.ownerUid && data.ownerUid !== uid) {
      return;
    }
    await updateDoc(ref, stripUndefined(updates));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function pushPendingWriteToCloud(item: PendingWrite): Promise<void> {
  const user = auth.currentUser || (await ensureCloudAuth(false));
  if (!user) {
    throw new Error('Sign in required for cloud sync (all edits saved safely in local SQLite).');
  }
  const uid = user.uid;
  const { type, payload } = item;

  switch (type) {
    case 'profile_update': {
      const targetDocId = payload.device_id || uid;
      let resolvedDocId = targetDocId;
      let path = `commuters/${targetDocId}`;
      try {
        const ref = doc(db, 'commuters', targetDocId);
        let activeSnap = await getDocServerOrCache(ref);

        if (activeSnap.exists()) {
          const existingData = activeSnap.data() as { ownerUid?: string } | undefined;
          if (existingData?.ownerUid !== uid) {
            // Device ID slot belongs to a different or legacy UID; store under uid-scoped doc cleanly
            resolvedDocId = uid;
            path = `commuters/${uid}`;
            activeSnap = await getDocServerOrCache(doc(db, 'commuters', uid));
          }
        }

        const sanitized = sanitizeCommuterForCloud({ ...payload, device_id: resolvedDocId }, uid);
        if (activeSnap.exists()) {
          const activeData = activeSnap.data() as {
            ownerUid?: string;
            device_id?: string;
            createdAt?: number;
          };
          if (activeData?.ownerUid === uid) {
            if (typeof activeData.createdAt === 'number' && activeData.createdAt > 0) {
              sanitized.createdAt = activeData.createdAt;
            }
            if (activeData.device_id) {
              sanitized.device_id = activeData.device_id;
            }
          }
        }

        await setDoc(doc(db, 'commuters', resolvedDocId), sanitized);

        if (!user.isAnonymous && user.email && user.emailVerified) {
          const accRef = doc(db, 'accounts', uid);
          const accSnap = await getDoc(accRef);
          if (accSnap.exists()) {
            const existingAcc = accSnap.data() as ReturningAccountRecord;
            await updateDoc(
              accRef,
              stripUndefined({
                primaryDeviceId: resolvedDocId,
                username: nonEmpty(payload.username, 40) || existingAcc.username,
                handle: nonEmpty(payload.handle, 45) || existingAcc.handle,
                name: payload.name !== undefined ? String(payload.name || '').slice(0, 60) : existingAcc.name,
                avatarColor: nonEmpty(payload.avatarColor, 20) || existingAcc.avatarColor,
                commuterBadge: nonEmpty(payload.commuterBadge, 60) || existingAcc.commuterBadge,
                role: payload.role === 'transporter' ? 'transporter' : 'commuter',
                reputation_score: Number(payload.reputation_score ?? existingAcc.reputation_score ?? 0),
                reports_count: Number(payload.reports_count ?? existingAcc.reports_count ?? 0),
                updatedAt: Number(payload.updatedAt || Date.now()),
                lastLoginAt: Date.now(),
              })
            );
          }
        }
        if (payload.phone !== undefined) {
          const privRef = doc(db, 'commuters', resolvedDocId, 'private', 'contact');
          const privSnap = await getDocServerOrCache(privRef);
          const privOwner = privSnap.exists()
            ? (privSnap.data() as { ownerUid?: string } | undefined)?.ownerUid
            : uid;
          if (!privSnap.exists() || privOwner === uid) {
            await setDoc(privRef, {
              device_id: resolvedDocId,
              ownerUid: uid,
              phone: String(payload.phone || '').slice(0, 40),
              updatedAt: Number(payload.updatedAt || Date.now()),
            });
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
      break;
    }

    case 'private_profile_update': {
      const targetDocId = payload.device_id || uid;
      let resolvedDocId = targetDocId;
      let path = `commuters/${targetDocId}/private/contact`;
      try {
        const parentSnap = await getDocServerOrCache(doc(db, 'commuters', targetDocId));
        if (parentSnap.exists() && (parentSnap.data() as { ownerUid?: string })?.ownerUid !== uid) {
          resolvedDocId = uid;
          path = `commuters/${uid}/private/contact`;
        }
        const ref = doc(db, 'commuters', resolvedDocId, 'private', 'contact');
        await setDoc(ref, {
          device_id: resolvedDocId,
          ownerUid: uid,
          phone: String(payload.phone || '').slice(0, 40),
          updatedAt: Number(payload.updatedAt) > 0 ? Number(payload.updatedAt) : Date.now(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
      break;
    }

    case 'add_route': {
      const { route, fare, status } = payload;
      try {
        if (route) {
          await setDoc(doc(db, 'routes', route.id), sanitizeRouteForCloud(route, uid), { merge: true });
        }
        if (fare) {
          await setDoc(doc(db, 'fare_reports', fare.id), sanitizeFareForCloud(fare, uid), { merge: true });
        }
        if (status) {
          await setDoc(doc(db, 'status_reports', status.id), sanitizeStatusForCloud(status, uid), { merge: true });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `routes/${route?.id || ''}`);
      }
      break;
    }

    case 'fare_report': {
      const path = `fare_reports/${payload.id}`;
      try {
        await setDoc(doc(db, 'fare_reports', payload.id), sanitizeFareForCloud(payload, uid), { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      break;
    }

    case 'fare_delete': {
      await safeDeleteCloudDoc('fare_reports', payload.id, uid);
      break;
    }

    case 'status_report': {
      const path = `status_reports/${payload.id}`;
      try {
        await setDoc(doc(db, 'status_reports', payload.id), sanitizeStatusForCloud(payload, uid), { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      break;
    }

    case 'status_delete': {
      await safeDeleteCloudDoc('status_reports', payload.id, uid);
      break;
    }

    case 'add_intercity_route': {
      const route = payload?.route || payload;
      const path = `intercity_routes/${route?.id || ''}`;
      try {
        if (route?.id) {
          await setDoc(doc(db, 'intercity_routes', route.id), sanitizeIntercityRouteForCloud(route, uid), {
            merge: true,
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      break;
    }

    case 'intercity_report': {
      const path = `intercity_reports/${payload.id}`;
      try {
        await setDoc(doc(db, 'intercity_reports', payload.id), sanitizeIntercityForCloud(payload, uid), {
          merge: true,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      break;
    }

    case 'intercity_delete': {
      await safeDeleteCloudDoc('intercity_reports', payload.id, uid);
      break;
    }

    case 'transporter_register': {
      const path = `transporters/${payload.id}`;
      try {
        await setDoc(doc(db, 'transporters', payload.id), sanitizeTransporterForCloud(payload, uid), {
          merge: true,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      break;
    }

    case 'transporter_update': {
      await safeUpdateCloudDoc('transporters', payload.id, payload.updates || {}, uid);
      break;
    }

    case 'transporter_delete': {
      await safeDeleteCloudDoc('transporters', payload.id, uid);
      break;
    }

    case 'social_interaction': {
      const path = `social_interactions/${payload.id}`;
      try {
        await setDoc(
          doc(db, 'social_interactions', payload.id),
          sanitizeSocialForCloud(payload, uid),
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      break;
    }

    case 'social_interaction_edit': {
      await safeUpdateCloudDoc('social_interactions', payload.id, payload.updates || {}, uid);
      break;
    }

    case 'social_interaction_delete': {
      await safeDeleteCloudDoc('social_interactions', payload.id, uid);
      break;
    }

    case 'social_reply': {
      const path = `social_replies/${payload.id}`;
      try {
        await setDoc(doc(db, 'social_replies', payload.id), sanitizeReplyForCloud(payload, uid), {
          merge: true,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      break;
    }

    case 'social_reply_edit': {
      await safeUpdateCloudDoc('social_replies', payload.id, payload.updates || {}, uid);
      break;
    }

    case 'social_reply_delete': {
      await safeDeleteCloudDoc('social_replies', payload.id, uid);
      break;
    }

    case 'social_reaction_record': {
      const path = `social_reactions/${payload.id}`;
      try {
        await setDoc(
          doc(db, 'social_reactions', payload.id),
          sanitizeReactionForCloud(payload, uid),
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
      break;
    }

    case 'social_reaction_delete': {
      await safeDeleteCloudDoc('social_reactions', payload.id, uid);
      break;
    }

    case 'notification_create': {
      const path = `notifications/${payload.id}`;
      try {
        await setDoc(
          doc(db, 'notifications', payload.id),
          sanitizeNotificationForCloud(payload, uid),
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      break;
    }

    case 'notification_update': {
      const path = `notifications/${payload.id}`;
      try {
        const ref = doc(db, 'notifications', payload.id);
        const snap = await getDoc(ref);
        if (!snap.exists()) break;
        const data = snap.data() as { recipientUid?: string };
        if (data?.recipientUid !== uid) break;
        await updateDoc(ref, { read: Boolean(payload.read) });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
      break;
    }

    case 'boarding_confirmation': {
      const path = `boarding_confirmations/${payload.id}`;
      try {
        await setDoc(
          doc(db, 'boarding_confirmations', payload.id),
          sanitizeBoardingForCloud(payload, uid),
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      break;
    }

    case 'location_anchor': {
      const targetAnchorId = payload.deviceId || uid;
      let resolvedAnchorId = targetAnchorId;
      let path = `location_anchors/${targetAnchorId}`;
      try {
        const ref = doc(db, 'location_anchors', targetAnchorId);
        const existingSnap = await getDocServerOrCache(ref);
        if (existingSnap.exists()) {
          const existingData = existingSnap.data() as { ownerUid?: string } | undefined;
          if (existingData?.ownerUid !== uid) {
            resolvedAnchorId = uid;
            path = `location_anchors/${uid}`;
          }
        }
        await setDoc(
          doc(db, 'location_anchors', resolvedAnchorId),
          sanitizeLocationAnchorForCloud({ ...payload, deviceId: resolvedAnchorId }, uid)
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
      break;
    }

    // Legacy vote types (no-op / migrated to social_reaction_record)
    case 'fare_vote':
    case 'intercity_vote':
    case 'transporter_like':
    case 'social_reaction':
      break;
  }
}

export async function pullAllFromCloud(currentDeviceId?: string): Promise<CloudSnapshotData> {
  const fetchCollection = async <T>(name: string): Promise<{ items: T[]; ok: boolean }> => {
    try {
      const snap = await getDocsFromServer(collection(db, name));
      return { items: snap.docs.map((d) => d.data() as T), ok: true };
    } catch {
      try {
        const snap = await getDocs(collection(db, name));
        return { items: snap.docs.map((d) => d.data() as T), ok: true };
      } catch {
        return { items: [], ok: false };
      }
    }
  };

  const uid = auth.currentUser?.uid || null;

  const fetchNotifications = async (): Promise<{ items: CommuterNotification[]; ok: boolean }> => {
    if (!uid) return { items: [], ok: false };
    try {
      const q = query(collection(db, 'notifications'), where('recipientUid', '==', uid));
      const snap = await getDocsFromServer(q);
      return { items: snap.docs.map((d) => d.data() as CommuterNotification), ok: true };
    } catch {
      try {
        const snap = await getDocs(
          query(collection(db, 'notifications'), where('recipientUid', '==', uid))
        );
        return { items: snap.docs.map((d) => d.data() as CommuterNotification), ok: true };
      } catch {
        return { items: [], ok: false };
      }
    }
  };

  const fetchPrivatePhone = async (): Promise<string | undefined> => {
    if (!uid || !currentDeviceId) return undefined;
    try {
      const snap = await getDoc(doc(db, 'commuters', currentDeviceId, 'private', 'contact'));
      if (snap.exists()) {
        const data = snap.data() as { phone?: string };
        return data.phone;
      }
      return undefined;
    } catch {
      return undefined;
    }
  };

  const [
    commutersRes,
    routesRes,
    fareReportsRes,
    statusReportsRes,
    intercityRoutesRes,
    intercityReportsRes,
    transportersRes,
    socialInteractionsRes,
    socialRepliesRes,
    socialReactionsRes,
    notificationsRes,
    boardingConfirmationsRes,
    locationAnchorsRes,
    privatePhone,
  ] = await Promise.all([
    fetchCollection<UserProfile>('commuters'),
    fetchCollection<RouteItem>('routes'),
    fetchCollection<FareReport>('fare_reports'),
    fetchCollection<StatusReport>('status_reports'),
    fetchCollection<IntercityRoute>('intercity_routes'),
    fetchCollection<IntercityReport>('intercity_reports'),
    fetchCollection<TransporterProfile>('transporters'),
    fetchCollection<CommuterSocialInteraction>('social_interactions'),
    fetchCollection<SocialReply>('social_replies'),
    fetchCollection<SocialReactionRecord>('social_reactions'),
    fetchNotifications(),
    fetchCollection<BoardingConfirmation>('boarding_confirmations'),
    fetchCollection<LocationAnchor>('location_anchors'),
    fetchPrivatePhone(),
  ]);

  return {
    commuters: commutersRes.items,
    routes: routesRes.items,
    fareReports: fareReportsRes.items,
    statusReports: statusReportsRes.items,
    intercityRoutes: intercityRoutesRes.items,
    intercityReports: intercityReportsRes.items,
    transporters: transportersRes.items,
    socialInteractions: socialInteractionsRes.items,
    socialReplies: socialRepliesRes.items,
    socialReactions: socialReactionsRes.items,
    notifications: notificationsRes.items,
    boardingConfirmations: boardingConfirmationsRes.items,
    locationAnchors: locationAnchorsRes.items,
    privatePhone,
    authoritative: {
      commuters: commutersRes.ok,
      routes: routesRes.ok,
      fareReports: fareReportsRes.ok,
      statusReports: statusReportsRes.ok,
      intercityRoutes: intercityRoutesRes.ok,
      intercityReports: intercityReportsRes.ok,
      transporters: transportersRes.ok,
      socialInteractions: socialInteractionsRes.ok,
      socialReplies: socialRepliesRes.ok,
      socialReactions: socialReactionsRes.ok,
      notifications: notificationsRes.ok,
      boardingConfirmations: boardingConfirmationsRes.ok,
      locationAnchors: locationAnchorsRes.ok,
    },
  };
}

export async function deletePersonalCloudProfile(deviceId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
  const uid = user.uid;

  const tryDeleteOwnedDoc = async (refPath: string, docRef: ReturnType<typeof doc>) => {
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) return;
      const data = snap.data() as { ownerUid?: string } | undefined;
      if (data?.ownerUid === uid) {
        await deleteDoc(docRef);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, refPath);
    }
  };

  await Promise.allSettled([
    tryDeleteOwnedDoc(`commuters/${deviceId}/private/contact`, doc(db, 'commuters', deviceId, 'private', 'contact')),
    tryDeleteOwnedDoc(`commuters/${deviceId}`, doc(db, 'commuters', deviceId)),
    uid !== deviceId
      ? tryDeleteOwnedDoc(`commuters/${uid}`, doc(db, 'commuters', uid))
      : Promise.resolve(),
    tryDeleteOwnedDoc(`location_anchors/${deviceId}`, doc(db, 'location_anchors', deviceId)),
  ]);
}

export function subscribeToCloudCollections(
  onCollectionUpdate: <K extends keyof CloudSnapshotData>(key: K, data: CloudSnapshotData[K]) => void,
  uid?: string | null
): () => void {
  const unsubs: Unsubscribe[] = [];

  const attach = <T>(path: string, key: keyof CloudSnapshotData) => {
    const unsub = onSnapshot(
      collection(db, path),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as T);
        onCollectionUpdate(key, items as any);
      },
      () => {
        // Ignore transient offline listener warnings
      }
    );
    unsubs.push(unsub);
  };

  attach<UserProfile>('commuters', 'commuters');
  attach<RouteItem>('routes', 'routes');
  attach<FareReport>('fare_reports', 'fareReports');
  attach<StatusReport>('status_reports', 'statusReports');
  attach<IntercityRoute>('intercity_routes', 'intercityRoutes');
  attach<IntercityReport>('intercity_reports', 'intercityReports');
  attach<TransporterProfile>('transporters', 'transporters');
  attach<CommuterSocialInteraction>('social_interactions', 'socialInteractions');
  attach<SocialReply>('social_replies', 'socialReplies');
  attach<SocialReactionRecord>('social_reactions', 'socialReactions');
  attach<BoardingConfirmation>('boarding_confirmations', 'boardingConfirmations');
  attach<LocationAnchor>('location_anchors', 'locationAnchors');

  if (uid) {
    const notifUnsub = onSnapshot(
      query(collection(db, 'notifications'), where('recipientUid', '==', uid)),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as CommuterNotification);
        onCollectionUpdate('notifications', items);
      },
      () => {
        // Ignore transient listener warning
      }
    );
    unsubs.push(notifUnsub);
  }

  return () => {
    unsubs.forEach((u) => u());
  };
}
