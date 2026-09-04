/**
 * Lightweight, offline-first GPS & Geolocation utilities.
 * Designed for low-bandwidth environments, 2G/EDGE networks, and older mobile devices.
 * Uses pure trigonometry (Haversine formula) without heavy external map SDKs.
 */

import { UserLocation } from '../types';

// Earth radius in kilometers
const EARTH_RADIUS_KM = 6371;

/**
 * Calculates great-circle distance between two coordinates using Haversine formula
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(rLat1) * Math.cos(rLat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Calculates initial compass bearing (0° to 360°) from point 1 to point 2
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);
  const dLon = toRad(lon2 - lon1);

  const y = Math.sin(dLon) * Math.cos(rLat2);
  const x =
    Math.cos(rLat1) * Math.sin(rLat2) -
    Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLon);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

/**
 * Converts degree bearing into cardinal direction (e.g. NE, SSW)
 */
export function bearingToCardinal(deg: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW'
  ];
  const idx = Math.round(deg / 22.5) % 16;
  return directions[idx];
}

/**
 * Format distance cleanly: "350m" if under 1km, "2.4 km" otherwise
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters}m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Format estimated walking time assuming average walking speed of 4.8 km/h (80 meters/min)
 */
export function formatWalkingEta(distanceKm: number): string {
  const minutes = Math.max(1, Math.round((distanceKm / 4.8) * 60));
  if (minutes < 60) {
    return `~${minutes} min walk`;
  }
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return remMin > 0 ? `~${hours}h ${remMin}m walk` : `~${hours}h walk`;
}

/**
 * Format estimated kombi / drive time
 */
export function formatDrivingEta(distanceKm: number): string {
  const minutes = Math.max(2, Math.round((distanceKm / 28) * 60)); // Average urban kombi speed with stops ~28 km/h
  if (minutes < 60) {
    return `~${minutes} min kombi`;
  }
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return remMin > 0 ? `~${hours}h ${remMin}m kombi` : `~${hours}h kombi`;
}

/**
 * Formats coordinates for clean display (e.g. "17.8315°S, 31.0450°E")
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latStr = `${Math.abs(lat).toFixed(4)}°${lat < 0 ? 'S' : 'N'}`;
  const lngStr = `${Math.abs(lng).toFixed(4)}°${lng < 0 ? 'W' : 'E'}`;
  return `${latStr}, ${lngStr}`;
}

/**
 * Standard commuter location presets across major Zimbabwean cities and suburbs.
 * Allows users on older phones or with GPS disabled to set their location in 1 tap.
 */
export interface LocationPreset {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  description: string;
}

export const ZIMBABWE_LOCATION_PRESETS: LocationPreset[] = [
  // Harare CBD & Suburbs
  {
    id: 'loc-hre-first-st',
    name: 'Harare CBD (First St Mall)',
    city: 'Harare',
    lat: -17.8292,
    lng: 31.0505,
    description: 'Central pedestrian mall, near Nelson Mandela Ave & Jason Moyo Ave',
  },
  {
    id: 'loc-hre-copacabana',
    name: 'Copacabana (Speke & Chinhoyi)',
    city: 'Harare',
    lat: -17.8315,
    lng: 31.0450,
    description: 'Western suburbs kombi hub, near Town House',
  },
  {
    id: 'loc-hre-market-sq',
    name: 'Market Square (Bank & Kaunda)',
    city: 'Harare',
    lat: -17.8338,
    lng: 31.0415,
    description: 'Southern suburbs kombi & cross-border terminus',
  },
  {
    id: 'loc-hre-fourth-st',
    name: 'Fourth Street / Simon Muzenda',
    city: 'Harare',
    lat: -17.8288,
    lng: 31.0558,
    description: 'Eastern suburbs & near-town corridor (Ruwa, Marondera)',
  },
  {
    id: 'loc-hre-charge-office',
    name: 'Charge Office (Harare St)',
    city: 'Harare',
    lat: -17.8355,
    lng: 31.0520,
    description: 'Chitungwiza & Epworth kombi terminus',
  },
  {
    id: 'loc-hre-mbare',
    name: 'Mbare Musika',
    city: 'Harare',
    lat: -17.8583,
    lng: 31.0428,
    description: 'Ardbennie Rd, long-distance & high-density hub',
  },
  {
    id: 'loc-hre-avondale',
    name: 'Avondale Shopping Centre',
    city: 'Harare',
    lat: -17.8015,
    lng: 31.0392,
    description: 'King George Rd, northern suburbs connector',
  },
  {
    id: 'loc-hre-borrowdale',
    name: 'Borrowdale Sam Levy Village',
    city: 'Harare',
    lat: -17.7550,
    lng: 31.0965,
    description: 'Borrowdale Rd, north-east commercial hub',
  },
  {
    id: 'loc-hre-kuwadzana',
    name: 'Kuwadzana Roundabout',
    city: 'Harare',
    lat: -17.8420,
    lng: 30.9320,
    description: 'Bulawayo Rd, Kuwadzana & Dzivarasekwa pickup',
  },
  {
    id: 'loc-hre-machipisa',
    name: 'Machipisa Shopping Centre (Highfield)',
    city: 'Harare',
    lat: -17.8810,
    lng: 31.0020,
    description: 'Highfield high-density commuter hub',
  },

  // Chitungwiza
  {
    id: 'loc-chit-makoni',
    name: 'Makoni Shopping Centre',
    city: 'Chitungwiza',
    lat: -18.0125,
    lng: 31.0760,
    description: 'Major Seke & St Marys kombi junction',
  },
  {
    id: 'loc-chit-town-centre',
    name: 'Chitungwiza Town Centre',
    city: 'Chitungwiza',
    lat: -18.0050,
    lng: 31.0580,
    description: 'Civic centre & central boarding bays',
  },

  // Bulawayo
  {
    id: 'loc-byo-cityhall',
    name: 'Bulawayo City Hall (Fife St)',
    city: 'Bulawayo',
    lat: -20.1535,
    lng: 28.5862,
    description: '8th Ave & Fife St, central Bulawayo terminus',
  },
  {
    id: 'loc-byo-egodini',
    name: 'Egodini Bus Terminus (Basch St)',
    city: 'Bulawayo',
    lat: -20.1580,
    lng: 28.5775,
    description: 'Western suburbs kombis (Luveve, Nkulumane, Pumula)',
  },
  {
    id: 'loc-byo-6th-ave',
    name: '6th Avenue & Lobengula',
    city: 'Bulawayo',
    lat: -20.1510,
    lng: 28.5815,
    description: 'Cowdray Park, Entumbane & high-frequency kombis',
  },
  {
    id: 'loc-byo-renkini',
    name: 'Renkini Bus Terminus',
    city: 'Bulawayo',
    lat: -20.1440,
    lng: 28.5665,
    description: 'Long-distance intercity and rural coach station',
  },

  // Gweru
  {
    id: 'loc-gwr-kudzanayi',
    name: 'Kudzanayi Bus Terminus',
    city: 'Gweru',
    lat: -19.4580,
    lng: 29.8165,
    description: 'Gweru central modern multi-tier transport rank',
  },

  // Mutare
  {
    id: 'loc-mut-sakubva',
    name: 'Sakubva Musika Bus Terminus',
    city: 'Mutare',
    lat: -18.9950,
    lng: 32.6580,
    description: 'Chimanimani Rd, high-volume terminus & rural buses',
  },

  // Masvingo
  {
    id: 'loc-msv-mucheke',
    name: 'Mucheke Bus Terminus',
    city: 'Masvingo',
    lat: -20.0820,
    lng: 30.8250,
    description: 'Central Masvingo high-density and regional terminus',
  },

  // Victoria Falls
  {
    id: 'loc-vic-chinotimba',
    name: 'Chinotimba Bus Terminus',
    city: 'Victoria Falls',
    lat: -17.9350,
    lng: 25.8280,
    description: 'Livingstone Way, Victoria Falls commuter & long-distance hub',
  },
];

/**
 * Default fallback location for Zimbabwe when user has not set or detected GPS
 */
export const DEFAULT_USER_LOCATION: UserLocation = {
  lat: -17.8315,
  lng: 31.0450,
  name: 'Copacabana, Harare CBD',
  source: 'preset',
  accuracyMeters: 50,
  timestamp: Date.now(),
};

/**
 * Finds the closest preset location given raw lat/lng
 */
export function findClosestPreset(lat: number, lng: number): LocationPreset | null {
  let closest: LocationPreset | null = null;
  let minDistance = Infinity;

  ZIMBABWE_LOCATION_PRESETS.forEach((preset) => {
    const dist = calculateDistanceKm(lat, lng, preset.lat, preset.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = preset;
    }
  });

  return closest;
}
