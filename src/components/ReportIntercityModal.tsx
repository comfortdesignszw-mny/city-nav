import React, { useState } from 'react';
import { 
  X, 
  Bus, 
  DollarSign, 
  Clock, 
  MapPin, 
  Star, 
  ShieldAlert, 
  AlertCircle, 
  Check, 
  Navigation
} from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import { IntercityRoute, BusOperator } from '../types';

interface ReportIntercityModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRouteId?: string;
  defaultOperatorId?: string;
}

export const ReportIntercityModal: React.FC<ReportIntercityModalProps> = ({
  isOpen,
  onClose,
  defaultRouteId,
  defaultOperatorId,
}) => {
  const store = useOfflineStore();
  const routes = store.getIntercityRoutes();
  const operators = store.getBusOperators();

  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    defaultRouteId || routes[0]?.id || ''
  );
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>(
    defaultOperatorId || operators[0]?.id || ''
  );
  const [customOperatorName, setCustomOperatorName] = useState<string>('');
  const [fareUSD, setFareUSD] = useState<string>('20');
  const [departureTerminal, setDepartureTerminal] = useState<string>('Harare Roadport Terminal');
  const [departureTime, setDepartureTime] = useState<string>('07:30 AM');
  const [seatAvailability, setSeatAvailability] = useState<'plenty' | 'filling_fast' | 'full'>('filling_fast');
  const [busRating, setBusRating] = useState<number>(5);
  const [roadNote, setRoadNote] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentRoute = routes.find((r) => r.id === selectedRouteId);
  const currentOperator = operators.find((op) => op.id === selectedOperatorId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedFare = parseFloat(fareUSD);
    if (isNaN(parsedFare) || parsedFare <= 0) return;

    const opName = selectedOperatorId === 'custom' 
      ? (customOperatorName.trim() || 'Independent Coach')
      : (currentOperator?.name || 'Coach Operator');

    store.addIntercityReport({
      routeId: selectedRouteId,
      operatorId: selectedOperatorId,
      operatorName: opName,
      farePaidUSD: parsedFare,
      farePaidZiG: Math.round(parsedFare * 14), // Current approximate intercity conversion
      departureTime: departureTime.trim(),
      departureTerminal: departureTerminal.trim(),
      seatAvailability,
      busConditionRating: busRating,
      roadStatusNote: roadNote.trim() || undefined,
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div 
        className="w-full max-w-lg bg-white border-2 border-[#141414] shadow-[8px_8px_0px_0px_#141414] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#141414] text-white p-4 sm:p-5 flex items-start justify-between flex-shrink-0 border-b-2 border-[#141414]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#F27D26] text-white border-2 border-white flex items-center justify-center font-black shadow-[2px_2px_0px_0px_#ffffff]">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-[#F27D26]">
                Crowdsource Knowledgebase
              </div>
              <h2 className="text-lg sm:text-xl font-black uppercase text-white tracking-tight">
                Report Intercity Bus Fare
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white text-[#141414] hover:bg-[#F27D26] hover:text-white border-2 border-[#141414] flex items-center justify-center transition font-black cursor-pointer shadow-[2px_2px_0px_0px_#F27D26]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Content */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 bg-[#F27D26] text-white border-2 border-[#141414] flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_#141414]">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-[#141414] uppercase">Report Saved &amp; Queued!</h3>
            <p className="text-xs font-bold text-stone-600 max-w-sm mx-auto">
              Your intercity fare report is cached instantly and queued in your Outbox for background sync.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs font-bold">
            {/* Route Selector */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                Intercity Route / Highway Corridor *
              </label>
              <select
                id="intercity-route-select"
                value={selectedRouteId}
                onChange={(e) => {
                  setSelectedRouteId(e.target.value);
                  const rt = routes.find((r) => r.id === e.target.value);
                  if (rt && rt.departureHubs[0]) {
                    setDepartureTerminal(rt.departureHubs[0].terminal.split('/')[0].trim());
                  }
                }}
                className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F27D26] shadow-[2px_2px_0px_0px_#141414]"
              >
                {routes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} ({rt.distanceKm} km • {rt.highwayCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Bus Operator Selector */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                Bus / Coach Operator *
              </label>
              <select
                id="intercity-operator-select"
                value={selectedOperatorId}
                onChange={(e) => setSelectedOperatorId(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F27D26] shadow-[2px_2px_0px_0px_#141414]"
              >
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.name} ({op.tier.replace('_', ' ').toUpperCase()})
                  </option>
                ))}
                <option value="custom">+ Other / Independent Bus Company</option>
              </select>

              {selectedOperatorId === 'custom' && (
                <input
                  type="text"
                  placeholder="Enter bus operator name (e.g. Munorwa, Tombs, Tamuka)..."
                  value={customOperatorName}
                  onChange={(e) => setCustomOperatorName(e.target.value)}
                  className="w-full mt-2 p-2.5 bg-white border-2 border-[#141414] text-[#141414] font-bold focus:outline-none shadow-[2px_2px_0px_0px_#141414]"
                  required
                />
              )}
            </div>

            {/* Fare Paid Section */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Fare Paid (USD) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-500 font-black">
                    $
                  </span>
                  <input
                    id="intercity-fare-input"
                    type="number"
                    step="0.5"
                    min="1"
                    max="100"
                    value={fareUSD}
                    onChange={(e) => setFareUSD(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-black text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F27D26] shadow-[2px_2px_0px_0px_#141414]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Approx. ZiG Equivalent
                </label>
                <div className="py-2.5 px-3 bg-[#F5F5F0] border-2 border-[#141414] font-black text-sm text-[#141414]">
                  ZiG {Math.round((parseFloat(fareUSD) || 0) * 14)}
                </div>
              </div>
            </div>

            {/* Quick Fare Presets */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {['10', '12', '15', '18', '20', '25', '30'].map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => setFareUSD(amt)}
                  className={`px-2.5 py-1 text-[11px] font-black border-2 border-[#141414] transition cursor-pointer ${
                    fareUSD === amt ? 'bg-[#141414] text-white' : 'bg-white text-[#141414] hover:bg-[#F5F5F0]'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>

            {/* Departure Terminal & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Boarding Terminal / Rank *
                </label>
                <input
                  type="text"
                  value={departureTerminal}
                  onChange={(e) => setDepartureTerminal(e.target.value)}
                  placeholder="e.g. Harare Roadport Bay 4, Mbare Musika..."
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-bold focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_#141414]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Departure Time *
                </label>
                <input
                  type="text"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  placeholder="e.g. 07:00 AM, 14:00 PM, Overnight"
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-bold focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_#141414]"
                  required
                />
              </div>
            </div>

            {/* Seat Availability Row */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1.5">
                Seat Availability at Departure:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'plenty', label: 'Plenty Seats' },
                  { id: 'filling_fast', label: 'Filling Fast' },
                  { id: 'full', label: 'Fully Packed' },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setSeatAvailability(item.id as any)}
                    className={`py-2 px-2 text-center text-[10px] font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer ${
                      seatAvailability === item.id
                        ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]'
                        : 'bg-white text-[#141414] hover:bg-[#F5F5F0]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bus Condition Rating */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1.5">
                Bus Condition &amp; Cleanliness Rating:
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setBusRating(star)}
                    className={`w-9 h-9 border-2 border-[#141414] flex items-center justify-center font-black transition cursor-pointer ${
                      busRating >= star ? 'bg-[#F27D26] text-white shadow-[2px_2px_0px_0px_#141414]' : 'bg-white text-stone-400'
                    }`}
                  >
                    ★
                  </button>
                ))}
                <span className="text-xs font-black uppercase text-[#141414] ml-2">
                  {busRating === 5 ? 'Excellent' : busRating === 4 ? 'Good' : busRating === 3 ? 'Fair' : 'Poor'}
                </span>
              </div>
            </div>

            {/* Road Alert / Note */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                Highway / Tollgate / Road Condition Note (Optional)
              </label>
              <input
                type="text"
                maxLength={120}
                value={roadNote}
                onChange={(e) => setRoadNote(e.target.value)}
                placeholder="e.g. Norton tollgate queue 5 mins, dualized sections smooth..."
                className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-bold focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_#141414]"
              />
              <span className="text-[10px] text-stone-500 font-bold block mt-1 text-right">
                {roadNote.length}/120 characters
              </span>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex gap-3 border-t-2 border-[#141414]/10">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-[#F5F5F0] text-[#141414] border-2 border-[#141414] text-xs font-black uppercase tracking-wider hover:bg-stone-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-2 py-3 bg-[#141414] hover:bg-[#F27D26] text-white border-2 border-[#141414] text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-[3px_3px_0px_0px_#F27D26] active:translate-x-0.5 active:translate-y-0.5"
              >
                Publish Intercity Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
