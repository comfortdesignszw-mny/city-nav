import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
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
  intercityReports: IntercityReport[];
  transporters: TransporterProfile[];
  socialInteractions: CommuterSocialInteraction[];
  socialReplies: SocialReply[];
  socialReactions: SocialReactionRecord[];
  notifications: CommuterNotification[];
  boardingConfirmations: BoardingConfirmation[];
  locationAnchors: LocationAnchor[];
  privatePhone?: string;
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

function sanitizeCommuterForCloud(profile: UserProfile, uid: string): Record<string, any> {
  return stripUndefined({
    device_id: profile.device_id,
    userId: (profile.userId || uid).slice(0, 128),
    ownerUid: uid,
    username: (profile.username || 'Commuter').slice(0, 40),
    handle: (profile.handle || '@commuter').slice(0, 45),
    name: profile.name ? profile.name.slice(0, 60) : undefined,
    avatarColor: (profile.avatarColor || '#F27D26').slice(0, 20),
    commuterBadge: (profile.commuterBadge || 'Daily Commuter').slice(0, 60),
    role: profile.role === 'transporter' ? 'transporter' : 'commuter',
    reputation_score: Number(profile.reputation_score || 0),
    reports_count: Number(profile.reports_count || 0),
    createdAt: Number(profile.createdAt || Date.now()),
    updatedAt: Number(profile.updatedAt || Date.now()),
  });
}

function sanitizeRouteForCloud(route: RouteItem, uid: string): Record<string, any> {
  return stripUndefined({
    id: route.id,
    name: route.name.slice(0, 120),
    origin: route.origin.slice(0, 100),
    destination: route.destination.slice(0, 100),
    city: route.city.slice(0, 60),
    province: route.province ? route.province.slice(0, 60) : undefined,
    category: route.category || 'cbd_location',
    distanceKm: typeof route.distanceKm === 'number' ? route.distanceKm : undefined,
    commonVehicle: route.commonVehicle ? route.commonVehicle.slice(0, 100) : undefined,
    ranksServedIds: Array.isArray(route.ranksServedIds) ? route.ranksServedIds.slice(0, 20) : [],
    waypoints: Array.isArray(route.waypoints) ? route.waypoints.slice(0, 30) : [],
    createdByDeviceId: route.createdByDeviceId,
    createdByUsername: route.createdByUsername ? route.createdByUsername.slice(0, 40) : undefined,
    ownerUid: uid,
    createdAt: Number(route.createdAt || Date.now()),
  });
}

function sanitizeFareForCloud(fare: FareReport, uid: string): Record<string, any> {
  return stripUndefined({
    id: fare.id,
    route_id: fare.route_id,
    fare_amount: Number(fare.fare_amount),
    currency: fare.currency,
    reported_at: Number(fare.reported_at),
    reporter_device_id: fare.reporter_device_id,
    ownerUid: uid,
    reporter_username: fare.reporter_username ? fare.reporter_username.slice(0, 40) : undefined,
    reporter_badge: fare.reporter_badge ? fare.reporter_badge.slice(0, 60) : undefined,
    upvotes: Number(fare.upvotes || 0),
    downvotes: Number(fare.downvotes || 0),
    source: fare.source ? fare.source.slice(0, 20) : undefined,
    transport_type: fare.transport_type ? fare.transport_type.slice(0, 100) : undefined,
    departure_status: fare.departure_status ? fare.departure_status.slice(0, 120) : undefined,
    route_name: fare.route_name ? fare.route_name.slice(0, 120) : undefined,
    city: fare.city ? fare.city.slice(0, 60) : undefined,
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
    reporter_username: status.reporter_username ? status.reporter_username.slice(0, 40) : undefined,
    source: status.source ? status.source.slice(0, 20) : undefined,
  });
}

function sanitizeIntercityForCloud(rep: IntercityReport, uid: string): Record<string, any> {
  return stripUndefined({
    id: rep.id,
    routeId: rep.routeId,
    operatorId: rep.operatorId,
    operatorName: rep.operatorName.slice(0, 100),
    farePaidUSD: Number(rep.farePaidUSD),
    farePaidZiG: typeof rep.farePaidZiG === 'number' ? rep.farePaidZiG : undefined,
    farePaidZAR: typeof rep.farePaidZAR === 'number' ? rep.farePaidZAR : undefined,
    departureTime: rep.departureTime ? rep.departureTime.slice(0, 40) : undefined,
    departureTerminal: rep.departureTerminal.slice(0, 120),
    seatAvailability: rep.seatAvailability,
    busConditionRating: Number(rep.busConditionRating),
    roadStatusNote: rep.roadStatusNote ? rep.roadStatusNote.slice(0, 150) : undefined,
    reportedAt: Number(rep.reportedAt),
    reporterDeviceId: rep.reporterDeviceId,
    ownerUid: uid,
    reporterUsername: rep.reporterUsername ? rep.reporterUsername.slice(0, 40) : undefined,
    upvotes: Number(rep.upvotes || 0),
    downvotes: Number(rep.downvotes || 0),
  });
}

function sanitizeTransporterForCloud(t: TransporterProfile, uid: string): Record<string, any> {
  return stripUndefined({
    id: t.id,
    operatorName: t.operatorName.slice(0, 100),
    contactPhone: t.contactPhone.slice(0, 40),
    transportType: t.transportType,
    transportTypeLabel: t.transportTypeLabel.slice(0, 80),
    currentRouteName: t.currentRouteName.slice(0, 120),
    currentRouteId: t.currentRouteId,
    city: t.city.slice(0, 60),
    vehiclePlate: t.vehiclePlate ? t.vehiclePlate.slice(0, 30) : undefined,
    baseTerminus: t.baseTerminus ? t.baseTerminus.slice(0, 100) : undefined,
    status: t.status,
    statusNote: t.statusNote ? t.statusNote.slice(0, 160) : undefined,
    registeredAt: Number(t.registeredAt),
    lastRouteUpdate: Number(t.lastRouteUpdate),
    registeredByDeviceId: t.registeredByDeviceId,
    ownerUid: uid,
    username: t.username ? t.username.slice(0, 40) : undefined,
    userHandle: t.userHandle ? t.userHandle.slice(0, 45) : undefined,
    likes: Number(t.likes || 0),
  });
}

function sanitizeSocialForCloud(item: CommuterSocialInteraction, uid: string): Record<string, any> {
  return stripUndefined({
    id: item.id,
    targetType: item.targetType,
    targetId: item.targetId,
    targetName: item.targetName.slice(0, 120),
    postType: item.postType || (item.isAbuseReport ? 'abuse' : 'review'),
    username: item.username.slice(0, 40),
    userHandle: item.userHandle.slice(0, 45),
    userBadge: (item.userBadge || 'Daily Commuter').slice(0, 60),
    avatarBg: (item.avatarBg || '#F27D26').slice(0, 20),
    comment: item.comment.slice(0, 500),
    rating: typeof item.rating === 'number' ? item.rating : undefined,
    likes: Number(item.likes || 0),
    dislikes: Number(item.dislikes || 0),
    createdAt: Number(item.createdAt),
    updatedAt: item.updatedAt ? Number(item.updatedAt) : undefined,
    deviceId: item.deviceId,
    ownerUid: uid,
    mentionedHandles: Array.isArray(item.mentionedHandles) ? item.mentionedHandles.slice(0, 20) : undefined,
    mentionedDeviceIds: Array.isArray(item.mentionedDeviceIds) ? item.mentionedDeviceIds.slice(0, 20) : undefined,
    recommendedLocation: item.recommendedLocation ? item.recommendedLocation.slice(0, 120) : undefined,
    recommendedCommuterUsername: item.recommendedCommuterUsername
      ? item.recommendedCommuterUsername.slice(0, 60)
      : undefined,
    confirmedFare: item.confirmedFare ? stripUndefined(item.confirmedFare) : undefined,
    confirmedDepartureTime: item.confirmedDepartureTime
      ? item.confirmedDepartureTime.slice(0, 80)
      : undefined,
    amenitiesReview: item.amenitiesReview ? stripUndefined(item.amenitiesReview) : undefined,
    isAbuseReport: typeof item.isAbuseReport === 'boolean' ? item.isAbuseReport : undefined,
    abuseType: item.abuseType ? item.abuseType.slice(0, 40) : undefined,
    abuseLocation: item.abuseLocation ? item.abuseLocation.slice(0, 100) : undefined,
    abusePlateNumber: item.abusePlateNumber ? item.abusePlateNumber.slice(0, 30) : undefined,
  });
}

function sanitizeReplyForCloud(reply: SocialReply, uid: string): Record<string, any> {
  return stripUndefined({
    id: reply.id,
    interactionId: reply.interactionId,
    parentAuthorDeviceId: reply.parentAuthorDeviceId,
    parentAuthorUsername: reply.parentAuthorUsername ? reply.parentAuthorUsername.slice(0, 40) : undefined,
    deviceId: reply.deviceId,
    ownerUid: uid,
    username: reply.username.slice(0, 40),
    userHandle: reply.userHandle.slice(0, 45),
    userBadge: (reply.userBadge || 'Daily Commuter').slice(0, 60),
    avatarBg: (reply.avatarBg || '#F27D26').slice(0, 20),
    comment: reply.comment.slice(0, 500),
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
    username: rec.username ? rec.username.slice(0, 40) : undefined,
    createdAt: Number(rec.createdAt),
    updatedAt: Number(rec.updatedAt),
  });
}

function sanitizeNotificationForCloud(n: CommuterNotification, uid: string): Record<string, any> {
  return stripUndefined({
    id: n.id,
    type: n.type,
    recipientDeviceId: n.recipientDeviceId,
    recipientUid: n.recipientUid || undefined,
    senderDeviceId: n.senderDeviceId,
    senderUid: uid,
    senderUsername: n.senderUsername.slice(0, 40),
    senderHandle: n.senderHandle.slice(0, 45),
    targetType: n.targetType.slice(0, 40),
    targetId: n.targetId.slice(0, 128),
    postId: n.postId ? n.postId.slice(0, 128) : undefined,
    snippet: n.snippet.slice(0, 200),
    read: Boolean(n.read),
    createdAt: Number(n.createdAt),
  });
}

function sanitizeBoardingForCloud(b: BoardingConfirmation, uid: string): Record<string, any> {
  return stripUndefined({
    id: b.id,
    rankId: b.rankId,
    rankName: b.rankName.slice(0, 120),
    city: b.city.slice(0, 60),
    deviceId: b.deviceId,
    ownerUid: uid,
    username: b.username.slice(0, 40),
    userHandle: b.userHandle.slice(0, 45),
    statement: b.statement.slice(0, 120),
    lat: typeof b.lat === 'number' ? b.lat : undefined,
    lng: typeof b.lng === 'number' ? b.lng : undefined,
    locationSource: b.locationSource,
    createdAt: Number(b.createdAt),
  });
}

function sanitizeLocationAnchorForCloud(anchor: LocationAnchor, uid: string): Record<string, any> {
  return stripUndefined({
    deviceId: anchor.deviceId,
    ownerUid: uid,
    username: anchor.username.slice(0, 40),
    lat: Number(anchor.lat),
    lng: Number(anchor.lng),
    name: anchor.name.slice(0, 120),
    source: anchor.source,
    accuracyMeters: typeof anchor.accuracyMeters === 'number' ? anchor.accuracyMeters : undefined,
    nearestRankId: anchor.nearestRankId,
    nearestRankName: anchor.nearestRankName ? anchor.nearestRankName.slice(0, 120) : undefined,
    timestamp: Number(anchor.timestamp),
  });
}

export async function pushPendingWriteToCloud(item: PendingWrite): Promise<void> {
  const user = auth.currentUser || (await ensureCloudAuth());
  if (!user) {
    throw new Error('Sign in required for cloud sync (all edits saved safely in local SQLite).');
  }
  const uid = user.uid;
  const { type, payload } = item;

  switch (type) {
    case 'profile_update': {
      const path = `commuters/${payload.device_id}`;
      try {
        await setDoc(doc(db, 'commuters', payload.device_id), sanitizeCommuterForCloud(payload, uid), {
          merge: true,
        });
        if (payload.phone !== undefined) {
          await setDoc(
            doc(db, 'commuters', payload.device_id, 'private', 'contact'),
            stripUndefined({
              device_id: payload.device_id,
              ownerUid: uid,
              phone: String(payload.phone || '').slice(0, 40),
              updatedAt: Number(payload.updatedAt || Date.now()),
            }),
            { merge: true }
          );
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
      break;
    }

    case 'private_profile_update': {
      const path = `commuters/${payload.device_id}/private/contact`;
      try {
        await setDoc(
          doc(db, 'commuters', payload.device_id, 'private', 'contact'),
          stripUndefined({
            device_id: payload.device_id,
            ownerUid: uid,
            phone: String(payload.phone || '').slice(0, 40),
            updatedAt: Number(payload.updatedAt || Date.now()),
          }),
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
      break;
    }

    case 'add_route': {
      const { route, fare, status } = payload;
      try {
        if (route) {
          await setDoc(doc(db, 'routes', route.id), sanitizeRouteForCloud(route, uid));
        }
        if (fare) {
          await setDoc(doc(db, 'fare_reports', fare.id), sanitizeFareForCloud(fare, uid));
        }
        if (status) {
          await setDoc(doc(db, 'status_reports', status.id), sanitizeStatusForCloud(status, uid));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `routes/${route?.id || ''}`);
      }
      break;
    }

    case 'fare_report': {
      const path = `fare_reports/${payload.id}`;
      try {
        await setDoc(doc(db, 'fare_reports', payload.id), sanitizeFareForCloud(payload, uid));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      break;
    }

    case 'fare_delete': {
      const path = `fare_reports/${payload.id}`;
      try {
        await deleteDoc(doc(db, 'fare_reports', payload.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
      break;
    }

    case 'status_report': {
      const path = `status_reports/${payload.id}`;
      try {
        await setDoc(doc(db, 'status_reports', payload.id), sanitizeStatusForCloud(payload, uid));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      break;
    }

    case 'status_delete': {
      const path = `status_reports/${payload.id}`;
      try {
        await deleteDoc(doc(db, 'status_reports', payload.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
      break;
    }

    case 'intercity_report': {
      const path = `intercity_reports/${payload.id}`;
      try {
        await setDoc(doc(db, 'intercity_reports', payload.id), sanitizeIntercityForCloud(payload, uid));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      break;
    }

    case 'intercity_delete': {
      const path = `intercity_reports/${payload.id}`;
      try {
        await deleteDoc(doc(db, 'intercity_reports', payload.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
      break;
    }

    case 'transporter_register': {
      const path = `transporters/${payload.id}`;
      try {
        await setDoc(doc(db, 'transporters', payload.id), sanitizeTransporterForCloud(payload, uid));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      break;
    }

    case 'transporter_update': {
      const path = `transporters/${payload.id}`;
      try {
        await updateDoc(doc(db, 'transporters', payload.id), stripUndefined(payload.updates));
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
      break;
    }

    case 'transporter_delete': {
      const path = `transporters/${payload.id}`;
      try {
        await deleteDoc(doc(db, 'transporters', payload.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
      break;
    }

    case 'social_interaction': {
      const path = `social_interactions/${payload.id}`;
      try {
        await setDoc(
          doc(db, 'social_interactions', payload.id),
          sanitizeSocialForCloud(payload, uid)
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      break;
    }

    case 'social_interaction_edit': {
      const path = `social_interactions/${payload.id}`;
      try {
        await updateDoc(doc(db, 'social_interactions', payload.id), stripUndefined(payload.updates));
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
      break;
    }

    case 'social_interaction_delete': {
      const path = `social_interactions/${payload.id}`;
      try {
        await deleteDoc(doc(db, 'social_interactions', payload.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
      break;
    }

    case 'social_reply': {
      const path = `social_replies/${payload.id}`;
      try {
        await setDoc(doc(db, 'social_replies', payload.id), sanitizeReplyForCloud(payload, uid));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      break;
    }

    case 'social_reply_edit': {
      const path = `social_replies/${payload.id}`;
      try {
        await updateDoc(doc(db, 'social_replies', payload.id), stripUndefined(payload.updates));
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
      break;
    }

    case 'social_reply_delete': {
      const path = `social_replies/${payload.id}`;
      try {
        await deleteDoc(doc(db, 'social_replies', payload.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
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
      const path = `social_reactions/${payload.id}`;
      try {
        await deleteDoc(doc(db, 'social_reactions', payload.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
      break;
    }

    case 'notification_create': {
      const path = `notifications/${payload.id}`;
      try {
        await setDoc(
          doc(db, 'notifications', payload.id),
          sanitizeNotificationForCloud(payload, uid)
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      break;
    }

    case 'notification_update': {
      const path = `notifications/${payload.id}`;
      try {
        await updateDoc(doc(db, 'notifications', payload.id), {
          read: Boolean(payload.read),
        });
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
          sanitizeBoardingForCloud(payload, uid)
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      break;
    }

    case 'location_anchor': {
      const path = `location_anchors/${payload.deviceId}`;
      try {
        await setDoc(
          doc(db, 'location_anchors', payload.deviceId),
          sanitizeLocationAnchorForCloud(payload, uid),
          { merge: true }
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
  const fetchCollection = async <T>(name: string): Promise<T[]> => {
    try {
      const snap = await getDocs(collection(db, name));
      return snap.docs.map((d) => d.data() as T);
    } catch {
      return [];
    }
  };

  const uid = auth.currentUser?.uid || null;

  const fetchNotifications = async (): Promise<CommuterNotification[]> => {
    if (!uid) return [];
    try {
      const snap = await getDocs(
        query(collection(db, 'notifications'), where('recipientUid', '==', uid))
      );
      return snap.docs.map((d) => d.data() as CommuterNotification);
    } catch {
      return [];
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
    commuters,
    routes,
    fareReports,
    statusReports,
    intercityReports,
    transporters,
    socialInteractions,
    socialReplies,
    socialReactions,
    notifications,
    boardingConfirmations,
    locationAnchors,
    privatePhone,
  ] = await Promise.all([
    fetchCollection<UserProfile>('commuters'),
    fetchCollection<RouteItem>('routes'),
    fetchCollection<FareReport>('fare_reports'),
    fetchCollection<StatusReport>('status_reports'),
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
    commuters,
    routes,
    fareReports,
    statusReports,
    intercityReports,
    transporters,
    socialInteractions,
    socialReplies,
    socialReactions,
    notifications,
    boardingConfirmations,
    locationAnchors,
    privatePhone,
  };
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
