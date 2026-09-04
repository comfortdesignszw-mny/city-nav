import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Clock, 
  ThumbsUp, 
  ThumbsDown, 
  ShieldAlert, 
  CheckCircle2, 
  Navigation, 
  Fuel, 
  AlertCircle, 
  DollarSign, 
  Coins, 
  PlusCircle, 
  Radio, 
  Share2, 
  ArrowRight,
  Info,
  Car
} from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import { RouteItem } from '../types';
import { formatTimeAgo, formatCurrency, getStatusConfig } from '../utils/formatters';
import { ReportFareModal } from './ReportFareModal';
import { ReportStatusModal } from './ReportStatusModal';

interface RouteDetailModalProps {
  routeId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectRank?: (rankId: string) => void;
}

export const RouteDetailModal: React.FC<RouteDetailModalProps> = ({
  routeId,
  isOpen,
  onClose,
  onSelectRank,
}) => {
  const store = useOfflineStore();
  const summary = store.getRouteSummary(routeId);
  const ranks = store.getRanks();

  const [isReportFareOpen, setIsReportFareOpen] = useState(false);
  const [isReportStatusOpen, setIsReportStatusOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !summary) return null;

  const { route, latestFare, activeStatuses, fareConfidence, confidenceReason } = summary;
  const connectedRanks = ranks.filter((rn) => route.ranksServedIds.includes(rn.id));

  const handleShare = () => {
    const text = `Fambai/Hambani Travel Zimbabwe: ${route.name} (${route.city}) current fare is ${
      latestFare ? formatCurrency(latestFare.fare_amount, latestFare.currency) : 'not reported'
    }. Status: ${summary.latestStatus ? summary.latestStatus.type : 'Running'}.`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
        <div 
          className="w-full max-w-xl bg-white border-2 border-[#141414] shadow-[8px_8px_0px_0px_#141414] overflow-hidden flex flex-col max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-[#141414] text-white p-4 sm:p-5 flex items-start justify-between flex-shrink-0 border-b-2 border-[#141414]">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 bg-[#F27D26] text-white border border-white">
                  {route.city}
                </span>
                {route.province && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-300">
                    {route.province}
                  </span>
                )}
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-white text-[#141414] border border-white">
                  {route.category === 'near_town' ? 'Near-Town Transport' : 'CBD ⇄ Location'}
                </span>
                {route.commonVehicle && (
                  <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">
                    • {route.commonVehicle}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-white">{route.name}</h2>
              <p className="text-xs font-bold text-stone-300 mt-0.5 flex items-center gap-1.5">
                <span>{route.origin}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>{route.destination}</span>
                {route.distanceKm && <span>• {route.distanceKm} km</span>}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="w-8 h-8 bg-white text-[#141414] hover:bg-[#F27D26] hover:text-white border-2 border-[#141414] flex items-center justify-center transition font-black cursor-pointer shadow-[2px_2px_0px_0px_#F27D26]"
                title="Share route fare info"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white text-[#141414] hover:bg-[#F27D26] hover:text-white border-2 border-[#141414] flex items-center justify-center transition font-black cursor-pointer shadow-[2px_2px_0px_0px_#F27D26]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {copied && (
            <div className="bg-[#F27D26] text-white text-xs text-center py-1.5 font-black uppercase tracking-wider border-b-2 border-[#141414]">
              Route status copied to clipboard!
            </div>
          )}

          {/* Scrollable Content Body */}
          <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1">
            {/* 1. FARE SECTION & CONFIDENCE INDICATOR */}
            <div className="bg-[#F5F5F0] p-4 sm:p-5 border-2 border-[#141414] shadow-[4px_4px_0px_0px_#141414]">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#F27D26]">Current Commuter Fare</span>
                  {latestFare ? (
                    <div>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-3xl sm:text-4xl font-black text-[#141414] tracking-tight">
                          {formatCurrency(latestFare.fare_amount, latestFare.currency)}
                        </span>
                        {summary.averageFareZWL && latestFare.currency === 'USD' && (
                          <span className="text-xs font-black uppercase text-white bg-[#141414] px-2.5 py-1 border border-[#141414]">
                            ZiG {summary.averageFareZWL}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-200 border border-[#141414] text-[#141414] flex items-center gap-1">
                          <Car className="w-3 h-3 text-[#141414]" />
                          {latestFare.transport_type || route.commonVehicle || 'Toyota HiAce Kombi'}
                        </span>
                        {latestFare.departure_status && (
                          <span className="text-[10px] font-bold text-stone-700 bg-stone-100 px-2 py-0.5 border border-stone-300">
                            {latestFare.departure_status}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-black uppercase text-stone-500 mt-1">No fare reported yet today</p>
                  )}
                </div>

                {latestFare && (
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-stone-500 uppercase block">
                      {formatTimeAgo(latestFare.reported_at)}
                    </span>
                    <span className={`inline-block mt-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 border-2 border-[#141414] ${
                      fareConfidence === 'high'
                        ? 'bg-emerald-200 text-[#141414]'
                        : fareConfidence === 'medium'
                        ? 'bg-amber-200 text-[#141414]'
                        : 'bg-stone-300 text-[#141414]'
                    }`}>
                      {fareConfidence === 'high' ? 'High Confidence' : fareConfidence === 'medium' ? 'Moderate' : 'Unconfirmed'}
                    </span>
                  </div>
                )}
              </div>

              {/* Confidence reason */}
              <p className="text-xs font-medium text-stone-600 mb-3.5 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#F27D26] flex-shrink-0" />
                <span>{confidenceReason}</span>
              </p>

              {/* Upvote / Downvote verification */}
              {latestFare && (
                <div className="pt-3 border-t-2 border-[#141414]/10 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                  <span className="text-[#141414] font-black uppercase tracking-wider">Is this fare still accurate?</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => store.voteFare(latestFare.id, 'up')}
                      className={`px-3 py-1.5 border-2 border-[#141414] font-black uppercase text-xs flex items-center gap-1.5 transition cursor-pointer shadow-[2px_2px_0px_0px_#141414] ${
                        latestFare.userVote === 'up'
                          ? 'bg-[#141414] text-white'
                          : 'bg-white text-[#141414] hover:bg-[#F27D26] hover:text-white'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>Confirm ({latestFare.upvotes})</span>
                    </button>
                    <button
                      onClick={() => store.voteFare(latestFare.id, 'down')}
                      className={`px-3 py-1.5 border-2 border-[#141414] font-black uppercase text-xs flex items-center gap-1.5 transition cursor-pointer shadow-[2px_2px_0px_0px_#141414] ${
                        latestFare.userVote === 'down'
                          ? 'bg-rose-700 text-white'
                          : 'bg-white text-[#141414] hover:bg-rose-600 hover:text-white'
                      }`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      <span>Wrong ({latestFare.downvotes})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. RECENT STATUS REPORTS FEED (auto-expiring 90min) */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-[#F27D26]" />
                  <h3 className="text-xs font-black text-[#141414] uppercase tracking-wider">Live Status Feed</h3>
                </div>
                <span className="text-[10px] font-black uppercase text-stone-400">Auto-expires after 90m</span>
              </div>

              {activeStatuses.length === 0 ? (
                <div className="p-4 bg-[#F5F5F0] border-2 border-[#141414] text-center">
                  <CheckCircle2 className="w-6 h-6 text-[#141414] mx-auto mb-1" />
                  <p className="text-xs font-black uppercase text-[#141414]">No active incidents or roadblocks</p>
                  <p className="text-[11px] font-medium text-stone-600 mt-0.5">
                    Traffic appears normal. If you are currently commuting on this route, report an update.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeStatuses.map((report) => {
                    const cfg = getStatusConfig(report.type);
                    return (
                      <div
                        key={report.id}
                        className="p-3.5 bg-white border-2 border-[#141414] shadow-[3px_3px_0px_0px_#141414] transition"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider border-2 border-[#141414] ${cfg.badgeClass}`}>
                            {report.type === 'police_blitz' && <ShieldAlert className="w-3.5 h-3.5" />}
                            {report.type === 'running' && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {report.type === 'delayed' && <Clock className="w-3.5 h-3.5" />}
                            {report.type === 'diverted' && <Navigation className="w-3.5 h-3.5" />}
                            {report.type === 'fuel_shortage' && <Fuel className="w-3.5 h-3.5" />}
                            <span>{cfg.label}</span>
                          </span>
                          <span className="text-[11px] font-bold text-stone-500">
                            {formatTimeAgo(report.reported_at)}
                          </span>
                        </div>

                        {report.note ? (
                          <p className="text-xs font-bold text-[#141414] mt-1.5 pl-1">
                            "{report.note}"
                          </p>
                        ) : (
                          <p className="text-xs font-medium text-stone-600 italic pl-1 mt-1">
                            {cfg.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. WAYPOINTS & STOPS SEQUENCE LIST */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#F27D26]" />
                  <h3 className="text-xs font-black text-[#141414] uppercase tracking-wider">Boarding &amp; Dropping Points</h3>
                </div>
                <span className="text-[10px] font-black uppercase text-stone-400">{route.waypoints.length} known stops</span>
              </div>

              <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#141414]">
                {route.waypoints.map((wp, index) => {
                  const isFirst = index === 0;
                  const isLast = index === route.waypoints.length - 1;

                  return (
                    <div key={index} className="relative flex items-start gap-2.5 text-xs">
                      {/* Waypoint circle pin */}
                      <div
                        className={`absolute -left-6 top-0.5 w-5 h-5 border-2 border-[#141414] flex items-center justify-center font-black text-[10px] ${
                          isFirst
                            ? 'bg-[#F27D26] text-white'
                            : isLast
                            ? 'bg-[#141414] text-white'
                            : 'bg-white text-[#141414]'
                        }`}
                      >
                        {index + 1}
                      </div>

                      <div className="bg-[#F5F5F0] hover:bg-white p-3 border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] flex-1 transition">
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-[#141414] text-xs uppercase">{wp.name}</h4>
                          {isFirst && <span className="text-[10px] bg-[#F27D26] text-white px-1.5 py-0.2 font-black uppercase">Origin</span>}
                          {isLast && <span className="text-[10px] bg-[#141414] text-white px-1.5 py-0.2 font-black uppercase">Destination</span>}
                        </div>
                        {wp.landmark && (
                          <p className="text-[11px] font-bold text-stone-600 mt-0.5">
                            Landmark: {wp.landmark}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. CONNECTED BOARDING RANKS */}
            {connectedRanks.length > 0 && (
              <div className="pt-1">
                <h3 className="text-xs font-black text-[#141414] uppercase tracking-wider mb-2">Connected Harare Termini</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {connectedRanks.map((rn) => (
                    <div
                      key={rn.id}
                      onClick={() => {
                        if (onSelectRank) onSelectRank(rn.id);
                        onClose();
                      }}
                      className="p-3 bg-white hover:bg-[#F5F5F0] border-2 border-[#141414] shadow-[2px_2px_0px_0px_#141414] hover:shadow-[4px_4px_0px_0px_#F27D26] cursor-pointer transition flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <h4 className="text-xs font-black text-[#141414] uppercase truncate">{rn.name}</h4>
                        <p className="text-[10px] font-bold text-stone-500 truncate">{rn.address}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#141414] flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Bottom Actions: 2 Primary buttons */}
          <div className="p-3 sm:p-4 bg-[#F5F5F0] border-t-2 border-[#141414] grid grid-cols-2 gap-3 flex-shrink-0">
            <button
              onClick={() => setIsReportFareOpen(true)}
              className="py-3.5 px-3 bg-[#141414] hover:bg-[#F27D26] text-white font-black text-xs sm:text-sm uppercase tracking-wider border-2 border-[#141414] shadow-[3px_3px_0px_0px_#141414] hover:shadow-[5px_5px_0px_0px_#141414] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <DollarSign className="w-4 h-4 text-[#F27D26]" />
              <span>Report Fare</span>
            </button>

            <button
              onClick={() => setIsReportStatusOpen(true)}
              className="py-3.5 px-3 bg-[#F27D26] hover:bg-[#d96615] text-white font-black text-xs sm:text-sm uppercase tracking-wider border-2 border-[#141414] shadow-[3px_3px_0px_0px_#141414] hover:shadow-[5px_5px_0px_0px_#141414] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Report Status</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      <ReportFareModal
        route={route}
        isOpen={isReportFareOpen}
        onClose={() => setIsReportFareOpen(false)}
      />

      <ReportStatusModal
        route={route}
        isOpen={isReportStatusOpen}
        onClose={() => setIsReportStatusOpen(false)}
      />
    </>
  );
};
