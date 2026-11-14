export type Currency = 'USD' | 'ZWG' | 'ZAR' | 'ZWL' | 'BWP';
export type DisplayCurrency = 'USD' | 'ZWG' | 'ZAR';

export type StatusType = 
  | 'running'
  | 'delayed'
  | 'diverted'
  | 'police_blitz'
  | 'fuel_shortage';

export interface Waypoint {
  name: string;
  lat: number;
  lng: number;
  landmark?: string;
}

export type RouteCategory = 'cbd_location' | 'near_town' | 'inter_city';

export interface RouteItem {
  id: string;
  name: string; // e.g. "Mbare–CBD", "Bulawayo–Gwanda"
  origin: string;
  destination: string;
  waypoints: Waypoint[];
  city: string; // e.g. "Harare", "Bulawayo", "Gweru", etc.
  province?: string;
  category?: RouteCategory;
  distanceKm?: number;
  commonVehicle?: string;
  ranksServedIds: string[];
  createdByDeviceId?: string;
  createdByUsername?: string;
  ownerUid?: string;
  createdAt?: number;
}

export type TransporterVehicleType = 
  | 'hiace_combi' // HiAce (Combi)
  | 'mushikashika' // Mushikashika (small taxis / Wish / Sienta)
  | 'sprinter' // Sprinters (22 Seaters)
  | 'sprinter_22' // Sprinters (22 Seaters)
  | 'intercity_coach' // Long Distance Coaches
  | 'long_distance_coach' // Long Distance Coaches
  | 'cross_border_quantum' // Cross-boarder Quantum
  | 'metered_taxi'; // Metered City Taxi / Cab

export interface TransporterProfile {
  id: string;
  operatorName: string; // Name or Transport Business Name
  contactPhone: string; // Phone number with WhatsApp capability
  transportType: TransporterVehicleType;
  transportTypeLabel: string; // Readable label
  currentRouteName: string; // Route they always serve
  currentRouteId?: string;
  city: string;
  vehiclePlate?: string; // e.g. "AEK 3942"
  baseTerminus?: string; // e.g. "Egodini Rank", "Copacabana"
  status: 'active' | 'loading' | 'available_hire' | 'off_duty';
  statusNote?: string;
  registeredAt: number;
  lastRouteUpdate: number;
  registeredByDeviceId: string;
  ownerUid?: string;
  username?: string;
  userHandle?: string;
  likes: number;
  userLiked?: boolean;
}

export type AbuseCategory = 
  | 'overcharging' 
  | 'reckless_driving' 
  | 'tout_harassment' 
  | 'overloading' 
  | 'refusing_currency' 
  | 'off_route'
  | 'off_route_drop'
  | 'breakdown_no_refund'
  | 'poor_cleanliness';

export interface AmenityFeedback {
  ac?: boolean;
  usb?: boolean;
  wifi?: boolean;
  reclining?: boolean;
  luggage?: boolean;
  toilet?: boolean;
  refreshments?: boolean;
  tv?: boolean;
  acWorking?: boolean;
  usbCharging?: boolean;
  wifiWorking?: boolean;
  luggageSecurity?: boolean;
  cleanliness?: number;
  punctuality?: number;
}

export type SocialTargetType = 'route' | 'intercity' | 'operator' | 'rank' | 'transporter' | 'commuter';
export type SocialPostType = 'conversation' | 'question' | 'recommendation' | 'review' | 'abuse';

export interface CommuterSocialInteraction {
  id: string;
  targetType: SocialTargetType;
  targetId: string;
  targetName: string;
  postType?: SocialPostType;
  username: string;
  userHandle: string;
  userBadge: string;
  avatarBg: string;
  comment: string;
  rating?: number; // 1-5 stars
  likes: number;
  dislikes: number;
  userReaction?: 'like' | 'dislike';
  createdAt: number;
  updatedAt?: number;
  deviceId: string;
  ownerUid?: string;
  mentionedHandles?: string[];
  mentionedDeviceIds?: string[];
  recommendedLocation?: string;
  recommendedCommuterUsername?: string;
  
  // Optional enrichments
  confirmedFare?: {
    amount: number;
    currency: Currency;
  };
  confirmedDepartureTime?: string;
  amenitiesReview?: AmenityFeedback;
  isAbuseReport?: boolean;
  abuseType?: AbuseCategory;
  abuseLocation?: string;
  abusePlateNumber?: string;
}

export interface SocialReply {
  id: string;
  interactionId: string;
  parentAuthorDeviceId?: string;
  parentAuthorUsername?: string;
  deviceId: string;
  ownerUid?: string;
  username: string;
  userHandle: string;
  userBadge: string;
  avatarBg: string;
  comment: string;
  mentionedHandles?: string[];
  mentionedDeviceIds?: string[];
  createdAt: number;
  updatedAt?: number;
}

export type ReactionTargetType = 'fare' | 'intercity' | 'transporter' | 'social';

export interface SocialReactionRecord {
  id: string; // `${targetType}_${targetId}_${deviceId}`
  targetType: ReactionTargetType;
  targetId: string;
  reaction: 'up' | 'down' | 'like' | 'dislike';
  deviceId: string;
  ownerUid?: string;
  username?: string;
  createdAt: number;
  updatedAt: number;
}

export type NotificationType = 'reply' | 'tag' | 'like' | 'rating';

export interface CommuterNotification {
  id: string;
  type: NotificationType;
  recipientDeviceId: string;
  recipientUid?: string;
  senderDeviceId: string;
  senderUid?: string;
  senderUsername: string;
  senderHandle: string;
  targetType: string;
  targetId: string;
  postId?: string;
  snippet: string;
  read: boolean;
  createdAt: number;
}

export interface BoardingConfirmation {
  id: string;
  rankId: string;
  rankName: string;
  city: string;
  deviceId: string;
  ownerUid?: string;
  username: string;
  userHandle: string;
  statement: string; // e.g. "I boarded here"
  lat?: number;
  lng?: number;
  locationSource?: 'gps' | 'preset' | 'manual';
  createdAt: number;
}

export interface LocationAnchor {
  deviceId: string;
  ownerUid?: string;
  username: string;
  lat: number;
  lng: number;
  name: string;
  source: 'gps' | 'preset' | 'manual';
  accuracyMeters?: number;
  nearestRankId?: string;
  nearestRankName?: string;
  timestamp: number;
}

export type TransportType = 
  | 'kombi_15'
  | 'coaster_minibus'
  | 'zupco_bus'
  | 'mushikashika_sedan'
  | 'metered_taxi'
  | 'intercity_coach';

export interface UserLocation {
  lat: number;
  lng: number;
  name: string;
  source: 'gps' | 'preset' | 'manual';
  accuracyMeters?: number;
  timestamp: number;
}

export interface FareReport {
  id: string;
  route_id: string;
  fare_amount: number;
  currency: Currency;
  reported_at: number;
  reporter_device_id: string;
  ownerUid?: string;
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down';
  source?: 'seeded' | 'user' | 'peer';
  transport_type?: string;
  departure_status?: string;
  route_name?: string;
  city?: string;
  reporter_username?: string;
  reporter_badge?: string;
}

export interface StatusReport {
  id: string;
  route_id: string;
  type: StatusType;
  note?: string;
  reported_at: number;
  expires_at: number;
  reporter_device_id: string;
  ownerUid?: string;
  reporter_username?: string;
  source?: 'seeded' | 'user' | 'peer';
}

export interface Rank {
  id: string;
  name: string;
  lat: number;
  lng: number;
  routes_served: string[];
  city: string;
  address?: string;
  kombiTypes?: string;
  rankType?: 'kombi' | 'bus_terminus' | 'taxi_rank' | 'intercity';
}

export interface UserProfile {
  device_id: string;
  userId?: string;
  ownerUid?: string;
  name?: string;
  username: string;
  handle: string;
  avatarColor: string;
  commuterBadge: string;
  role: 'commuter' | 'transporter';
  isGuest?: boolean;
  authProvider?: 'anonymous' | 'google';
  phone?: string;
  reputation_score: number;
  reports_count: number;
  createdAt: number;
  updatedAt?: number;
}

export type OperatorTier = 'luxury' | 'semi_luxury' | 'standard';

export interface BusOperator {
  id: string;
  name: string;
  alias?: string;
  tier: OperatorTier;
  headquarters: string;
  phone?: string;
  amenities: string[];
  rating: number;
  reviewsCount: number;
  luggagePolicy: string;
  bookingInfo: string;
  description: string;
  popularRoutes: string[];
}

export interface IntercityOperatorService {
  operatorId: string;
  operatorName: string;
  tier: OperatorTier;
  fareUSD: number;
  fareZiG?: number;
  typicalDepartures: string[];
  departureHub: string;
  amenities: string[];
  reliabilityScore: number;
}

export interface IntercityRoute {
  id: string;
  name: string;
  originCity: string;
  destinationCity: string;
  distanceKm: number;
  estimatedDurationHours: number;
  highwayCode: string;
  keyStops: string[];
  departureHubs: { city: string; terminal: string }[];
  operators: IntercityOperatorService[];
  averageFareUSD: number;
  fareRange: { min: number; max: number };
}

export interface IntercityReport {
  id: string;
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
  reportedAt: number;
  reporterDeviceId: string;
  ownerUid?: string;
  reporterUsername?: string;
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down';
}

export type PendingWriteType =
  | 'fare_report'
  | 'fare_delete'
  | 'status_report'
  | 'status_delete'
  | 'fare_vote'
  | 'intercity_report'
  | 'intercity_delete'
  | 'intercity_vote'
  | 'add_route'
  | 'transporter_register'
  | 'transporter_update'
  | 'transporter_delete'
  | 'transporter_like'
  | 'social_interaction'
  | 'social_interaction_edit'
  | 'social_interaction_delete'
  | 'social_reaction'
  | 'social_reaction_record'
  | 'social_reaction_delete'
  | 'social_reply'
  | 'social_reply_edit'
  | 'social_reply_delete'
  | 'notification_create'
  | 'notification_update'
  | 'boarding_confirmation'
  | 'profile_update'
  | 'private_profile_update'
  | 'location_anchor';

export interface PendingWrite {
  id: string;
  type: PendingWriteType;
  payload: any;
  created_at: number;
  retry_count: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  error?: string;
}

export interface ActiveRouteSummary {
  route: RouteItem;
  latestFare?: FareReport;
  latestStatus?: StatusReport;
  activeStatuses: StatusReport[];
  fareConfidence: 'high' | 'medium' | 'outdated';
  confidenceReason: string;
  averageFareUSD?: number;
  averageFareZWL?: number;
  averageFareZAR?: number;
  averageFareBWP?: number;
}

export interface SyncStatusInfo {
  isSyncing: boolean;
  lastSyncedAt: number | null;
  lastSyncError: string | null;
  cloudConnected: boolean;
  sqliteReady: boolean;
  sqliteRowCount: number;
  authReady?: boolean;
  authUid?: string | null;
  anonAuthBlocked?: boolean;
}
