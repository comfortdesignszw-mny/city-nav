import React, { useState, useMemo } from 'react';
import { 
  Bus, 
  Search, 
  MapPin, 
  Clock, 
  Navigation, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Star, 
  PlusCircle, 
  ShieldCheck, 
  Luggage, 
  Phone, 
  Wifi, 
  Coffee, 
  Zap, 
  Wind, 
  ThumbsUp, 
  ThumbsDown, 
  Filter, 
  Layers, 
  Building2, 
  Sparkles 
} from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import { BusOperator, IntercityRoute, IntercityReport, OperatorTier } from '../types';
import { ReportIntercityModal } from './ReportIntercityModal';
import { formatTimeAgo, formatCurrency } from '../utils/formatters';

interface IntercityTravelViewProps {
  onSelectRoute?: (routeId: string) => void;
}

export const IntercityTravelView: React.FC<IntercityTravelViewProps> = () => {
  const store = useOfflineStore();
  const routes = store.getIntercityRoutes();
  const operators = store.getBusOperators();
  const reports = store.getIntercityReports();

  const [activeTab, setActiveTab] = useState<'corridors' | 'operators' | 'reports'>('corridors');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('all');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [selectedRouteForReport, setSelectedRouteForReport] = useState<string | undefined>(undefined);
  const [selectedOperatorForReport, setSelectedOperatorForReport] = useState<string | undefined>(undefined);

  // Filter routes
  const filteredRoutes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return routes.filter((r) => {
      // City filter
      if (selectedCityFilter !== 'all') {
        const matchesOrigin = r.originCity.toLowerCase() === selectedCityFilter.toLowerCase();
        const matchesDest = r.destinationCity.toLowerCase() === selectedCityFilter.toLowerCase();
        const matchesStops = r.keyStops.some((s) => s.toLowerCase() === selectedCityFilter.toLowerCase());
        if (!matchesOrigin && !matchesDest && !matchesStops) return false;
      }

      // Query search
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
      return matchesOp || matchesTerminal || matchesNote;
    });
  }, [reports, searchQuery]);

  const handleOpenReportModal = (routeId?: string, operatorId?: string) => {
    setSelectedRouteForReport(routeId);
    setSelectedOperatorForReport(operatorId);
    setIsReportModalOpen(true);
  };

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
      {/* Hero Banner with Stats */}
      <div className="bg-[#141414] text-white p-5 sm:p-6 border-2 border-[#141414] shadow-[4px_4px_0px_0px_#F27D26] relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
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
              Crowdsourced fares, timetables, and operator ratings for coaches including CAG, City Link, Inter Africa, Eagle Liner, Rimbi, and more.
            </p>
          </div>

          <button
            id="report-intercity-trip-btn"
            onClick={() => handleOpenReportModal()}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#F27D26] text-white text-xs font-black uppercase tracking-wider border-2 border-white hover:bg-white hover:text-[#141414] transition cursor-pointer shadow-[3px_3px_0px_0px_#ffffff] self-start sm:self-auto flex-shrink-0 active:translate-x-0.5 active:translate-y-0.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report Bus Fare / Trip</span>
          </button>
        </div>

        {/* Quick Stat Numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t-2 border-white/20">
          <div>
            <div className="text-[10px] uppercase font-bold text-stone-400">Bus Operators</div>
            <div className="text-xl font-black text-white">{operators.length} Companies</div>
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

      {/* Main View Switcher Tabs */}
      <div className="grid grid-cols-3 gap-2">
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
          <span>Bus Companies ({operators.length})</span>
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
          <span>Passenger Reports ({reports.length})</span>
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
                ? "Search intercity route (e.g. Harare to Bulawayo, Mutare, Beitbridge, A5, CAG)..."
                : activeTab === 'operators'
                ? "Search bus company (e.g. CAG, City Link, Inter Africa, Eagle Liner, Rimbi)..."
                : "Search commuter reports by bus name, terminal, or highway..."
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
          {filteredRoutes.length === 0 ? (
            <div className="bg-white p-8 text-center border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414]">
              <div className="w-12 h-12 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] flex items-center justify-center mx-auto mb-3 shadow-[2px_2px_0px_0px_#141414]">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-base font-black text-[#141414] uppercase">No corridors found</h4>
              <p className="text-xs font-bold text-stone-600 mt-1">
                Try searching for a different destination or clear your filter.
              </p>
            </div>
          ) : (
            filteredRoutes.map((route) => (
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

                  <div className="text-right flex-shrink-0">
                    <div className="text-[10px] font-black uppercase text-[#141414]/60">
                      Fare Range
                    </div>
                    <div className="text-2xl font-black text-[#141414]">
                      ${route.fareRange.min} – ${route.fareRange.max} USD
                    </div>
                    <button
                      onClick={() => handleOpenReportModal(route.id)}
                      className="mt-1.5 px-2.5 py-1 bg-[#F5F5F0] hover:bg-[#F27D26] hover:text-white text-[10px] font-black uppercase border border-[#141414] transition cursor-pointer"
                    >
                      + Report Trip Fare
                    </button>
                  </div>
                </div>

                {/* Departure Terminals Info */}
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

                {/* Operators Operating this Corridor Side-by-Side */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#141414] mb-2.5 flex items-center gap-1.5">
                    <Bus className="w-4 h-4 text-[#F27D26]" />
                    <span>Bus Companies Operating on this Highway:</span>
                  </h4>

                  <div className="space-y-2.5">
                    {route.operators.map((opService, idx) => (
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
                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 flex-shrink-0">
                          <div className="text-right">
                            <span className="text-2xl font-black text-[#141414]">
                              ${opService.fareUSD} <span className="text-xs font-bold text-stone-500">USD</span>
                            </span>
                            {opService.fareZiG && (
                              <div className="text-[10px] font-black text-stone-600">
                                ZiG {opService.fareZiG}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleOpenReportModal(route.id, opService.operatorId)}
                            className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-[#141414] text-white hover:bg-[#F27D26] transition border border-[#141414] cursor-pointer"
                          >
                            Report Trip
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW 2: BUS OPERATORS DIRECTORY */}
      {activeTab === 'operators' && (
        <div className="space-y-4">
          <div className="bg-white p-4 border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase text-[#141414]">
                Verified Zimbabwean Bus Companies
              </h3>
              <p className="text-xs font-bold text-stone-600">
                Official booking desks, luggage allowances, and passenger feedback.
              </p>
            </div>
            <span className="bg-[#141414] text-white px-2.5 py-1 text-xs font-black uppercase border border-[#141414]">
              {filteredOperators.length} Fleets
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredOperators.map((operator) => (
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
                <div className="pt-3 border-t-2 border-[#141414]/10 flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase text-[#141414]/60">
                    {operator.popularRoutes.length} Main Corridors
                  </div>
                  <button
                    onClick={() => handleOpenReportModal(undefined, operator.id)}
                    className="px-3 py-1.5 bg-[#141414] hover:bg-[#F27D26] text-white text-xs font-black uppercase border border-[#141414] transition cursor-pointer shadow-[2px_2px_0px_0px_#F27D26]"
                  >
                    + Report Fare for {operator.alias || operator.name.split(' ')[0]}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: LIVE COMMUTER REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white p-4 border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase text-[#141414]">
                Crowdsourced Intercity Travel Reports
              </h3>
              <p className="text-xs font-bold text-stone-600">
                Recent passenger reports on fares paid, seat fullness, and road checkpoints.
              </p>
            </div>
            <button
              onClick={() => handleOpenReportModal()}
              className="px-3 py-1.5 bg-[#F27D26] text-white text-xs font-black uppercase border-2 border-[#141414] hover:bg-[#141414] transition cursor-pointer shadow-[2px_2px_0px_0px_#141414]"
            >
              + Submit Report
            </button>
          </div>

          <div className="space-y-3">
            {filteredReports.length === 0 ? (
              <div className="bg-white p-8 text-center border-2 border-[#141414]">
                <p className="text-xs font-bold text-stone-500">No reports match your search query.</p>
              </div>
            ) : (
              filteredReports.map((rep) => {
                const rt = routes.find((r) => r.id === rep.routeId);
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
                        </div>

                        <div className="text-xs font-bold text-stone-700 flex items-center gap-2 flex-wrap">
                          <span>Terminal: <strong>{rep.departureTerminal}</strong></span>
                          {rep.departureTime && <span>• Dep: <strong>{rep.departureTime}</strong></span>}
                        </div>
                      </div>

                      {/* Fare Badge */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-black text-[#141414]">
                          ${rep.farePaidUSD} <span className="text-xs text-stone-500">USD</span>
                        </div>
                        {rep.farePaidZiG && (
                          <div className="text-[10px] font-black text-stone-600">
                            ZiG {rep.farePaidZiG}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Seat & Condition Badge */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border border-[#141414] ${
                        rep.seatAvailability === 'plenty'
                          ? 'bg-emerald-100 text-emerald-900'
                          : rep.seatAvailability === 'filling_fast'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-rose-100 text-rose-900'
                      }`}>
                        {rep.seatAvailability === 'plenty' ? 'Plenty Seats Open' : rep.seatAvailability === 'filling_fast' ? 'Filling Up Fast' : 'Bus Packed'}
                      </span>

                      <span className="bg-[#F5F5F0] text-[#141414] px-2 py-0.5 text-[10px] font-black uppercase border border-[#141414] flex items-center gap-1">
                        ★ Condition: {rep.busConditionRating}/5
                      </span>
                    </div>

                    {/* Road Note if present */}
                    {rep.roadStatusNote && (
                      <div className="p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-xs font-bold text-[#141414] flex items-center gap-2">
                        <span className="text-[#F27D26] font-black uppercase text-[10px]">Passenger Update:</span>
                        <span>"{rep.roadStatusNote}"</span>
                      </div>
                    )}

                    {/* Verification Voting Row */}
                    <div className="pt-2 border-t border-[#141414]/10 flex items-center justify-between text-xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                        Commuter Verification:
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => store.voteIntercityReport(rep.id, 'up')}
                          className={`px-2 py-1 flex items-center gap-1 text-[11px] font-black border border-[#141414] transition cursor-pointer ${
                            rep.userVote === 'up'
                              ? 'bg-[#141414] text-white'
                              : 'bg-[#F5F5F0] text-[#141414] hover:bg-white'
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3 text-[#F27D26]" />
                          <span>{rep.upvotes}</span>
                        </button>
                        <button
                          onClick={() => store.voteIntercityReport(rep.id, 'down')}
                          className={`px-2 py-1 flex items-center gap-1 text-[11px] font-black border border-[#141414] transition cursor-pointer ${
                            rep.userVote === 'down'
                              ? 'bg-[#141414] text-white'
                              : 'bg-[#F5F5F0] text-[#141414] hover:bg-white'
                          }`}
                        >
                          <ThumbsDown className="w-3 h-3 text-stone-500" />
                          <span>{rep.downvotes}</span>
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
      />
    </div>
  );
};
