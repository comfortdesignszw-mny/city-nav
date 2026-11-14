import React, { useState, useMemo } from 'react';
import {
  Bus,
  Search,
  MapPin,
  Clock,
  CheckCircle2,
  Star,
  PlusCircle,
  Plus,
  Luggage,
  ThumbsUp,
  ThumbsDown,
  Layers,
  MessageSquare,
  ShieldAlert,
  Coins,
  Share2,
  Truck,
  Check,
  Trash2,
  ArrowRight,
  Phone,
} from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import {
  BusOperator,
  IntercityRoute,
  IntercityReport,
  OperatorTier,
  SocialTargetType,
  TransporterProfile,
} from '../types';
import { ReportIntercityModal } from './ReportIntercityModal';
import { CreateIntercityRouteModal } from './CreateIntercityRouteModal';
import { CreateCoachModal } from './CreateCoachModal';
import { AddReviewAbuseModal } from './AddReviewAbuseModal';
import { formatTimeAgo, formatCurrency, formatDisplayFare } from '../utils/formatters';

interface IntercityTravelViewProps {
  onSelectRoute?: (routeId: string) => void;
  onNavigateToBuzz?: () => void;
}

export const IntercityTravelView: React.FC<IntercityTravelViewProps> = ({
  onNavigateToBuzz,
}) => {
  const store = useOfflineStore();
  const routes = store.getIntercityRoutes();
  const operators = store.getBusOperators();
  const transporters = store.getTransporters();
  const reports = store.getIntercityReports();
  const socialInteractions = store.getAllSocialInteractions();
  const displayCurrency = store.getDisplayCurrency();

  const [activeTab, setActiveTab] = useState<'corridors' | 'operators' | 'reports' | 'buzz'>('corridors');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('all');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [selectedRouteForReport, setSelectedRouteForReport] = useState<string | undefined>(undefined);
  const [selectedOperatorForReport, setSelectedOperatorForReport] = useState<string | undefined>(undefined);
  const [isCreateRouteModalOpen, setIsCreateRouteModalOpen] = useState<boolean>(false);
  const [isCreateCoachModalOpen, setIsCreateCoachModalOpen] = useState<boolean>(false);

  // Social review & abuse modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ type: SocialTargetType; id: string; name: string }>({
    type: 'intercity',
    id: '',
    name: '',
  });

  // Feedback banner for boarding & Commuter Buzz share
  const [actionBanner, setActionBanner] = useState<{
    message: string;
    showBuzzLink?: boolean;
  } | null>(null);

  const showBanner = (message: string, showBuzzLink = false) => {
    setActionBanner({ message, showBuzzLink });
    setTimeout(() => {
      setActionBanner((prev) => (prev?.message === message ? null : prev));
    }, 5500);
  };

  const handleOpenReviewModal = (type: SocialTargetType, id: string, name: string) => {
    setReviewTarget({ type, id, name });
    setIsReviewModalOpen(true);
  };

  const handleOpenReportModal = (routeId?: string, operatorId?: string) => {
    setSelectedRouteForReport(routeId);
    setSelectedOperatorForReport(operatorId);
    setIsReportModalOpen(true);
  };

  const handleBoardCoachOrTrip = (targetId: string, targetName: string, city?: string) => {
    const res = store.confirmIntercityBoarding({ targetId, targetName, city });
    if (res.success) {
      showBanner(
        res.alreadyBoarded
          ? `Already checked in ("I board this Coach/Trip") for ${targetName}.`
          : `Confirmed "I board this Coach/Trip" on ${targetName} (+5 rep synced)!`
      );
    }
  };

  const handleShareToCommuterBuzz = (params: {
    targetType: SocialTargetType;
    targetId: string;
    targetName: string;
    comment: string;
    rating?: number;
    confirmedFareUSD?: number;
    confirmedDepartureTime?: string;
    recommendedLocation?: string;
  }) => {
    store.addSocialInteraction({
      targetType: params.targetType,
      targetId: params.targetId,
      targetName: params.targetName,
      postType: 'recommendation',
      comment: params.comment,
      rating: params.rating,
      confirmedFare: params.confirmedFareUSD
        ? { amount: params.confirmedFareUSD, currency: 'USD' }
        : undefined,
      confirmedDepartureTime: params.confirmedDepartureTime,
      recommendedLocation: params.recommendedLocation,
    });
    showBanner(`Shared "${params.targetName}" to Commuter Buzz!`, true);
  };

  // Registered coaches/fleets from Transporters (prioritize coaches/quantums/sprinters, also allow searching all fleets)
  const registeredFleetCoaches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const coachTypes = new Set([
      'long_distance_coach',
      'intercity_coach',
      'cross_border_quantum',
      'sprinter',
      'sprinter_22',
    ]);
    return transporters.filter((t) => {
      if (!coachTypes.has(t.transportType) && !q) return false;
      if (!q) return true;
      return (
        t.operatorName.toLowerCase().includes(q) ||
        t.currentRouteName.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        (t.vehiclePlate || '').toLowerCase().includes(q)
      );
    });
  }, [transporters, searchQuery]);

  // Filter routes
  const filteredRoutes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return routes.filter((r) => {
      if (selectedCityFilter !== 'all') {
        const matchesOrigin = r.originCity.toLowerCase() === selectedCityFilter.toLowerCase();
        const matchesDest = r.destinationCity.toLowerCase() === selectedCityFilter.toLowerCase();
        const matchesStops = r.keyStops.some((s) => s.toLowerCase() === selectedCityFilter.toLowerCase());
        if (!matchesOrigin && !matchesDest && !matchesStops) return false;
      }

      if (!q) return true;
      const matchesName = r.name.toLowerCase().includes(q);
      const matchesOrigin = r.originCity.toLowerCase().includes(q);
      const matchesDest = r.destinationCity.toLowerCase().includes(q);
      const matchesHighway = r.highwayCode.toLowerCase().includes(q);
      const matchesStops = r.keyStops.some((s) => s.toLowerCase().includes(q));
      const matchesOps = r.operators.some((op) => op.operatorName.toLowerCase().includes(q));

      return matchesName || matchesOrigin || matchesDest || matchesHighway || matchesStops || matchesOps;
    });
  }, [routes, searchQuery, selectedCityFilter]);

  // Filter operators
  const filteredOperators = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return operators.filter((op) => {
      if (selectedTierFilter !== 'all' && op.tier !== selectedTierFilter) {
        return false;
      }
      if (!q) return true;
      const matchesName = op.name.toLowerCase().includes(q);
      const matchesAlias = (op.alias || '').toLowerCase().includes(q);
      const matchesHq = op.headquarters.toLowerCase().includes(q);
      const matchesRoutes = op.popularRoutes.some((r) => r.toLowerCase().includes(q));
      return matchesName || matchesAlias || matchesHq || matchesRoutes;
    });
  }, [operators, searchQuery, selectedTierFilter]);

  // Filter reports
  const filteredReports = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return reports.filter((rep) => {
      if (!q) return true;
      const matchesOp = rep.operatorName.toLowerCase().includes(q);
      const matchesTerminal = rep.departureTerminal.toLowerCase().includes(q);
      const matchesNote = (rep.roadStatusNote || '').toLowerCase().includes(q);
      const rtName = routes.find((r) => r.id === rep.routeId)?.name.toLowerCase() || '';
      return matchesOp || matchesTerminal || matchesNote || rtName.includes(q);
    });
  }, [reports, routes, searchQuery]);

  const intercityBuzzPosts = useMemo(
    () => socialInteractions.filter((i) => i.targetType === 'intercity' || i.targetType === 'operator'),
    [socialInteractions]
  );

  const getTierBadge = (tier: OperatorTier) => {
    switch (tier) {
      case 'luxury':
        return (
          <span className="bg-[#141414] text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border border-white">
            ★ Luxury Coach
          </span>
        );
      case 'semi_luxury':
        return (
          <span className="bg-[#F27D26] text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border border-[#141414]">
            Semi-Luxury Express
          </span>
        );
      default:
        return (
          <span className="bg-[#F5F5F0] text-[#141414] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border border-[#141414]">
            Standard Bus
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Banner with Stats & Creation Actions */}
      <div className="bg-[#141414] text-white p-5 sm:p-6 border-2 border-[#141414] shadow-[4px_4px_0px_0px_#F27D26] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#F27D26] text-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest border border-white">
                Long-Distance Transit
              </span>
              <span className="text-[10px] text-stone-300 font-bold uppercase tracking-wider">
                Zimbabwe Nationwide
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Bus className="w-7 h-7 text-[#F27D26]" />
              Intercity Bus Knowledgebase
            </h1>
            <p className="text-xs sm:text-sm font-medium text-stone-300 mt-1 max-w-xl">
              Create bus trips &amp; fares, register new coaches into fleets, add highway corridors, confirm boarding (&ldquo;I board this Coach/Trip&rdquo;), and share directly to Commuter Buzz.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <button
              id="report-intercity-trip-btn"
              onClick={() => handleOpenReportModal()}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-[#F27D26] text-white text-xs font-black uppercase tracking-wider border-2 border-white hover:bg-white hover:text-[#141414] transition cursor-pointer shadow-[3px_3px_0px_0px_#ffffff] active:translate-x-0.5 active:translate-y-0.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Trip / Fare</span>
            </button>

            <button
              id="create-intercity-route-btn"
              onClick={() => setIsCreateRouteModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white text-[#141414] text-xs font-black uppercase tracking-wider border-2 border-white hover:bg-[#F27D26] hover:text-white transition cursor-pointer shadow-[3px_3px_0px_0px_#F27D26]"
            >
              <Layers className="w-4 h-4" />
              <span>+ New Corridor</span>
            </button>

            <button
              id="create-intercity-coach-btn"
              onClick={() => setIsCreateCoachModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-stone-800 text-white text-xs font-black uppercase tracking-wider border-2 border-white/70 hover:bg-[#F27D26] hover:border-white transition cursor-pointer"
            >
              <Truck className="w-4 h-4 text-[#F27D26]" />
              <span>+ New Coach</span>
            </button>
          </div>
        </div>

        {/* Quick Stat Numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t-2 border-white/20">
          <div>
            <div className="text-[10px] uppercase font-bold text-stone-400">Bus Companies &amp; Fleets</div>
            <div className="text-xl font-black text-white">
              {operators.length + registeredFleetCoaches.length} Coaches
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-stone-400">Trunk Corridors</div>
            <div className="text-xl font-black text-[#F27D26]">{routes.length} Highways</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-stone-400">Fare Range</div>
            <div className="text-xl font-black text-white">$10 – $30 USD</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-stone-400">Passenger Reports</div>
            <div className="text-xl font-black text-[#F27D26]">{reports.length} Verified</div>
          </div>
        </div>
      </div>

      {/* Action Confirmation Toast Banner */}
      {actionBanner && (
        <div className="bg-emerald-50 border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-black text-[#141414]">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span>{actionBanner.message}</span>
          </div>
          <div className="flex items-center gap-2">
            {actionBanner.showBuzzLink && onNavigateToBuzz && (
              <button
                type="button"
                onClick={onNavigateToBuzz}
                className="px-3 py-1 bg-[#141414] text-white hover:bg-[#F27D26] text-[10px] font-black uppercase border border-[#141414] cursor-pointer flex items-center gap-1"
              >
                <span>Open Commuter Buzz</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setActionBanner(null)}
              className="px-2 py-1 bg-white border border-[#141414] text-[10px] font-black uppercase cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main View Switcher Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          id="tab-corridors-btn"
          onClick={() => setActiveTab('corridors')}
          className={`py-3 px-2 sm:px-4 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'corridors'
              ? 'bg-[#141414] text-white shadow-[3px_3px_0px_0px_#F27D26]'
              : 'bg-white text-[#141414] hover:bg-[#F5F5F0]'
          }`}
        >
          <Layers className="w-4 h-4 text-[#F27D26]" />
          <span>Corridors &amp; Fares ({routes.length})</span>
        </button>

        <button
          id="tab-operators-btn"
          onClick={() => setActiveTab('operators')}
          className={`py-3 px-2 sm:px-4 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'operators'
              ? 'bg-[#141414] text-white shadow-[3px_3px_0px_0px_#F27D26]'
              : 'bg-white text-[#141414] hover:bg-[#F5F5F0]'
          }`}
        >
          <Bus className="w-4 h-4 text-[#F27D26]" />
          <span>Coaches &amp; Fleets ({operators.length + registeredFleetCoaches.length})</span>
        </button>

        <button
          id="tab-reports-btn"
          onClick={() => setActiveTab('reports')}
          className={`py-3 px-2 sm:px-4 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-[#141414] text-white shadow-[3px_3px_0px_0px_#F27D26]'
              : 'bg-white text-[#141414] hover:bg-[#F5F5F0]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-[#F27D26]" />
          <span>Trip Reports ({reports.length})</span>
        </button>

        <button
          id="tab-buzz-btn"
          onClick={() => setActiveTab('buzz')}
          className={`py-3 px-2 sm:px-4 text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'buzz'
              ? 'bg-[#141414] text-white shadow-[3px_3px_0px_0px_#F27D26]'
              : 'bg-white text-[#141414] hover:bg-[#F5F5F0]'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-[#F27D26]" />
          <span>Coach Buzz ({intercityBuzzPosts.length})</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414]">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            id="intercity-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'corridors'
                ? 'Search intercity route (e.g. Harare to Bulawayo, Mutare, Beitbridge, A5, CAG)...'
                : activeTab === 'operators'
                ? 'Search bus company or registered fleet (e.g. CAG, City Link, Inter Africa, plate)...'
                : 'Search commuter reports by bus name, terminal, or highway...'
            }
            className="w-full pl-11 pr-12 py-3 bg-[#F5F5F0] focus:bg-white text-[#141414] placeholder:text-stone-400 font-bold text-xs sm:text-sm border-2 border-[#141414] focus:outline-none focus:ring-2 focus:ring-[#F27D26] shadow-[2px_2px_0px_0px_#141414]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#141414] hover:text-[#F27D26] text-xs font-black uppercase cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Filter Tags */}
        {activeTab === 'corridors' && (
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[10px] text-[#141414]/60 font-black uppercase tracking-wider flex-shrink-0">
              City Hub:
            </span>
            {['all', 'Harare', 'Bulawayo', 'Mutare', 'Masvingo', 'Gweru', 'Kwekwe', 'Beitbridge', 'Victoria Falls'].map((city) => (
              <button
                key={city}
                onClick={() => setSelectedCityFilter(city)}
                className={`px-2.5 py-1 text-xs font-black uppercase tracking-wider border border-[#141414] whitespace-nowrap cursor-pointer transition ${
                  selectedCityFilter === city
                    ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                    : 'bg-[#F5F5F0] text-[#141414] hover:bg-white'
                }`}
              >
                {city === 'all' ? 'All Hubs' : city}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'operators' && (
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[10px] text-[#141414]/60 font-black uppercase tracking-wider flex-shrink-0">
              Coach Tier:
            </span>
            {[
              { id: 'all', label: 'All Operators' },
              { id: 'luxury', label: 'Luxury Coaches (A/C & Wi-Fi)' },
              { id: 'semi_luxury', label: 'Semi-Luxury Express' },
              { id: 'standard', label: 'Standard Intercity' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedTierFilter(item.id)}
                className={`px-2.5 py-1 text-xs font-black uppercase tracking-wider border border-[#141414] whitespace-nowrap cursor-pointer transition ${
                  selectedTierFilter === item.id
                    ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                    : 'bg-[#F5F5F0] text-[#141414] hover:bg-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* VIEW 1: CORRIDORS & FARE COMPARISONS */}
      {activeTab === 'corridors' && (
        <div className="space-y-4">
          {/* Corridor Creation Callout Bar */}
          <div className="bg-white p-3.5 sm:p-4 border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase text-[#141414]">
                Available Intercity Routes &amp; Highway Corridors
              </h3>
              <p className="text-xs font-bold text-stone-600">
                Missing your intercity route? Add any highway corridor and it saves to your local DB and global list.
              </p>
            </div>
            <button
              onClick={() => setIsCreateRouteModalOpen(true)}
              className="px-3.5 py-2 bg-[#141414] hover:bg-[#F27D26] text-white text-xs font-black uppercase tracking-wider border-2 border-[#141414] shadow-[2px_2px_0px_0px_#F27D26] transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Intercity Route / Corridor</span>
            </button>
          </div>

          {filteredRoutes.length === 0 ? (
            <div className="bg-white p-8 sm:p-10 text-center border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] space-y-3">
              <div className="w-14 h-14 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_#F27D26]">
                <Search className="w-7 h-7 text-[#F27D26]" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h4 className="text-base sm:text-lg font-black text-[#141414] uppercase">No Corridors Found</h4>
                <p className="text-xs sm:text-sm font-medium text-stone-600">
                  Nothing matches your search or filter. Create a new intercity corridor or reset filters.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => setIsCreateRouteModalOpen(true)}
                  className="py-2.5 px-5 bg-[#F27D26] hover:bg-[#141414] text-white font-black text-xs uppercase tracking-wider border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] transition cursor-pointer"
                >
                  + Create New Corridor
                </button>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCityFilter('all');
                  }}
                  className="py-2.5 px-5 bg-[#141414] hover:bg-[#F27D26] text-white font-black text-xs uppercase tracking-wider border-2 border-[#141414] shadow-[2px_2px_0px_0px_#F27D26] transition cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          ) : (
            filteredRoutes.map((route) => {
              const routeBoardingCount = store.getIntercityBoardingCount(route.id);
              const routeBoardedRecently = store.hasUserBoardedIntercityRecently(route.id);
              const routeReact = store.getIntercityReactionSummary(`corridor_${route.id}`);
              const routeTrips = reports.filter((rep) => rep.routeId === route.id);
              const matchingFleets = registeredFleetCoaches.filter(
                (t) =>
                  t.currentRouteId === route.id ||
                  t.currentRouteName.toLowerCase().includes(route.originCity.toLowerCase()) ||
                  t.currentRouteName.toLowerCase().includes(route.destinationCity.toLowerCase())
              );

              return (
                <div
                  key={route.id}
                  id={`intercity-route-${route.id}`}
                  className="bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] p-4 sm:p-5 space-y-4"
                >
                  {/* Route Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b-2 border-[#141414]/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="bg-[#141414] text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border border-[#141414]">
                          {route.highwayCode}
                        </span>
                        <span className="text-xs font-black uppercase text-[#F27D26]">
                          {route.distanceKm} km • ~{route.estimatedDurationHours} hours transit
                        </span>
                        {route.createdByUsername && (
                          <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 px-1.5 py-0.5 border border-emerald-300">
                            Added by {route.createdByUsername}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-[#141414] uppercase tracking-tight">
                        {route.name}
                      </h2>
                      <p className="text-xs font-bold text-stone-600 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[#141414]">Key Stops:</span>
                        {route.keyStops.map((stop, i) => (
                          <span key={i} className="inline-flex items-center">
                            <span className="text-[#F27D26]">{stop}</span>
                            {i < route.keyStops.length - 1 && <span className="text-stone-400 mx-1">•</span>}
                          </span>
                        ))}
                      </p>
                    </div>

                    <div className="text-left sm:text-right flex-shrink-0">
                      <div className="text-[10px] font-black uppercase text-[#141414]/60">
                        Fare Range ({displayCurrency})
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-[#141414]">
                        {formatDisplayFare(route.fareRange.min, 'USD', displayCurrency)} –{' '}
                        {formatDisplayFare(route.fareRange.max, 'USD', displayCurrency)}
                      </div>
                      {routeTrips.length > 0 && (
                        <div className="text-[10px] font-black uppercase text-[#F27D26]">
                          {routeTrips.length} Live Trip Reports
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interactive Action Bar: Board, Like, Review, Share to Buzz, Report Trip */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBoardCoachOrTrip(route.id, route.name, route.originCity)}
                      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer flex items-center gap-1.5 ${
                        routeBoardedRecently
                          ? 'bg-[#10B981] text-white shadow-[2px_2px_0px_0px_#141414]'
                          : 'bg-[#F27D26] text-white hover:bg-[#141414] shadow-[2px_2px_0px_0px_#141414]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {routeBoardedRecently ? 'Boarded Coach/Trip' : 'I board this Coach/Trip'} ({routeBoardingCount})
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => store.toggleIntercityLike(`corridor_${route.id}`)}
                      className={`px-2.5 py-1.5 text-[10px] font-black uppercase border-2 border-[#141414] transition cursor-pointer flex items-center gap-1 ${
                        routeReact.myReaction === 'like'
                          ? 'bg-[#141414] text-[#F27D26]'
                          : 'bg-[#F5F5F0] text-[#141414] hover:bg-white'
                      }`}
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>Like ({routeReact.likes})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenReviewModal('intercity', route.id, route.name)}
                      className="px-2.5 py-1.5 bg-[#141414] text-white hover:bg-[#F27D26] text-[10px] font-black uppercase border-2 border-[#141414] transition cursor-pointer flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Rate &amp; Review</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleShareToCommuterBuzz({
                          targetType: 'intercity',
                          targetId: route.id,
                          targetName: route.name,
                          comment: `Intercity Corridor Update: ${route.name} (${route.highwayCode}, ${route.distanceKm} km). Typical fares $${route.fareRange.min}–$${route.fareRange.max} USD. Key stops: ${route.keyStops.join(', ')}.`,
                          confirmedFareUSD: route.averageFareUSD,
                          recommendedLocation: route.departureHubs[0]?.terminal,
                        })
                      }
                      className="px-2.5 py-1.5 bg-white hover:bg-[#141414] hover:text-white text-[#141414] text-[10px] font-black uppercase border-2 border-[#141414] transition cursor-pointer flex items-center gap-1"
                    >
                      <Share2 className="w-3 h-3 text-[#F27D26]" />
                      <span>Share to Buzz</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenReportModal(route.id)}
                      className="px-2.5 py-1.5 bg-[#F5F5F0] hover:bg-stone-200 text-[#141414] text-[10px] font-black uppercase border-2 border-[#141414] transition cursor-pointer"
                    >
                      + Report Trip / Fare
                    </button>
                  </div>

                  {/* Departure Terminals Info */}
                  {route.departureHubs.length > 0 && (
                    <div className="bg-[#F5F5F0] p-3 border-2 border-[#141414] text-xs">
                      <div className="font-black uppercase tracking-wider text-[#141414] mb-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#F27D26]" />
                        <span>Official Boarding &amp; Pick-up Termini:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-700 font-bold">
                        {route.departureHubs.map((hub, idx) => (
                          <div key={idx} className="flex items-baseline gap-1.5">
                            <span className="text-[#141414] font-black uppercase text-[10px] bg-white px-1.5 py-0.5 border border-[#141414]">
                              {hub.city}:
                            </span>
                            <span className="text-xs">{hub.terminal}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Registered Coaches from Transporters operating on this corridor */}
                  {matchingFleets.length > 0 && (
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#141414] mb-2 flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-[#F27D26]" />
                        <span>Registered Fleet Coaches Serving This Corridor ({matchingFleets.length}):</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {matchingFleets.map((fleet) => {
                          const fBoardTarget = `${route.id}_${fleet.id}`.slice(0, 128);
                          const fBoardCount = store.getIntercityBoardingCount(fBoardTarget);
                          const fBoarded = store.hasUserBoardedIntercityRecently(fBoardTarget);
                          return (
                            <div
                              key={fleet.id}
                              className="p-3 bg-amber-50/70 border-2 border-[#141414] flex flex-col justify-between gap-2"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-black text-xs uppercase text-[#141414]">
                                    {fleet.operatorName}
                                  </span>
                                  {fleet.vehiclePlate && (
                                    <span className="bg-[#141414] text-white px-1.5 py-0.5 text-[9px] font-black uppercase">
                                      {fleet.vehiclePlate}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] font-bold text-stone-600 mt-0.5">
                                  {fleet.transportTypeLabel} • {fleet.baseTerminus || fleet.city} • {fleet.contactPhone}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleBoardCoachOrTrip(
                                      fBoardTarget,
                                      `${fleet.operatorName} (${route.name})`,
                                      fleet.city
                                    )
                                  }
                                  className={`px-2 py-1 text-[10px] font-black uppercase border border-[#141414] cursor-pointer ${
                                    fBoarded
                                      ? 'bg-[#10B981] text-white'
                                      : 'bg-[#F27D26] text-white hover:bg-[#141414]'
                                  }`}
                                >
                                  I board ({fBoardCount})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenReportModal(route.id, fleet.id)}
                                  className="px-2 py-1 text-[10px] font-black uppercase bg-[#141414] text-white hover:bg-[#F27D26] border border-[#141414] cursor-pointer"
                                >
                                  Report Trip
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Operators Operating this Corridor Side-by-Side */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#141414] mb-2.5 flex items-center gap-1.5">
                      <Bus className="w-4 h-4 text-[#F27D26]" />
                      <span>
                        {route.operators.length > 0
                          ? 'Bus Companies Operating on this Highway:'
                          : 'No scheduled operators listed yet — report a trip or register a coach above!'}
                      </span>
                    </h4>

                    <div className="space-y-2.5">
                      {route.operators.map((opService, idx) => {
                        const svcTargetId = `${route.id}_${opService.operatorId}`.slice(0, 128);
                        const svcBoardCount = store.getIntercityBoardingCount(svcTargetId);
                        const svcBoarded = store.hasUserBoardedIntercityRecently(svcTargetId);
                        return (
                          <div
                            key={idx}
                            className="p-3 bg-white border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] hover:shadow-[3px_3px_0px_0px_#F27D26] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="text-base font-black text-[#141414] uppercase">
                                  {opService.operatorName}
                                </h5>
                                {getTierBadge(opService.tier)}
                                <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.2 border border-emerald-300">
                                  {opService.reliabilityScore}% Reliability
                                </span>
                              </div>

                              <div className="text-xs text-stone-600 font-bold flex items-center gap-2 flex-wrap">
                                <span className="text-[#141414]">Boarding: {opService.departureHub}</span>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                {opService.typicalDepartures.map((time, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="bg-[#F5F5F0] text-[#141414] px-2 py-0.5 text-[10px] font-black uppercase border border-[#141414]"
                                  >
                                    ⏱ {time}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Price Tag & Action */}
                            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 flex-shrink-0">
                              <div className="text-right">
                                <span className="text-xl sm:text-2xl font-black text-[#141414]">
                                  {formatDisplayFare(opService.fareUSD, 'USD', displayCurrency)}
                                </span>
                                {displayCurrency !== 'USD' && (
                                  <div className="text-[10px] font-black text-stone-600">
                                    ${opService.fareUSD} USD
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleBoardCoachOrTrip(
                                      svcTargetId,
                                      `${opService.operatorName} (${route.name})`,
                                      route.originCity
                                    )
                                  }
                                  className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider border border-[#141414] cursor-pointer transition ${
                                    svcBoarded
                                      ? 'bg-[#10B981] text-white'
                                      : 'bg-[#F27D26] text-white hover:bg-[#141414]'
                                  }`}
                                >
                                  I board ({svcBoardCount})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenReportModal(route.id, opService.operatorId)}
                                  className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-[#141414] text-white hover:bg-[#F27D26] transition border border-[#141414] cursor-pointer"
                                >
                                  Report Trip
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: BUS OPERATORS & REGISTERED FLEETS DIRECTORY */}
      {activeTab === 'operators' && (
        <div className="space-y-5">
          <div className="bg-white p-4 border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase text-[#141414]">
                Coach Companies &amp; Registered Fleet Transporters
              </h3>
              <p className="text-xs font-bold text-stone-600">
                Create a new coach fleet (synced to Transporters &amp; Vehicle Trips), like, board, review, or share to Commuter Buzz.
              </p>
            </div>
            <button
              onClick={() => setIsCreateCoachModalOpen(true)}
              className="px-3.5 py-2 bg-[#141414] hover:bg-[#F27D26] text-white text-xs font-black uppercase border-2 border-[#141414] shadow-[2px_2px_0px_0px_#F27D26] transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Coach / Transport</span>
            </button>
          </div>

          {/* Registered Coaches & Fleets from Transporters */}
          {registeredFleetCoaches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#141414] flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#F27D26]" />
                  <span>Registered Coaches &amp; Fleets (from Transporters Directory)</span>
                </h4>
                <span className="bg-[#F27D26] text-white px-2 py-0.5 text-[10px] font-black uppercase border border-[#141414]">
                  {registeredFleetCoaches.length} Registered
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {registeredFleetCoaches.map((fleet: TransporterProfile) => {
                  const boardCount = store.getIntercityBoardingCount(fleet.id);
                  const boarded = store.hasUserBoardedIntercityRecently(fleet.id);
                  return (
                    <div
                      key={fleet.id}
                      className="bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] p-4 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="bg-[#F27D26] text-white px-2 py-0.5 text-[9px] font-black uppercase border border-[#141414]">
                            {fleet.transportTypeLabel}
                          </span>
                          {fleet.vehiclePlate && (
                            <span className="bg-[#141414] text-white px-2 py-0.5 text-[10px] font-black uppercase">
                              {fleet.vehiclePlate}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-black text-[#141414] uppercase">
                          {fleet.operatorName}
                        </h3>
                        <p className="text-xs font-bold text-stone-600 mt-0.5">
                          Corridor: <strong className="text-[#141414]">{fleet.currentRouteName}</strong> ({fleet.city})
                        </p>
                        <p className="text-xs font-bold text-stone-600 flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3 text-[#F27D26]" />
                          <span>{fleet.contactPhone}</span>
                          {fleet.baseTerminus && <span>• {fleet.baseTerminus}</span>}
                        </p>
                        {fleet.statusNote && (
                          <p className="mt-2 p-2 bg-[#F5F5F0] border border-[#141414] text-[11px] font-bold text-[#141414]">
                            {fleet.statusNote}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t-2 border-[#141414]/10 flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => store.toggleLikeTransporter(fleet.id)}
                          className={`px-2.5 py-1 text-[10px] font-black uppercase border border-[#141414] cursor-pointer flex items-center gap-1 ${
                            fleet.userLiked ? 'bg-[#141414] text-[#F27D26]' : 'bg-[#F5F5F0] text-[#141414]'
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>{fleet.likes}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleBoardCoachOrTrip(fleet.id, fleet.operatorName, fleet.city)}
                          className={`px-2.5 py-1 text-[10px] font-black uppercase border border-[#141414] cursor-pointer ${
                            boarded ? 'bg-[#10B981] text-white' : 'bg-[#F27D26] text-white hover:bg-[#141414]'
                          }`}
                        >
                          {boarded ? 'Boarded' : 'I board this Coach'} ({boardCount})
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenReviewModal('transporter', fleet.id, fleet.operatorName)}
                          className="px-2.5 py-1 bg-[#141414] hover:bg-[#F27D26] text-white text-[10px] font-black uppercase border border-[#141414] cursor-pointer"
                        >
                          Review
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleShareToCommuterBuzz({
                              targetType: 'transporter',
                              targetId: fleet.id,
                              targetName: fleet.operatorName,
                              comment: `Registered Coach Fleet: ${fleet.operatorName} (${fleet.transportTypeLabel}${fleet.vehiclePlate ? ` • ${fleet.vehiclePlate}` : ''}) serving ${fleet.currentRouteName} in ${fleet.city}. Tel: ${fleet.contactPhone}.`,
                              recommendedLocation: fleet.baseTerminus || fleet.city,
                            })
                          }
                          className="px-2.5 py-1 bg-white hover:bg-[#141414] hover:text-white text-[#141414] text-[10px] font-black uppercase border border-[#141414] cursor-pointer flex items-center gap-1"
                        >
                          <Share2 className="w-3 h-3 text-[#F27D26]" />
                          <span>Buzz</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenReportModal(fleet.currentRouteId, fleet.id)}
                          className="px-2.5 py-1 bg-[#F5F5F0] hover:bg-stone-200 text-[#141414] text-[10px] font-black uppercase border border-[#141414] cursor-pointer"
                        >
                          + Create Trip
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Major Bus Companies Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredOperators.length === 0 ? (
              <div className="col-span-full bg-white p-8 sm:p-10 text-center border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] space-y-3">
                <div className="w-14 h-14 bg-[#F5F5F0] border-2 border-[#141414] shadow-[2px_2px_0px_0px_#F27D26] flex items-center justify-center mx-auto text-[#141414]">
                  <Bus className="w-7 h-7 text-[#F27D26]" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h4 className="text-base sm:text-lg font-black text-[#141414] uppercase">No Bus Fleets Found</h4>
                  <p className="text-xs sm:text-sm font-medium text-stone-600">
                    No coach companies match your query. Register a new coach or reset filters.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTierFilter('all');
                  }}
                  className="py-2.5 px-5 bg-[#141414] hover:bg-[#F27D26] text-white font-black text-xs uppercase tracking-wider border-2 border-[#141414] shadow-[2px_2px_0px_0px_#F27D26] transition cursor-pointer"
                >
                  Show All Bus Companies
                </button>
              </div>
            ) : (
              filteredOperators.map((operator) => {
                const opReact = store.getIntercityReactionSummary(`op_${operator.id}`);
                const opBoardCount = store.getIntercityBoardingCount(operator.id);
                const opBoarded = store.hasUserBoardedIntercityRecently(operator.id);

                return (
                  <div
                    key={operator.id}
                    id={`operator-card-${operator.id}`}
                    className="bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] p-4 sm:p-5 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      {/* Top: Tier badge & Star rating */}
                      <div className="flex items-center justify-between mb-2">
                        {getTierBadge(operator.tier)}
                        <div className="flex items-center gap-1 bg-[#F5F5F0] px-2 py-0.5 border border-[#141414]">
                          <Star className="w-3.5 h-3.5 fill-[#F27D26] text-[#F27D26]" />
                          <span className="text-xs font-black text-[#141414]">{operator.rating}</span>
                          <span className="text-[10px] text-stone-500 font-bold">({operator.reviewsCount})</span>
                        </div>
                      </div>

                      <h3 className="text-xl font-black text-[#141414] uppercase tracking-tight">
                        {operator.name}
                      </h3>
                      <p className="text-xs font-bold text-stone-500 mb-2">
                        HQ: {operator.headquarters} • Tel: {operator.phone || 'Terminal Desk'}
                      </p>

                      <p className="text-xs text-stone-700 font-medium leading-relaxed mb-3">
                        {operator.description}
                      </p>

                      {/* Luggage Policy Box */}
                      <div className="bg-[#F5F5F0] p-2.5 border-2 border-[#141414] text-xs mb-3">
                        <div className="flex items-center gap-1.5 font-black uppercase text-[#141414] text-[10px] mb-1">
                          <Luggage className="w-3.5 h-3.5 text-[#F27D26]" />
                          <span>Luggage &amp; Cargo Allowance:</span>
                        </div>
                        <p className="text-[11px] font-bold text-stone-700">
                          {operator.luggagePolicy}
                        </p>
                      </div>

                      {/* Amenities */}
                      <div className="space-y-1 mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#141414]/70">
                          Onboard Amenities:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {operator.amenities.map((amenity, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-bold bg-white text-[#141414] px-2 py-0.5 border border-[#141414]"
                            >
                              ✓ {amenity}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Boarding Info */}
                      <div className="text-xs text-stone-700 font-bold">
                        <span className="text-[#141414] font-black uppercase text-[10px] block">
                          Boarding &amp; Booking Point:
                        </span>
                        <span className="text-[11px]">{operator.bookingInfo}</span>
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="pt-3 border-t-2 border-[#141414]/10 flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => store.toggleIntercityLike(`op_${operator.id}`)}
                        className={`px-2.5 py-1.5 text-[10px] font-black uppercase border border-[#141414] transition cursor-pointer flex items-center gap-1 ${
                          opReact.myReaction === 'like'
                            ? 'bg-[#141414] text-[#F27D26]'
                            : 'bg-[#F5F5F0] text-[#141414] hover:bg-white'
                        }`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>{opReact.likes}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleBoardCoachOrTrip(operator.id, operator.name, operator.headquarters)
                        }
                        className={`px-2.5 py-1.5 text-[10px] font-black uppercase border border-[#141414] transition cursor-pointer flex items-center gap-1 ${
                          opBoarded
                            ? 'bg-[#10B981] text-white'
                            : 'bg-[#F27D26] text-white hover:bg-[#141414]'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{opBoarded ? 'Boarded' : 'I board this Coach'} ({opBoardCount})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenReviewModal('operator', operator.id, operator.name)}
                        className="px-2.5 py-1.5 bg-[#141414] hover:bg-[#F27D26] text-white text-[10px] font-black uppercase border border-[#141414] transition cursor-pointer flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Review</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleShareToCommuterBuzz({
                            targetType: 'operator',
                            targetId: operator.id,
                            targetName: operator.name,
                            comment: `Coach Recommendation: ${operator.name} (${operator.tier.replace('_', ' ')}) — ${operator.bookingInfo}. Rating ${operator.rating}★.`,
                            rating: Math.round(operator.rating),
                            recommendedLocation: operator.headquarters,
                          })
                        }
                        className="px-2.5 py-1.5 bg-white hover:bg-[#141414] hover:text-white text-[#141414] text-[10px] font-black uppercase border border-[#141414] transition cursor-pointer flex items-center gap-1"
                      >
                        <Share2 className="w-3 h-3 text-[#F27D26]" />
                        <span>Share Buzz</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenReportModal(undefined, operator.id)}
                        className="px-2.5 py-1.5 bg-[#F5F5F0] hover:bg-stone-200 text-[#141414] text-[10px] font-black uppercase border border-[#141414] transition cursor-pointer"
                      >
                        + Report Fare
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: LIVE COMMUTER REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white p-4 border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase text-[#141414]">
                Crowdsourced Intercity Travel Reports
              </h3>
              <p className="text-xs font-bold text-stone-600">
                Recent passenger trips, fares paid, boarding confirmations (&ldquo;I board this Coach/Trip&rdquo;), likes, reviews, and Commuter Buzz shares.
              </p>
            </div>
            <button
              onClick={() => handleOpenReportModal()}
              className="px-3 py-1.5 bg-[#F27D26] text-white text-xs font-black uppercase border-2 border-[#141414] hover:bg-[#141414] transition cursor-pointer shadow-[2px_2px_0px_0px_#141414] self-start sm:self-auto whitespace-nowrap"
            >
              + Create Trip / Fare Report
            </button>
          </div>

          <div className="space-y-3">
            {filteredReports.length === 0 ? (
              <div className="bg-white p-8 sm:p-10 text-center border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] space-y-3">
                <div className="w-14 h-14 bg-[#F5F5F0] border-2 border-[#141414] shadow-[2px_2px_0px_0px_#F27D26] flex items-center justify-center mx-auto text-[#141414]">
                  <Bus className="w-7 h-7 text-[#F27D26]" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#F27D26] block">
                    Clean Production Board
                  </span>
                  <h4 className="text-base sm:text-lg font-black text-[#141414] uppercase">
                    No Coach Reports Submitted Yet
                  </h4>
                  <p className="text-xs sm:text-sm font-medium text-stone-600 leading-relaxed">
                    Submit your intercity trip fare, departure time, and coach condition — you can select any fleet registered in Transporters or create a new coach inline!
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <button
                    onClick={() => handleOpenReportModal()}
                    className="py-2.5 px-5 bg-[#141414] hover:bg-[#F27D26] text-white font-black text-xs uppercase tracking-wider border-2 border-[#141414] shadow-[2px_2px_0px_0px_#F27D26] transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Create Intercity Trip Report</span>
                  </button>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="py-2.5 px-4 bg-[#F5F5F0] hover:bg-stone-200 text-[#141414] font-black text-xs uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer"
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              </div>
            ) : (
              filteredReports.map((rep) => {
                const rt = routes.find((r) => r.id === rep.routeId);
                const tripBoardCount = store.getIntercityBoardingCount(rep.id);
                const tripBoarded = store.hasUserBoardedIntercityRecently(rep.id);
                const isMine = store.isOwnerOf(rep.ownerUid, rep.reporterDeviceId);

                return (
                  <div
                    key={rep.id}
                    id={`intercity-report-${rep.id}`}
                    className="bg-white p-4 sm:p-5 border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] space-y-3"
                  >
                    {/* Top Row: Operator, Route, and Price */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="bg-[#141414] text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest border border-[#141414]">
                            {rep.operatorName}
                          </span>
                          <span className="text-[10px] font-black uppercase text-[#F27D26]">
                            {rt?.name || 'Intercity Highway'}
                          </span>
                          <span className="text-[10px] text-stone-500 font-bold">
                            • {formatTimeAgo(rep.reportedAt)}
                          </span>
                          {rep.reporterUsername && (
                            <span className="text-[10px] text-stone-500 font-bold">
                              by <strong className="text-[#141414]">{rep.reporterUsername}</strong>
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-bold text-stone-700 flex items-center gap-2 flex-wrap">
                          <span>Terminal: <strong>{rep.departureTerminal}</strong></span>
                          {rep.departureTime && <span>• Dep: <strong>{rep.departureTime}</strong></span>}
                        </div>
                      </div>

                      {/* Fare Badge */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-black text-[#141414]">
                          {formatDisplayFare(rep.farePaidUSD, 'USD', displayCurrency)}
                        </div>
                        <div className="text-[10px] font-black text-stone-600">
                          {rep.farePaidUSD ? `$${rep.farePaidUSD} USD` : ''}
                          {rep.farePaidZiG ? ` • ZWG ${rep.farePaidZiG}` : ''}
                          {rep.farePaidZAR ? ` • R${rep.farePaidZAR}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Seat, Condition & Boarding Count */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border border-[#141414] ${
                          rep.seatAvailability === 'plenty'
                            ? 'bg-emerald-100 text-emerald-900'
                            : rep.seatAvailability === 'filling_fast'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-rose-100 text-rose-900'
                        }`}
                      >
                        {rep.seatAvailability === 'plenty'
                          ? 'Plenty Seats Open'
                          : rep.seatAvailability === 'filling_fast'
                          ? 'Filling Up Fast'
                          : 'Bus Packed'}
                      </span>

                      <span className="bg-[#F5F5F0] text-[#141414] px-2 py-0.5 text-[10px] font-black uppercase border border-[#141414] flex items-center gap-1">
                        ★ Condition: {rep.busConditionRating}/5
                      </span>

                      <span className="bg-emerald-50 text-emerald-900 px-2 py-0.5 text-[10px] font-black uppercase border border-emerald-400">
                        {tripBoardCount === 1
                          ? '1 commuter boarded this Coach/Trip'
                          : `${tripBoardCount} commuters boarded this Coach/Trip`}
                      </span>
                    </div>

                    {/* Road Note if present */}
                    {rep.roadStatusNote && (
                      <div className="p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-xs font-bold text-[#141414] flex items-center gap-2">
                        <span className="text-[#F27D26] font-black uppercase text-[10px]">Passenger Update:</span>
                        <span>&ldquo;{rep.roadStatusNote}&rdquo;</span>
                      </div>
                    )}

                    {/* Action Row: I board this Coach/Trip, Likes, Reviews, Share to Buzz, Delete */}
                    <div className="pt-2.5 border-t border-[#141414]/15 flex items-center justify-between gap-2 flex-wrap text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            handleBoardCoachOrTrip(
                              rep.id,
                              `${rep.operatorName} (${rt?.name || 'Intercity'})`,
                              rt?.originCity
                            )
                          }
                          className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer flex items-center gap-1 ${
                            tripBoarded
                              ? 'bg-[#10B981] text-white'
                              : 'bg-[#F27D26] text-white hover:bg-[#141414] shadow-[2px_2px_0px_0px_#141414]'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{tripBoarded ? 'Boarded' : 'I board this Coach/Trip'} ({tripBoardCount})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => store.voteIntercityReport(rep.id, 'up')}
                          className={`px-2 py-1.5 flex items-center gap-1 text-[10px] font-black uppercase border border-[#141414] transition cursor-pointer ${
                            rep.userVote === 'up'
                              ? 'bg-[#141414] text-white'
                              : 'bg-[#F5F5F0] text-[#141414] hover:bg-white'
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3 text-[#F27D26]" />
                          <span>Like ({rep.upvotes})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => store.voteIntercityReport(rep.id, 'down')}
                          className={`px-2 py-1.5 flex items-center gap-1 text-[10px] font-black uppercase border border-[#141414] transition cursor-pointer ${
                            rep.userVote === 'down'
                              ? 'bg-[#141414] text-white'
                              : 'bg-[#F5F5F0] text-[#141414] hover:bg-white'
                          }`}
                        >
                          <ThumbsDown className="w-3 h-3 text-stone-500" />
                          <span>{rep.downvotes}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleOpenReviewModal(
                              'intercity',
                              rep.routeId,
                              `${rep.operatorName} • ${rt?.name || 'Intercity'}`
                            )
                          }
                          className="px-2.5 py-1.5 bg-[#141414] text-white hover:bg-[#F27D26] text-[10px] font-black uppercase border border-[#141414] transition cursor-pointer flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Review</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleShareToCommuterBuzz({
                              targetType: 'intercity',
                              targetId: rep.routeId,
                              targetName: `${rep.operatorName} • ${rt?.name || 'Intercity'}`,
                              comment: `Trip Report: ${rep.operatorName} on ${rt?.name || 'Intercity'} departing ${rep.departureTerminal}${rep.departureTime ? ` at ${rep.departureTime}` : ''}. Seats: ${rep.seatAvailability.replace('_', ' ')}.${rep.roadStatusNote ? ` "${rep.roadStatusNote}"` : ''}`,
                              rating: rep.busConditionRating,
                              confirmedFareUSD: rep.farePaidUSD,
                              confirmedDepartureTime: rep.departureTime,
                              recommendedLocation: rep.departureTerminal,
                            })
                          }
                          className="px-2.5 py-1.5 bg-white hover:bg-[#141414] hover:text-white text-[#141414] text-[10px] font-black uppercase border border-[#141414] transition cursor-pointer flex items-center gap-1"
                        >
                          <Share2 className="w-3 h-3 text-[#F27D26]" />
                          <span>Share to Buzz</span>
                        </button>
                      </div>

                      {isMine && (
                        <button
                          type="button"
                          onClick={() => store.deleteIntercityReport(rep.id)}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 text-[10px] font-black uppercase border border-rose-400 transition cursor-pointer flex items-center gap-1"
                          title="Delete my trip report"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: COACH BUZZ & SOCIAL REVIEWS */}
      {activeTab === 'buzz' && (
        <div className="space-y-4">
          <div className="bg-white p-4 border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase text-[#141414] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#F27D26]" />
                <span>Intercity Commuter Buzz &amp; Reviews</span>
              </h3>
              <p className="text-xs font-bold text-stone-600">
                Rate coaches, confirm departing times &amp; amenities (AC, Wi-Fi, USB), and share directly with the global Commuter Buzz feed.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() =>
                  handleOpenReviewModal(
                    'intercity',
                    routes[0]?.id || 'route-harare-bulawayo',
                    routes[0]?.name || 'Harare to Bulawayo'
                  )
                }
                className="px-4 py-2 bg-[#141414] text-white hover:bg-[#F27D26] text-xs font-black uppercase border-2 border-[#141414] transition cursor-pointer shadow-[3px_3px_0px_0px_#F27D26] whitespace-nowrap"
              >
                + Post Coach Buzz / Review
              </button>
              {onNavigateToBuzz && (
                <button
                  onClick={onNavigateToBuzz}
                  className="px-3.5 py-2 bg-[#F5F5F0] hover:bg-[#141414] hover:text-white text-[#141414] text-xs font-black uppercase border-2 border-[#141414] transition cursor-pointer flex items-center gap-1 whitespace-nowrap"
                >
                  <span>Full Commuter Buzz</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {intercityBuzzPosts.length === 0 ? (
              <div className="p-8 text-center bg-white border-2 border-[#141414]">
                <MessageSquare className="w-10 h-10 text-stone-400 mx-auto mb-2" />
                <h4 className="text-sm font-black text-[#141414] uppercase">No Coach Buzz Yet</h4>
                <p className="text-xs font-bold text-stone-500 mt-1">
                  Be the first to rate your intercity trip or share a coach update to Commuter Buzz!
                </p>
              </div>
            ) : (
              intercityBuzzPosts.map((buzz) => {
                const isAbuse = buzz.isAbuseReport;
                return (
                  <div
                    key={buzz.id}
                    className={`bg-white border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] p-4 ${
                      isAbuse ? 'border-l-8 border-l-[#EF4444]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 flex items-center justify-center font-black text-white text-xs border border-[#141414]"
                          style={{ backgroundColor: buzz.avatarBg || '#F27D26' }}
                        >
                          {buzz.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-xs text-[#141414]">{buzz.username}</span>
                            <span className="text-[10px] text-stone-400 font-bold">{buzz.userHandle}</span>
                            {buzz.userBadge && (
                              <span className="bg-[#141414] text-white px-1.5 py-0.2 text-[8px] font-black uppercase">
                                {buzz.userBadge}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-stone-500 font-bold">
                            on <strong className="text-[#141414] uppercase">{buzz.targetName}</strong> •{' '}
                            {formatTimeAgo(buzz.createdAt)}
                          </div>
                        </div>
                      </div>

                      {isAbuse ? (
                        <span className="bg-[#EF4444] text-white px-2 py-0.5 text-[9px] font-black uppercase flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" />
                          Abuse Alert
                        </span>
                      ) : buzz.rating ? (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= buzz.rating! ? 'fill-[#F27D26] text-[#141414]' : 'text-stone-200'
                              }`}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <p className="text-xs font-bold text-stone-800 leading-relaxed my-2">{buzz.comment}</p>

                    {buzz.amenitiesReview && (
                      <div className="p-2 bg-[#F5F5F0] border border-stone-300 text-[10px] font-black uppercase flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-stone-500">Reported Amenities:</span>
                        <span
                          className={
                            (buzz.amenitiesReview.acWorking ?? buzz.amenitiesReview.ac)
                              ? 'text-emerald-700 bg-emerald-100 px-1.5 py-0.5'
                              : 'text-stone-400 bg-stone-200 px-1.5 py-0.5'
                          }
                        >
                          AC: {(buzz.amenitiesReview.acWorking ?? buzz.amenitiesReview.ac) ? 'Working' : 'Off'}
                        </span>
                        <span
                          className={
                            (buzz.amenitiesReview.usbCharging ?? buzz.amenitiesReview.usb)
                              ? 'text-emerald-700 bg-emerald-100 px-1.5 py-0.5'
                              : 'text-stone-400 bg-stone-200 px-1.5 py-0.5'
                          }
                        >
                          USB: {(buzz.amenitiesReview.usbCharging ?? buzz.amenitiesReview.usb) ? 'Charging' : 'Faulty'}
                        </span>
                        <span
                          className={
                            (buzz.amenitiesReview.wifiWorking ?? buzz.amenitiesReview.wifi)
                              ? 'text-emerald-700 bg-emerald-100 px-1.5 py-0.5'
                              : 'text-stone-400 bg-stone-200 px-1.5 py-0.5'
                          }
                        >
                          Wi-Fi: {(buzz.amenitiesReview.wifiWorking ?? buzz.amenitiesReview.wifi) ? 'Connected' : 'No'}
                        </span>
                        <span
                          className={
                            (buzz.amenitiesReview.luggageSecurity ?? buzz.amenitiesReview.luggage)
                              ? 'text-emerald-700 bg-emerald-100 px-1.5 py-0.5'
                              : 'text-red-700 bg-red-100 px-1.5 py-0.5'
                          }
                        >
                          Luggage:{' '}
                          {(buzz.amenitiesReview.luggageSecurity ?? buzz.amenitiesReview.luggage) ? 'Safe' : 'Risky'}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {buzz.confirmedFare && (
                        <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-[10px] font-black uppercase flex items-center gap-1">
                          <Coins className="w-3 h-3 text-emerald-600" />
                          <span>
                            Confirmed Fare:{' '}
                            {formatDisplayFare(buzz.confirmedFare.amount, buzz.confirmedFare.currency, displayCurrency)}
                            {buzz.confirmedFare.currency !== displayCurrency &&
                              ` (${formatCurrency(buzz.confirmedFare.amount, buzz.confirmedFare.currency)})`}
                          </span>
                        </span>
                      )}
                      {buzz.confirmedDepartureTime && (
                        <span className="px-2 py-0.5 bg-blue-50 border border-blue-300 text-blue-900 text-[10px] font-black uppercase flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-600" />
                          <span>Boarded: {buzz.confirmedDepartureTime}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => store.reactSocialInteraction(buzz.id, 'like')}
                          className={`px-2 py-1 text-xs font-black uppercase border border-[#141414] transition cursor-pointer flex items-center gap-1 ${
                            buzz.userReaction === 'like'
                              ? 'bg-[#141414] text-[#F27D26] shadow-[1px_1px_0px_0px_#F27D26]'
                              : 'bg-[#F5F5F0] text-stone-700 hover:bg-white'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{buzz.likes}</span>
                        </button>

                        <button
                          onClick={() => store.reactSocialInteraction(buzz.id, 'dislike')}
                          className={`px-2 py-1 text-xs font-black uppercase border border-[#141414] transition cursor-pointer flex items-center gap-1 ${
                            buzz.userReaction === 'dislike'
                              ? 'bg-[#EF4444] text-white'
                              : 'bg-[#F5F5F0] text-stone-700 hover:bg-white'
                          }`}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span>{buzz.dislikes}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        {onNavigateToBuzz && (
                          <button
                            onClick={onNavigateToBuzz}
                            className="text-[10px] font-black uppercase text-[#141414] hover:text-[#F27D26] cursor-pointer"
                          >
                            View in Buzz Feed →
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenReviewModal(buzz.targetType, buzz.targetId, buzz.targetName)}
                          className="text-[10px] font-black uppercase text-[#F27D26] hover:underline cursor-pointer"
                        >
                          + Add Review
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Report Intercity Modal */}
      <ReportIntercityModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        defaultRouteId={selectedRouteForReport}
        defaultOperatorId={selectedOperatorForReport}
        onNavigateToBuzz={onNavigateToBuzz}
      />

      {/* Create New Intercity Route / Highway Corridor Modal */}
      <CreateIntercityRouteModal
        isOpen={isCreateRouteModalOpen}
        onClose={() => setIsCreateRouteModalOpen(false)}
        onCreated={(created: IntercityRoute) => {
          showBanner(`Corridor "${created.name}" (${created.highwayCode}) added and synced!`);
        }}
      />

      {/* Create New Coach / Fleet Modal (registers into Transporters & Fleets) */}
      <CreateCoachModal
        isOpen={isCreateCoachModalOpen}
        onClose={() => setIsCreateCoachModalOpen(false)}
        onCreated={(created) => {
          showBanner(`Coach "${created.operatorName}" registered into Transporters & Fleets!`);
        }}
      />

      {/* Social Review / Amenity / Abuse Modal */}
      {isReviewModalOpen && (
        <AddReviewAbuseModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          targetType={reviewTarget.type}
          targetId={reviewTarget.id}
          targetName={reviewTarget.name}
          isIntercity={true}
        />
      )}
    </div>
  );
};
