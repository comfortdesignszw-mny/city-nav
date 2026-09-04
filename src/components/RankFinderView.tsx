import React, { useState, useMemo } from 'react';
import { 
  MapPin, 
  Navigation, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  ChevronRight, 
  Compass, 
  Bus,
  Layers,
  Building2,
  Info,
  Car,
  Copy,
  Check,
  ExternalLink,
  Crosshair,
  Search,
  Share2
} from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import { Rank, RouteItem, UserLocation } from '../types';
import { formatCurrency, getStatusConfig } from '../utils/formatters';
import { UserLocationBar } from './UserLocationBar';
import { 
  calculateDistanceKm, 
  calculateBearing, 
  bearingToCardinal, 
  formatDistance, 
  formatWalkingEta, 
  formatDrivingEta, 
  formatCoordinates 
} from '../utils/geoUtils';

interface RankFinderViewProps {
  onSelectRoute: (routeId: string) => void;
  selectedRankId?: string | null;
}

const PRIMARY_CITIES = [
  'All Cities',
  'Harare',
  'Bulawayo',
  'Chitungwiza',
  'Gweru',
  'Kwekwe',
  'Mutare',
  'Kadoma',
  'Masvingo',
  'Marondera',
  'Bindura',
  'Gwanda',
  'Victoria Falls',
  'Chinhoyi',
  'Zvishavane',
  'Chegutu',
  'Beitbridge'
];

type RankTypeFilter = 'all' | 'kombi' | 'bus_terminus' | 'taxi_rank';

export const RankFinderView: React.FC<RankFinderViewProps> = ({
  onSelectRoute,
  selectedRankId,
}) => {
  const store = useOfflineStore();
  const allRanks = store.getRanks();
  const routes = store.getRoutes();
  const userLocation = store.getUserLocation();

  const [selectedCity, setSelectedCity] = useState<string>('All Cities');
  const [rankTypeFilter, setRankTypeFilter] = useState<RankTypeFilter>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [copiedCoords, setCopiedCoords] = useState(false);

  // Compute ranks sorted by proximity to the user's current GPS location
  const ranksWithProximity = useMemo(() => {
    return allRanks.map((rank) => {
      const distanceKm = calculateDistanceKm(
        userLocation.lat,
        userLocation.lng,
        rank.lat,
        rank.lng
      );
      const bearingDeg = calculateBearing(
        userLocation.lat,
        userLocation.lng,
        rank.lat,
        rank.lng
      );
      const cardinal = bearingToCardinal(bearingDeg);

      // Infer or use rank type
      let type: 'kombi' | 'bus_terminus' | 'taxi_rank' = 'kombi';
      const nameLower = rank.name.toLowerCase();
      if (nameLower.includes('bus terminus') || nameLower.includes('musika') || nameLower.includes('intercity') || nameLower.includes('coach')) {
        type = 'bus_terminus';
      } else if (nameLower.includes('taxi') || nameLower.includes('mushikashika')) {
        type = 'taxi_rank';
      }

      return {
        ...rank,
        distanceKm,
        bearingDeg,
        cardinal,
        inferredType: rank.rankType || type,
      };
    }).sort((a, b) => a.distanceKm - b.distanceKm); // Sort closest to user first
  }, [allRanks, userLocation]);

  // Filter ranks by city, type, and search query
  const filteredRanks = useMemo(() => {
    return ranksWithProximity.filter((r) => {
      // City
      if (selectedCity !== 'All Cities' && (r.city || '').toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }
      // Type filter
      if (rankTypeFilter !== 'all' && r.inferredType !== rankTypeFilter) {
        return false;
      }
      // Search
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        const matches = r.name.toLowerCase().includes(q) || 
          (r.address || '').toLowerCase().includes(q) || 
          r.city.toLowerCase().includes(q) ||
          (r.kombiTypes || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [ranksWithProximity, selectedCity, rankTypeFilter, searchFilter]);

  const [activeRankId, setActiveRankId] = useState<string>(
    selectedRankId || filteredRanks[0]?.id || ranksWithProximity[0]?.id || 'rank-copacabana'
  );

  // Active rank instance
  const activeRank = useMemo(() => {
    const found = filteredRanks.find((r) => r.id === activeRankId);
    if (found) return found;
    return filteredRanks[0] || ranksWithProximity[0];
  }, [filteredRanks, activeRankId, ranksWithProximity]);

  // Routes served by the active rank with their latest fare
  const servedRoutes = useMemo(() => {
    if (!activeRank) return [];
    return routes
      .filter((rt) =>
        activeRank.routes_served.includes(rt.id) || rt.ranksServedIds.includes(activeRank.id)
      )
      .map((rt) => {
        const summary = store.getRouteSummary(rt.id);
        return {
          route: rt,
          latestFare: summary?.latestFare,
          latestStatus: summary?.latestStatus,
        };
      });
  }, [routes, activeRank, store]);

  // Copy coordinates to clipboard (low-bandwidth friendly)
  const handleCopyCoordinates = () => {
    if (!activeRank) return;
    const text = `${activeRank.lat.toFixed(6)}, ${activeRank.lng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // Open native device navigation link (geo: URI with universal fallback)
  const handleOpenNativeNavigation = () => {
    if (!activeRank) return;
    const label = encodeURIComponent(activeRank.name);
    // Universal URL that triggers native maps on Android / iOS / Desktop
    const url = `https://www.google.com/maps/dir/?api=1&destination=${activeRank.lat},${activeRank.lng}&destination_place_id=${label}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Offline radar vector calculations
  const radarMetrics = useMemo(() => {
    if (!activeRank) return null;
    const distKm = activeRank.distanceKm;
    const bearing = activeRank.bearingDeg;
    const cardinal = activeRank.cardinal;

    // Vector on an SVG radar circle of radius 110px
    // Convert bearing (0° = North = -Y axis) to radians
    const rad = ((bearing - 90) * Math.PI) / 180;
    // Scale distance clamped to fit inside radar circle
    const visualDist = Math.min(Math.max(distKm * 25, 35), 95);
    const targetX = 140 + visualDist * Math.cos(rad);
    const targetY = 140 + visualDist * Math.sin(rad);

    return {
      distKm,
      bearing,
      cardinal,
      targetX,
      targetY,
      walkEta: formatWalkingEta(distKm),
      driveEta: formatDrivingEta(distKm),
      distFormatted: formatDistance(distKm),
    };
  }, [activeRank]);

  return (
    <div className="space-y-4">
      {/* 1. Passenger Location Bar Anchor */}
      <UserLocationBar onLocationChange={() => {}} />

      {/* 2. Top Header & City Filter */}
      <div className="bg-white border-2 border-[#141414] p-4 sm:p-5 shadow-[4px_4px_0px_0px_#141414] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-black uppercase tracking-widest bg-[#141414] text-white px-2 py-0.5">
                Lightweight GPS Positioning
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#F27D26]">
                Offline-First Radar
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#141414]">
              Bus Termini &amp; Kombi Ranks
            </h1>
            <p className="text-xs font-bold text-stone-600">
              Low-bandwidth GPS coordinates, compass headings, and direct walking directions to all ranks.
            </p>
          </div>

          <span className="text-xs font-black uppercase bg-[#F5F5F0] border-2 border-[#141414] px-3 py-1.5 self-start sm:self-auto">
            {filteredRanks.length} Transit Ranks Found
          </span>
        </div>

        {/* City Filter Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {PRIMARY_CITIES.map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer flex-shrink-0 ${
                selectedCity === city
                  ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                  : 'bg-[#F5F5F0] text-[#141414] hover:bg-stone-200'
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        {/* Rank Type Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <button
            onClick={() => setRankTypeFilter('all')}
            className={`py-1.5 text-[11px] font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer ${
              rankTypeFilter === 'all'
                ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                : 'bg-white text-[#141414] hover:bg-[#F5F5F0]'
            }`}
          >
            All Ranks ({ranksWithProximity.length})
          </button>
          <button
            onClick={() => setRankTypeFilter('kombi')}
            className={`py-1.5 text-[11px] font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer ${
              rankTypeFilter === 'kombi'
                ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                : 'bg-white text-[#141414] hover:bg-[#F5F5F0]'
            }`}
          >
            Kombi Ranks (HiAce)
          </button>
          <button
            onClick={() => setRankTypeFilter('bus_terminus')}
            className={`py-1.5 text-[11px] font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer ${
              rankTypeFilter === 'bus_terminus'
                ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                : 'bg-white text-[#141414] hover:bg-[#F5F5F0]'
            }`}
          >
            Bus Termini (Rural/ZUPCO)
          </button>
          <button
            onClick={() => setRankTypeFilter('taxi_rank')}
            className={`py-1.5 text-[11px] font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer ${
              rankTypeFilter === 'taxi_rank'
                ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                : 'bg-white text-[#141414] hover:bg-[#F5F5F0]'
            }`}
          >
            Taxi &amp; Mushikashika
          </button>
        </div>
      </div>

      {/* 3. LIGHTWEIGHT OFFLINE GPS RADAR & DIRECTION FINDER */}
      {activeRank && radarMetrics && (
        <div className="bg-[#141414] text-white border-2 border-[#141414] shadow-[6px_6px_0px_0px_#F27D26] p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            
            {/* Left: Interactive Vector Radar Canvas (Zero network bandwidth, instantaneous rendering) */}
            <div className="relative flex-shrink-0 flex items-center justify-center">
              <svg width="280" height="280" className="overflow-visible select-none">
                {/* Background radar sweep circle */}
                <circle cx="140" cy="140" r="130" fill="#0A0A0A" stroke="#262626" strokeWidth="2" />
                <circle cx="140" cy="140" r="95" fill="none" stroke="#262626" strokeWidth="1.5" strokeDasharray="4 4" />
                <circle cx="140" cy="140" r="60" fill="none" stroke="#333333" strokeWidth="1" strokeDasharray="2 2" />
                <circle cx="140" cy="140" r="25" fill="none" stroke="#404040" strokeWidth="1" />

                {/* Crosshairs & Cardinal axes */}
                <line x1="140" y1="10" x2="140" y2="270" stroke="#262626" strokeWidth="1.5" />
                <line x1="10" y1="140" x2="270" y2="140" stroke="#262626" strokeWidth="1.5" />

                {/* Cardinal direction labels */}
                <text x="140" y="22" textAnchor="middle" fill="#F27D26" fontSize="11" fontWeight="900">N</text>
                <text x="265" y="144" textAnchor="middle" fill="#A3A3A3" fontSize="10" fontWeight="700">E</text>
                <text x="140" y="265" textAnchor="middle" fill="#A3A3A3" fontSize="10" fontWeight="700">S</text>
                <text x="18" y="144" textAnchor="middle" fill="#A3A3A3" fontSize="10" fontWeight="700">W</text>

                {/* Direct Vector Line from User to Target Rank */}
                <line 
                  x1="140" 
                  y1="140" 
                  x2={radarMetrics.targetX} 
                  y2={radarMetrics.targetY} 
                  stroke="#F27D26" 
                  strokeWidth="3" 
                  strokeDasharray="4 2"
                />

                {/* Central Anchor: You (User Position) */}
                <circle cx="140" cy="140" r="7" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
                <circle cx="140" cy="140" r="14" fill="none" stroke="#3B82F6" strokeWidth="1.5" opacity="0.6" className="animate-ping" />
                <text x="140" y="162" textAnchor="middle" fill="#93C5FD" fontSize="9" fontWeight="800">YOU</text>

                {/* Target Pin: Rank Location */}
                <circle 
                  cx={radarMetrics.targetX} 
                  cy={radarMetrics.targetY} 
                  r="8" 
                  fill="#F27D26" 
                  stroke="#FFFFFF" 
                  strokeWidth="2.5" 
                />
                {/* Distance text on pin */}
                <rect 
                  x={radarMetrics.targetX - 25} 
                  y={radarMetrics.targetY - 26} 
                  width="50" 
                  height="16" 
                  fill="#141414" 
                  stroke="#F27D26" 
                  strokeWidth="1.5" 
                />
                <text 
                  x={radarMetrics.targetX} 
                  y={radarMetrics.targetY - 14} 
                  textAnchor="middle" 
                  fill="#FFFFFF" 
                  fontSize="9" 
                  fontWeight="900"
                >
                  {radarMetrics.distFormatted}
                </text>
              </svg>
            </div>

            {/* Right: GPS Metrics & Turn-by-Turn Navigation Details */}
            <div className="flex-1 w-full space-y-3.5">
              <div className="border-b border-stone-800 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#F27D26] flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5" />
                    Bearing: {radarMetrics.cardinal} ({Math.round(radarMetrics.bearing)}°)
                  </span>
                  <span className="text-[10px] font-bold text-stone-400 bg-stone-900 px-2 py-0.5 border border-stone-800">
                    Calculated from your anchor
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mt-1">
                  {activeRank.name}
                </h2>
                <p className="text-xs text-stone-300 font-medium mt-0.5">
                  {activeRank.address || 'Central Commuter Terminus'}
                </p>
              </div>

              {/* Distance & ETA Badges */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-stone-900 border border-stone-800 p-2.5">
                  <span className="block text-[9px] font-black uppercase text-stone-400">Distance</span>
                  <span className="text-lg font-black text-[#F27D26]">{radarMetrics.distFormatted}</span>
                </div>
                <div className="bg-stone-900 border border-stone-800 p-2.5">
                  <span className="block text-[9px] font-black uppercase text-stone-400">Walking ETA</span>
                  <span className="text-xs font-black text-white mt-1 block">{radarMetrics.walkEta}</span>
                </div>
                <div className="bg-stone-900 border border-stone-800 p-2.5">
                  <span className="block text-[9px] font-black uppercase text-stone-400">Kombi ETA</span>
                  <span className="text-xs font-black text-white mt-1 block">{radarMetrics.driveEta}</span>
                </div>
              </div>

              {/* Real-world Coordinates Readout */}
              <div className="p-3 bg-stone-900 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="block text-[9px] font-black uppercase text-stone-400">
                    Exact Decimal GPS Coordinates:
                  </span>
                  <span className="text-xs font-mono font-bold text-white tracking-wider">
                    {formatCoordinates(activeRank.lat, activeRank.lng)}
                  </span>
                </div>

                <button
                  onClick={handleCopyCoordinates}
                  className="px-3 py-1.5 bg-[#141414] hover:bg-stone-800 text-stone-200 text-[10px] font-black uppercase tracking-wider border border-stone-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  title="Copy coordinates to clipboard"
                >
                  {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCoords ? 'Copied' : 'Copy GPS'}</span>
                </button>
              </div>

              {/* Navigation Actions */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  onClick={handleOpenNativeNavigation}
                  className="flex-1 px-4 py-2.5 bg-[#F27D26] hover:bg-white hover:text-[#141414] text-white text-xs font-black uppercase tracking-wider border-2 border-white shadow-[3px_3px_0px_0px_#ffffff] transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Turn-by-Turn GPS Navigation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Ranks Proximity Directory (Closest to Passenger First) */}
      <div className="bg-white border-2 border-[#141414] p-4 sm:p-5 shadow-[4px_4px_0px_0px_#141414] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[#141414] pb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#F27D26]">
              All Termini &amp; Ranks
            </span>
            <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-[#141414]">
              Termini Ranked by Proximity to You
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter ranks or bays..."
              className="w-full pl-8 pr-3 py-1.5 text-xs font-bold border-2 border-[#141414] bg-[#F5F5F0] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Ranks Proximity List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filteredRanks.map((rn) => {
            const isSelected = activeRank && rn.id === activeRank.id;
            const distStr = formatDistance(rn.distanceKm);
            const walkStr = formatWalkingEta(rn.distanceKm);

            return (
              <div
                key={rn.id}
                onClick={() => setActiveRankId(rn.id)}
                className={`p-3.5 border-2 border-[#141414] transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#141414] text-white shadow-[4px_4px_0px_0px_#F27D26]'
                    : 'bg-[#F5F5F0] hover:bg-stone-100 text-[#141414] shadow-[2px_2px_0px_0px_#141414]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 border border-[#141414] ${
                      isSelected ? 'bg-white text-[#141414]' : 'bg-[#141414] text-white'
                    }`}>
                      {rn.city}
                    </span>
                    <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.2 border ${
                      isSelected 
                        ? 'bg-[#F27D26] text-white border-white' 
                        : 'bg-white text-[#141414] border-[#141414]'
                    }`}>
                      <Compass className="w-3 h-3" />
                      <span>{distStr} ({rn.cardinal})</span>
                    </div>
                  </div>

                  <h4 className="text-sm font-black uppercase">
                    {rn.name}
                  </h4>

                  <p className={`text-[11px] font-medium line-clamp-1 mt-0.5 ${
                    isSelected ? 'text-stone-300' : 'text-stone-600'
                  }`}>
                    {rn.address || 'Central Transit Station'}
                  </p>

                  {rn.kombiTypes && (
                    <p className={`text-[10px] font-bold uppercase mt-1 ${
                      isSelected ? 'text-[#F27D26]' : 'text-stone-500'
                    }`}>
                      {rn.kombiTypes}
                    </p>
                  )}
                </div>

                <div className={`mt-3 pt-2 border-t flex items-center justify-between text-[10px] font-bold ${
                  isSelected ? 'border-stone-800 text-stone-300' : 'border-stone-300 text-stone-600'
                }`}>
                  <span>{walkStr}</span>
                  <span className={`font-black flex items-center gap-1 ${isSelected ? 'text-[#F27D26]' : 'text-[#141414]'}`}>
                    {isSelected ? 'Viewing on Radar' : 'Select Rank'} →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Departing Routes & Live Fares from the Active Terminus */}
      {activeRank && (
        <div className="bg-white border-2 border-[#141414] p-4 sm:p-5 shadow-[4px_4px_0px_0px_#141414] space-y-3">
          <div className="flex items-center justify-between border-b-2 border-[#141414] pb-2.5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#F27D26]">
                Boarding Platforms
              </span>
              <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-[#141414]">
                Departing Routes from {activeRank.name}
              </h3>
            </div>
            <span className="text-xs font-black uppercase bg-[#141414] text-white px-2.5 py-1">
              {servedRoutes.length} Corridors
            </span>
          </div>

          {servedRoutes.length === 0 ? (
            <div className="p-6 bg-[#F5F5F0] border-2 border-[#141414] text-center text-xs font-bold text-stone-500">
              No routes recorded departing directly from this specific bay.
            </div>
          ) : (
            <div className="space-y-2">
              {servedRoutes.map(({ route, latestFare, latestStatus }) => {
                const statusCfg = getStatusConfig(latestStatus?.type || 'running');

                return (
                  <div
                    key={route.id}
                    onClick={() => onSelectRoute(route.id)}
                    className="p-3 bg-[#F5F5F0] hover:bg-stone-100 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-[#141414] text-white">
                          {route.city}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 border border-[#141414] ${statusCfg.badgeClass}`}>
                          {statusCfg.label}
                        </span>
                        <span className="text-[10px] font-bold text-stone-500">
                          {route.commonVehicle || 'Toyota HiAce'}
                        </span>
                      </div>

                      <h4 className="text-sm font-black uppercase text-[#141414] hover:text-[#F27D26] truncate">
                        {route.name}
                      </h4>

                      <div className="text-[11px] font-medium text-stone-600 flex items-center gap-1 mt-0.5">
                        <span>{route.origin}</span>
                        <ArrowRight className="w-3 h-3 text-[#F27D26]" />
                        <span>{route.destination}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:flex-col sm:items-end justify-between border-t sm:border-t-0 border-stone-300 pt-2 sm:pt-0">
                      <div className="text-right">
                        <div className="text-base font-black text-[#141414]">
                          {latestFare ? formatCurrency(latestFare.fare_amount, latestFare.currency) : '$1.00 USD'}
                        </div>
                        <div className="text-[10px] font-bold text-stone-500">
                          {latestFare?.transport_type || 'Kombi'}
                        </div>
                      </div>

                      <span className="text-[10px] font-black uppercase text-[#F27D26] flex items-center gap-0.5">
                        View Schedule <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
