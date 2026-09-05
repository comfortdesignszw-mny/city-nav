import React, { useState, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Navigation, 
  Fuel, 
  ChevronRight, 
  Check, 
  Filter, 
  ArrowRight,
  Building2,
  Car,
  Compass,
  Layers,
  ArrowRightLeft,
  PlusCircle,
  TrendingUp,
  Banknote,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Share2
} from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import { RouteCategory, FareReport } from '../types';
import { formatTimeAgo, formatCurrency, getStatusConfig } from '../utils/formatters';
import { UserLocationBar } from './UserLocationBar';
import { AddRouteFareModal } from './AddRouteFareModal';
import { ShareFareModal } from './ShareFareModal';
import { 
  calculateDistanceKm, 
  formatDistance, 
  formatWalkingEta, 
  bearingToCardinal, 
  calculateBearing 
} from '../utils/geoUtils';

interface HomeRouteSearchProps {
  onSelectRoute: (routeId: string) => void;
  onSelectRank: (rankId: string) => void;
  onNavigateToBuzz?: () => void;
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

export const HomeRouteSearch: React.FC<HomeRouteSearchProps> = ({ 
  onSelectRoute, 
  onSelectRank,
  onNavigateToBuzz
}) => {
  const store = useOfflineStore();
  const routes = store.getRoutes();
  const ranks = store.getRanks();
  const userLocation = store.getUserLocation();

  // Search and view states
  const [searchQuery, setSearchQuery] = useState('');
  const [isBrowseMode, setIsBrowseMode] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [shareModalState, setShareModalState] = useState<{
    isOpen: boolean;
    mode: 'single' | 'all';
    fare?: FareReport;
  }>({
    isOpen: false,
    mode: 'single',
  });

  // Filters for Search / Browse Mode
  const [selectedCity, setSelectedCity] = useState<string>('All Cities');
  const [selectedCategory, setSelectedCategory] = useState<'all' | RouteCategory>('all');
  const [selectedRankFilter, setSelectedRankFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // --- LATEST HOME SECTIONS DATA (LATEST UPDATES ON TOP) ---
  
  // 1. Latest Live Fares & Departures (Latest 5 updates across all routes)
  const latestFares = useMemo(() => {
    return store.getAllFareReports().slice(0, 5);
  }, [store]);

  // 2. Nearest Termini & Ranks to User (Sorted by distance from user's GPS/preset location)
  const nearestRanks = useMemo(() => {
    return ranks
      .map((rank) => {
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
        return {
          ...rank,
          distanceKm,
          cardinal,
          bearingDeg,
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 4);
  }, [ranks, userLocation]);

  // 3. Latest Live Road & Commuter Alerts (Latest 4 updates on top)
  const latestAlerts = useMemo(() => {
    return store.getAllStatusReports().slice(0, 4);
  }, [store]);

  // --- SEARCH & DIRECTORY FILTERING ---
  const isSearching = searchQuery.trim().length > 0 || isBrowseMode;

  const filteredSummaries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return routes
      .map((route) => store.getRouteSummary(route.id))
      .filter((summary): summary is NonNullable<typeof summary> => summary !== null)
      .filter((summary) => {
        const route = summary.route;

        // City filter
        if (selectedCity !== 'All Cities') {
          const cityLower = selectedCity.toLowerCase();
          const routeCityLower = (route.city || '').toLowerCase();
          const routeNameLower = route.name.toLowerCase();
          const originLower = route.origin.toLowerCase();
          const destLower = route.destination.toLowerCase();

          const matchesCity = routeCityLower === cityLower ||
            routeNameLower.includes(cityLower) ||
            originLower.includes(cityLower) ||
            destLower.includes(cityLower);

          if (!matchesCity) return false;
        }

        // Category filter
        if (selectedCategory !== 'all') {
          if (route.category !== selectedCategory) return false;
        }

        // Rank filter
        if (selectedRankFilter !== 'all') {
          if (!route.ranksServedIds.includes(selectedRankFilter)) return false;
        }

        // Status filter
        if (selectedStatusFilter !== 'all') {
          const currentStatus = summary.latestStatus?.type || 'running';
          if (currentStatus !== selectedStatusFilter) return false;
        }

        // Query search
        if (!q) return true;

        const nameMatch = route.name.toLowerCase().includes(q);
        const originMatch = route.origin.toLowerCase().includes(q);
        const destMatch = route.destination.toLowerCase().includes(q);
        const cityMatch = (route.city || '').toLowerCase().includes(q);
        const vehicleMatch = (route.commonVehicle || '').toLowerCase().includes(q);
        const waypointMatch = route.waypoints.some((w) => w.name.toLowerCase().includes(q));

        return nameMatch || originMatch || destMatch || cityMatch || vehicleMatch || waypointMatch;
      });
  }, [routes, store, searchQuery, selectedCity, selectedCategory, selectedRankFilter, selectedStatusFilter]);

  const handleVoteFare = (fareId: string, dir: 'up' | 'down') => {
    store.voteFare(fareId, dir);
  };

  return (
    <div className="space-y-4">
      {/* 1. User Location Bar Anchor */}
      <UserLocationBar onLocationChange={() => {}} />

      {/* 2. Top Header & Action Controls */}
      <div className="bg-white border-2 border-[#141414] p-4 sm:p-5 shadow-[4px_4px_0px_0px_#141414] flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-[#141414] text-white px-2 py-0.5">
                Zimbabwe Commuter Network
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#F27D26] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Crowdsourced
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#141414] mt-0.5">
              Fambai Route &amp; Fare Desk
            </h1>
            <p className="text-xs font-bold text-stone-600">
              Real-time kombi fares, transport types, and terminus distances across Zimbabwe.
            </p>
          </div>

          <button
            id="add-route-fare-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-[#141414] hover:bg-[#F27D26] text-white text-xs font-black uppercase tracking-wider border-2 border-[#141414] shadow-[3px_3px_0px_0px_#F27D26] transition flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
          >
            <PlusCircle className="w-4 h-4 text-[#F27D26]" />
            <span>+ Add Route / Fare</span>
          </button>
        </div>

        {/* Global Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="main-route-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all 60+ routes, towns, or destinations (e.g. Kuwadzana, Gwanda, Redcliff, Egodini)..."
            className="w-full pl-10 pr-20 py-2.5 text-xs font-bold border-2 border-[#141414] bg-[#F5F5F0] focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_#141414]"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-[#F27D26] hover:underline cursor-pointer"
            >
              Clear
            </button>
          ) : (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-stone-400">
              {routes.length} Routes
            </span>
          )}
        </div>
      </div>

      {/* 3. Conditional Render: Clean Home Page vs Search Results */}
      {!isSearching ? (
        /* ========================================================================= */
        /* CLEAN HOME PAGE: Latest entries only on each section, latest updates on top */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* SECTION 1: LATEST LIVE FARES & DEPARTURES (Latest on top) */}
          <section className="bg-white border-2 border-[#141414] p-4 sm:p-5 shadow-[4px_4px_0px_0px_#141414]">
            <div className="flex items-center justify-between border-b-2 border-[#141414] pb-2.5 mb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#F27D26] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Latest Updates on Top
                </span>
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-[#141414]">
                  Latest Live Fares &amp; Active Departures
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShareModalState({
                    isOpen: true,
                    mode: 'all',
                  })}
                  className="text-[10px] font-black uppercase tracking-wider bg-white hover:bg-[#141414] hover:text-white text-[#141414] border-2 border-[#141414] px-2 py-1 flex items-center gap-1 cursor-pointer transition shadow-[1px_1px_0px_0px_#141414]"
                  title="Share full live fares digest externally (WhatsApp/Social) or post to Commuter Buzz"
                >
                  <Share2 className="w-3 h-3 text-[#F27D26]" />
                  <span>Share All Fares</span>
                </button>
                <button
                  onClick={() => setIsBrowseMode(true)}
                  className="text-[10px] font-black uppercase tracking-wider text-[#141414] hover:text-[#F27D26] flex items-center gap-1 cursor-pointer"
                >
                  <span>Search All</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {latestFares.length === 0 ? (
                <div className="p-6 sm:p-8 text-center bg-[#F5F5F0] border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] space-y-3">
                  <div className="w-12 h-12 bg-white border-2 border-[#141414] shadow-[2px_2px_0px_0px_#F27D26] flex items-center justify-center mx-auto text-[#141414]">
                    <Banknote className="w-6 h-6 text-[#F27D26]" />
                  </div>
                  <div className="space-y-1 max-w-sm mx-auto">
                    <h3 className="text-base font-black text-[#141414] uppercase tracking-tight">
                      No Live Fares Reported Yet Today
                    </h3>
                    <p className="text-xs font-medium text-stone-600 leading-relaxed">
                      Nothing has been recorded yet for today! When passengers board kombis or buses, they post fares to keep everyone updated in USD, ZiG, and Rand.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="py-2.5 px-4 bg-[#141414] text-white hover:bg-[#F27D26] transition font-black text-xs uppercase tracking-wider border-2 border-[#141414] shadow-[2px_2px_0px_0px_#F27D26] flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>+ Report Today's Fare</span>
                    </button>
                    <button
                      onClick={() => setIsBrowseMode(true)}
                      className="py-2.5 px-3 bg-white text-[#141414] hover:bg-stone-200 transition font-black text-xs uppercase tracking-wider border-2 border-[#141414] cursor-pointer"
                    >
                      Browse All Corridors
                    </button>
                  </div>
                </div>
              ) : (
                latestFares.map((fare) => (
                  <div
                    key={fare.id}
                    className="p-3 bg-[#F5F5F0] hover:bg-stone-100 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div 
                      className="cursor-pointer min-w-0 flex-1"
                      onClick={() => onSelectRoute(fare.route_id)}
                    >
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-[#141414] text-white">
                          {fare.city || 'Zimbabwe'}
                        </span>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-amber-200 border border-[#141414] text-[#141414] flex items-center gap-1">
                          <Car className="w-2.5 h-2.5 text-[#141414]" />
                          {fare.transport_type || 'HiAce Kombi'}
                        </span>
                        <span className="text-[10px] font-bold text-stone-500">
                          {formatTimeAgo(fare.reported_at)}
                        </span>
                      </div>

                      <div className="text-sm font-black uppercase text-[#141414] truncate hover:text-[#F27D26]">
                        {fare.route_name || 'Commuter Corridor'}
                      </div>

                      <div className="text-[11px] font-semibold text-stone-600 flex items-center gap-1.5 mt-0.5">
                        <span className="text-[#F27D26] font-black">●</span>
                        <span>{fare.departure_status || 'Loading right now'}</span>
                      </div>
                    </div>

                    {/* Fare readout & verification votes */}
                    <div className="flex items-center gap-3 sm:flex-col sm:items-end justify-between border-t sm:border-t-0 border-stone-200 pt-2 sm:pt-0">
                      <div className="text-right">
                        <span className="text-base sm:text-lg font-black text-[#141414]">
                          {formatCurrency(fare.fare_amount, fare.currency)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShareModalState({
                              isOpen: true,
                              mode: 'single',
                              fare,
                            });
                          }}
                          className="px-2 py-1 text-[10px] font-black border border-[#141414] bg-white hover:bg-[#F27D26] hover:text-white text-[#141414] flex items-center gap-1 transition cursor-pointer"
                          title="Share this fare card externally or post to Commuter Buzz"
                        >
                          <Share2 className="w-2.5 h-2.5" />
                          <span>Share</span>
                        </button>
                        <button
                          onClick={() => handleVoteFare(fare.id, 'up')}
                          className={`px-2 py-1 text-[10px] font-black border border-[#141414] flex items-center gap-1 transition cursor-pointer ${
                            fare.userVote === 'up' ? 'bg-[#141414] text-white' : 'bg-white hover:bg-stone-200 text-[#141414]'
                          }`}
                          title="Confirm this fare is accurate"
                        >
                          <ThumbsUp className="w-2.5 h-2.5" />
                          <span>{fare.upvotes}</span>
                        </button>
                        <button
                          onClick={() => handleVoteFare(fare.id, 'down')}
                          className={`px-2 py-1 text-[10px] font-black border border-[#141414] flex items-center gap-1 transition cursor-pointer ${
                            fare.userVote === 'down' ? 'bg-[#141414] text-white' : 'bg-white hover:bg-stone-200 text-[#141414]'
                          }`}
                          title="Report this fare is incorrect"
                        >
                          <ThumbsDown className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* SECTION 2: NEAREST TERMINI & RANKS TO YOU (Relative to GPS/set location) */}
          <section className="bg-white border-2 border-[#141414] p-4 sm:p-5 shadow-[4px_4px_0px_0px_#141414]">
            <div className="flex items-center justify-between border-b-2 border-[#141414] pb-2.5 mb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#F27D26] flex items-center gap-1">
                  <Navigation className="w-3 h-3" />
                  Relative to {userLocation.name}
                </span>
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-[#141414]">
                  Nearest Bus Termini &amp; Kombi Ranks to You
                </h2>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#F5F5F0] border border-[#141414]">
                Sorted by Proximity
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {nearestRanks.map((rank) => {
                const distStr = formatDistance(rank.distanceKm);
                const walkEta = formatWalkingEta(rank.distanceKm);

                return (
                  <div
                    key={rank.id}
                    onClick={() => onSelectRank(rank.id)}
                    className="p-3 bg-[#F5F5F0] hover:bg-stone-100 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] transition cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-[#141414] text-white">
                          {rank.city}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-black text-[#F27D26] bg-white px-1.5 py-0.2 border border-[#141414]">
                          <Compass className="w-3 h-3" />
                          <span>{distStr} ({rank.cardinal})</span>
                        </div>
                      </div>

                      <h3 className="text-sm font-black uppercase text-[#141414] hover:text-[#F27D26]">
                        {rank.name}
                      </h3>

                      <p className="text-[11px] font-medium text-stone-600 line-clamp-1 mt-0.5">
                        {rank.address || 'Central Transit Rank'}
                      </p>
                    </div>

                    <div className="border-t border-stone-300 mt-2.5 pt-2 flex items-center justify-between text-[10px] font-bold text-stone-600">
                      <span>Walking: {walkEta}</span>
                      <span className="text-[#141414] font-black flex items-center gap-0.5 hover:text-[#F27D26]">
                        Open GPS Radar <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION 3: LATEST LIVE ROAD & COMMUTER ALERTS (Latest updates on top) */}
          <section className="bg-white border-2 border-[#141414] p-4 sm:p-5 shadow-[4px_4px_0px_0px_#141414]">
            <div className="flex items-center justify-between border-b-2 border-[#141414] pb-2.5 mb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#F27D26] flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Active Traffic &amp; Blitz Feeds
                </span>
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-[#141414]">
                  Latest Live Road &amp; Commuter Alerts
                </h2>
              </div>
            </div>

            <div className="space-y-2">
              {latestAlerts.length === 0 ? (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-600 shadow-[2px_2px_0px_0px_#047857] flex flex-col sm:flex-row items-center justify-between gap-3 text-[#141414]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 border border-[#141414]">
                      <CheckCircle2 className="w-5 h-5 text-white stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase text-emerald-950">No Roadblocks or Queue Delays Reported Yet</div>
                      <div className="text-[11px] font-medium text-emerald-800">
                        Nothing has been reported yet. Commuter corridors are clear! Encountering a blitz or slow rank?
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="py-2 px-3 bg-[#141414] hover:bg-[#F27D26] text-white border-2 border-[#141414] text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-[2px_2px_0px_0px_#F27D26] whitespace-nowrap self-stretch sm:self-auto text-center"
                  >
                    + Report Road Alert
                  </button>
                </div>
              ) : (
                latestAlerts.map((alert) => {
                  const isPolice = alert.type === 'police_blitz';
                  const isDelayed = alert.type === 'delayed';

                  return (
                    <div
                      key={alert.id}
                      className={`p-2.5 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] flex items-start gap-2.5 ${
                        isPolice ? 'bg-amber-100 text-amber-950' : isDelayed ? 'bg-rose-50 text-rose-950' : 'bg-[#F5F5F0] text-[#141414]'
                      }`}
                    >
                      <div className="mt-0.5">
                        {isPolice ? (
                          <ShieldAlert className="w-4 h-4 text-amber-700" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-700" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] font-black uppercase tracking-wider bg-[#141414] text-white px-1.5 py-0.2">
                            {isPolice ? 'Police Blitz' : isDelayed ? 'Queue Delay' : 'Road Alert'}
                          </span>
                          <span className="text-[10px] font-bold text-stone-500">
                            {formatTimeAgo(alert.reported_at)}
                          </span>
                        </div>
                        <div className="text-xs font-black uppercase mt-1">
                          {alert.route_name}
                        </div>
                        {alert.note && (
                          <p className="text-[11px] font-medium mt-0.5">
                            "{alert.note}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Search CTA / Browse All Routes Button */}
          <div className="p-4 bg-[#141414] text-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#F27D26] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">
                Looking for a specific route or smaller town?
              </h3>
              <p className="text-xs text-stone-300 font-medium">
                Search all 60+ corridors, towns, and drop-off points across Zimbabwe.
              </p>
            </div>
            <button
              onClick={() => setIsBrowseMode(true)}
              className="px-4 py-2 bg-[#F27D26] hover:bg-white hover:text-[#141414] text-white text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer flex-shrink-0"
            >
              Browse All Routes (60+)
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* SEARCH & DIRECTORY MODE: Activated when user searches or clicks browse all */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* Active Search Banner & Back Button */}
          <div className="bg-[#141414] text-white p-3 border-2 border-[#141414] flex items-center justify-between gap-2 shadow-[4px_4px_0px_0px_#F27D26]">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[#F27D26]" />
              <span className="text-xs font-black uppercase tracking-wider">
                {searchQuery ? `Searching for "${searchQuery}"` : 'All 60+ Routes Directory'}
              </span>
              <span className="text-[10px] font-black bg-[#F27D26] text-white px-1.5 py-0.2">
                {filteredSummaries.length} Found
              </span>
            </div>

            <button
              onClick={() => {
                setSearchQuery('');
                setIsBrowseMode(false);
              }}
              className="px-2.5 py-1 bg-white text-[#141414] hover:bg-[#F27D26] hover:text-white text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
            >
              ← Back to Latest Updates
            </button>
          </div>

          {/* City Filter Chips */}
          <div className="bg-white border-2 border-[#141414] p-3 shadow-[3px_3px_0px_0px_#141414]">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 mb-2 block">
              Filter By City / Town:
            </span>
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
          </div>

          {/* Category Tabs */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`py-2 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                  : 'bg-white text-[#141414] hover:bg-[#F5F5F0]'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setSelectedCategory('cbd_location')}
              className={`py-2 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer ${
                selectedCategory === 'cbd_location'
                  ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                  : 'bg-white text-[#141414] hover:bg-[#F5F5F0]'
              }`}
            >
              CBD ⇄ Suburb
            </button>
            <button
              onClick={() => setSelectedCategory('near_town')}
              className={`py-2 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer ${
                selectedCategory === 'near_town'
                  ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                  : 'bg-white text-[#141414] hover:bg-[#F5F5F0]'
              }`}
            >
              Near-Town
            </button>
          </div>

          {/* Filtered Route Cards List */}
          <div className="space-y-2.5">
            {filteredSummaries.length === 0 ? (
              <div className="bg-white border-2 border-[#141414] p-8 text-center space-y-4 shadow-[4px_4px_0px_0px_#141414]">
                <div className="w-14 h-14 bg-[#F5F5F0] border-2 border-[#141414] shadow-[2px_2px_0px_0px_#F27D26] flex items-center justify-center mx-auto text-[#141414]">
                  <Search className="w-7 h-7 text-[#F27D26]" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-base sm:text-lg font-black uppercase text-[#141414]">
                    No Routes Found Matching Your Search
                  </h3>
                  <p className="text-xs sm:text-sm font-medium text-stone-600">
                    Nothing is created under this route name or terminus yet. You can be the first to add it with its origin, destination, and fare!
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="py-2.5 px-5 bg-[#141414] text-white text-xs sm:text-sm font-black uppercase tracking-wider border-2 border-[#141414] hover:bg-[#F27D26] transition cursor-pointer shadow-[3px_3px_0px_0px_#F27D26]"
                  >
                    + Add This Route &amp; Fare
                  </button>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setSelectedCity('All Cities'); }}
                    className="py-2.5 px-4 bg-[#F5F5F0] text-[#141414] text-xs sm:text-sm font-black uppercase tracking-wider border-2 border-[#141414] hover:bg-stone-200 transition cursor-pointer"
                  >
                    Clear Search
                  </button>
                </div>
              </div>
            ) : (
              filteredSummaries.map((summary) => {
                const route = summary.route;
                const latestFare = summary.latestFare;
                const latestStatus = summary.latestStatus;
                const statusCfg = getStatusConfig(latestStatus?.type || 'running');

                return (
                  <div
                    key={route.id}
                    onClick={() => onSelectRoute(route.id)}
                    className="bg-white border-2 border-[#141414] p-3.5 shadow-[3px_3px_0px_0px_#141414] hover:shadow-[5px_5px_0px_0px_#F27D26] transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-[#141414] text-white">
                          {route.city || 'Zimbabwe'}
                        </span>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-[#F5F5F0] border border-[#141414] text-[#141414]">
                          {route.category === 'near_town' ? 'Near-Town' : 'CBD ⇄ Location'}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 border border-[#141414] ${statusCfg.badgeClass}`}>
                          {statusCfg.label}
                        </span>
                      </div>

                      <h3 className="text-sm font-black uppercase text-[#141414] truncate hover:text-[#F27D26]">
                        {route.name}
                      </h3>

                      <div className="text-[11px] font-medium text-stone-600 flex items-center gap-1 mt-0.5">
                        <span>{route.origin}</span>
                        <ArrowRight className="w-3 h-3 text-[#F27D26]" />
                        <span>{route.destination}</span>
                        {route.distanceKm && (
                          <span className="text-stone-400 font-bold ml-1">
                            ({route.distanceKm} km)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fare & Vehicle Info */}
                    <div className="flex items-center gap-3 sm:flex-col sm:items-end justify-between border-t sm:border-t-0 border-stone-200 pt-2 sm:pt-0">
                      <div className="text-right">
                        <div className="text-base font-black text-[#141414]">
                          {latestFare 
                            ? formatCurrency(latestFare.fare_amount, latestFare.currency)
                            : '$1.00 USD'}
                        </div>
                        <div className="text-[10px] font-bold text-stone-500">
                          {latestFare ? formatTimeAgo(latestFare.reported_at) : 'Estimated'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] font-black uppercase text-stone-600">
                        <span>{route.commonVehicle || 'HiAce Kombi'}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-[#F27D26]" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. Add Route & Fare Modal */}
      <AddRouteFareModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onRouteAdded={(routeId) => onSelectRoute(routeId)}
        initialCity={selectedCity}
      />

      {/* 5. Share Fare & Departures Modal */}
      <ShareFareModal
        isOpen={shareModalState.isOpen}
        onClose={() => setShareModalState({ isOpen: false, mode: 'single' })}
        mode={shareModalState.mode}
        fare={shareModalState.fare}
        allFares={latestFares}
        allAlerts={latestAlerts}
        onNavigateToBuzz={onNavigateToBuzz}
      />
    </div>
  );
};
