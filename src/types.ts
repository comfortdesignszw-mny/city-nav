export type Currency = 'USD' | 'ZWL' | 'ZAR' | 'BWP';

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
  city: string; // e.g. "Harare", "Bulawayo", "Gweru", "Kwekwe", "Mutare", "Kadoma", "Masvingo", "Marondera", "Bindura", "Gwanda", "Plumtree"
  province?: string;
  category?: RouteCategory; // 'cbd_location' (CBD to locations/suburbs) or 'near_town' (inter-urban / near town transport)
  distanceKm?: number;
  commonVehicle?: string; // e.g. "Toyota HiAce Kombi", "Sprinter", "Mushikashika (Wish/Sienta)"
  ranksServedIds: string[];
}

export type TransporterVehicleType = 
  | 'hiace_combi' // HiAce (Combi)
  | 'mushikashika' // Mushikashika (small taxis / Wish / Sienta)
  | 'sprinter_22' // Sprinters (22 Seaters)
  | 'intercity_coach' // Long Distance Coaches
  | 'cross_border_quantum' // Cross-boarder Quantum
  | 'metered_taxi'; // Metered City Taxi / Cab

export interface TransporterProfile {
  id: string;
  operatorName: string; // Name or Transport Business Name
  contactPhone: string; // Phone number with WhatsApp capability
  transportType: TransporterVehicleType;
  transportTypeLabel: string; // Readable label
  currentRouteName: string; // Route they always serve (e.g. "Bulawayo CBD ⇄ Cowdray Park")
  currentRouteId?: string;
  city: string;
  vehiclePlate?: string; // e.g. "AEK 3942"
  baseTerminus?: string; // e.g. "Egodini Rank", "Copacabana", "Plumtree Rank"
  status: 'active' | 'loading' | 'available_hire' | 'off_duty';
  statusNote?: string;
  registeredAt: number;
  lastRouteUpdate: number;
  registeredByDeviceId: string;
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
  | 'off_route';

export interface AmenityFeedback {
  ac?: boolean; // Air conditioning
  usb?: boolean; // USB charging
  wifi?: boolean; // On-board Wi-Fi
  reclining?: boolean; // Reclining seats
  luggage?: boolean; // Secure luggage
  toilet?: boolean; // On-board restroom
  refreshments?: boolean; // Water / Refreshments
  tv?: boolean; // Entertainment screen
}

export interface CommuterSocialInteraction {
  id: string;
  targetType: 'route' | 'intercity' | 'operator' | 'rank' | 'transporter';
  targetId: string;
  targetName: string;
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
  deviceId: string;
  
  // Optional enrichments
  confirmedFare?: {
    amount: number;
    currency: Currency;
  };
  confirmedDepartureTime?: string; // e.g. "07:15 AM - Departed on time"
  amenitiesReview?: AmenityFeedback;
  isAbuseReport?: boolean;
  abuseType?: AbuseCategory;
  abuseLocation?: string;
  abusePlateNumber?: string;
}

export type TransportType = 
  | 'kombi_15' // Toyota HiAce Kombi (15-seater)
  | 'coaster_minibus' // Minibus / Coaster (18-24 seater)
  | 'zupco_bus' // ZUPCO Conventional Big Bus (65-75 seater)
  | 'mushikashika_sedan' // Mushikashika (Wish / Sienta / Ipsum)
  | 'metered_taxi' // Metered City Taxi / Cab
  | 'intercity_coach'; // Long-distance Coach (CAG, Inter Africa, City Link)

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
  reported_at: number; // unix timestamp ms
  reporter_device_id: string;
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down';
  source?: 'seeded' | 'user' | 'peer';
  transport_type?: string; // e.g. "Toyota HiAce Kombi", "Mushikashika (Wish)", "ZUPCO Big Bus"
  departure_status?: string; // e.g. "Loading now / Depart in 5 mins", "Full & Leaving"
  route_name?: string;
  city?: string;
  reporter_username?: string;
  reporter_badge?: string;
}

export interface StatusReport {
  id: string;
  route_id: string;
  type: StatusType;
  note?: string; // max 100 chars
  reported_at: number; // unix timestamp ms
  expires_at: number; // default 90 min from report
  reporter_device_id: string;
  reporter_username?: string;
  source?: 'seeded' | 'user' | 'peer';
}

export interface Rank {
  id: string;
  name: string; // e.g. "Mbare Musika"
  lat: number;
  lng: number;
  routes_served: string[]; // route ids
  city: string;
  address?: string;
  kombiTypes?: string;
  rankType?: 'kombi' | 'bus_terminus' | 'taxi_rank' | 'intercity';
}

export interface UserProfile {
  device_id: string;
  username: string; // e.g. "Tinashe_Zw"
  handle: string; // e.g. "@tinashe_zw"
  avatarColor: string; // Hex color for avatar
  commuterBadge: string; // e.g. "Daily Commuter", "Route Scout", "Transporter"
  role: 'commuter' | 'transporter';
  phone?: string;
  reputation_score: number;
  reports_count: number;
  createdAt: number;
}

export type OperatorTier = 'luxury' | 'semi_luxury' | 'standard';

export interface BusOperator {
  id: string;
  name: string; // e.g. "CAG Travellers Coaches", "City Link", "Inter Africa"
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
  typicalDepartures: string[]; // e.g. ["06:30 AM", "08:00 AM", "14:00 PM"]
  departureHub: string; // e.g. "Harare Roadport Terminal"
  amenities: string[];
  reliabilityScore: number; // e.g. 96
}

export interface IntercityRoute {
  id: string;
  name: string; // e.g. "Harare ⇄ Bulawayo Express"
  originCity: string;
  destinationCity: string;
  distanceKm: number;
  estimatedDurationHours: number;
  highwayCode: string; // e.g. "A5 (Robert Mugabe Hwy)"
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
  departureTime?: string;
  departureTerminal: string;
  seatAvailability: 'plenty' | 'filling_fast' | 'full';
  busConditionRating: number; // 1-5
  roadStatusNote?: string;
  reportedAt: number;
  reporterDeviceId: string;
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down';
}

export interface PendingWrite {
  id: string;
  type: 'fare_report' | 'status_report' | 'fare_vote' | 'intercity_report' | 'add_route';
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
