import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Bus,
  Check,
  PlusCircle,
  Truck,
  Share2,
  Layers,
} from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import {
  DisplayCurrency,
  IntercityRoute,
  TransporterVehicleType,
} from '../types';
import { convertCurrency } from '../utils/formatters';
import { CreateIntercityRouteModal } from './CreateIntercityRouteModal';

interface ReportIntercityModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRouteId?: string;
  defaultOperatorId?: string;
  onNavigateToBuzz?: () => void;
}

const FLEET_TYPES: { value: TransporterVehicleType; label: string }[] = [
  { value: 'long_distance_coach', label: 'Long Distance Coach' },
  { value: 'cross_border_quantum', label: 'Cross-Border Quantum' },
  { value: 'sprinter', label: 'Sprinter (22 Seater)' },
  { value: 'hiace_combi', label: 'HiAce (Combi)' },
];

export const ReportIntercityModal: React.FC<ReportIntercityModalProps> = ({
  isOpen,
  onClose,
  defaultRouteId,
  defaultOperatorId,
}) => {
  const store = useOfflineStore();
  const routes = store.getIntercityRoutes();
  const operators = store.getBusOperators();
  const transporters = store.getTransporters();

  // Prioritize coach/intercity/sprinter fleets first, while keeping all registered fleets selectable
  const sortedFleetCoaches = useMemo(() => {
    const priorityTypes = new Set<TransporterVehicleType>([
      'long_distance_coach',
      'intercity_coach',
      'cross_border_quantum',
      'sprinter',
      'sprinter_22',
    ]);
    return [...transporters].sort((a, b) => {
      const aPri = priorityTypes.has(a.transportType) ? 0 : 1;
      const bPri = priorityTypes.has(b.transportType) ? 0 : 1;
      if (aPri !== bPri) return aPri - bPri;
      return b.lastRouteUpdate - a.lastRouteUpdate;
    });
  }, [transporters]);

  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    defaultRouteId || routes[0]?.id || ''
  );
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>(
    defaultOperatorId || (sortedFleetCoaches[0]?.id || operators[0]?.id || 'create_new')
  );
  const [customOperatorName, setCustomOperatorName] = useState<string>('');

  // Inline "Create New Coach / Transport" sub-form state
  const [newCoachName, setNewCoachName] = useState<string>('');
  const [newCoachPhone, setNewCoachPhone] = useState<string>('');
  const [newCoachPlate, setNewCoachPlate] = useState<string>('');
  const [newCoachType, setNewCoachType] = useState<TransporterVehicleType>('long_distance_coach');
  const [newCoachCity, setNewCoachCity] = useState<string>('Harare');

  // Fare & Trip details
  const [fareCurrency, setFareCurrency] = useState<DisplayCurrency>('USD');
  const [fareAmount, setFareAmount] = useState<string>('20');
  const [departureTerminal, setDepartureTerminal] = useState<string>('Harare Roadport Terminal');
  const [departureTime, setDepartureTime] = useState<string>('07:30 AM');
  const [seatAvailability, setSeatAvailability] = useState<'plenty' | 'filling_fast' | 'full'>('filling_fast');
  const [busRating, setBusRating] = useState<number>(5);
  const [roadNote, setRoadNote] = useState<string>('');
  const [shareToBuzz, setShareToBuzz] = useState<boolean>(true);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Nested route creator modal
  const [isCreateRouteOpen, setIsCreateRouteOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const rtId = defaultRouteId || routes[0]?.id || '';
    setSelectedRouteId(rtId);
    const matchedRoute = routes.find((r) => r.id === rtId);
    if (matchedRoute?.departureHubs[0]) {
      setDepartureTerminal(matchedRoute.departureHubs[0].terminal.split('/')[0].trim());
      setNewCoachCity(matchedRoute.originCity);
    }
    if (defaultOperatorId) {
      setSelectedOperatorId(defaultOperatorId);
    } else if (operators[0]?.id) {
      setSelectedOperatorId(operators[0].id);
    }
  }, [isOpen, defaultRouteId, defaultOperatorId]);

  if (!isOpen) return null;

  const currentRoute = routes.find((r) => r.id === selectedRouteId);
  const currentOperator = operators.find((op) => op.id === selectedOperatorId);
  const currentFleet = transporters.find((t) => t.id === selectedOperatorId);

  const handleCurrencySelect = (nextCurr: DisplayCurrency) => {
    const parsed = parseFloat(fareAmount) || 0;
    const converted =
      parsed > 0
        ? convertCurrency(parsed, fareCurrency, nextCurr)
        : nextCurr === 'USD'
        ? 20
        : nextCurr === 'ZWG'
        ? 560
        : 360;
    setFareCurrency(nextCurr);
    setFareAmount(String(converted));
  };

  const handleRouteCreated = (newRoute: IntercityRoute) => {
    setSelectedRouteId(newRoute.id);
    if (newRoute.departureHubs[0]) {
      setDepartureTerminal(newRoute.departureHubs[0].terminal);
    }
    setNewCoachCity(newRoute.originCity);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedFare = parseFloat(fareAmount);
    if (isNaN(parsedFare) || parsedFare <= 0 || !selectedRouteId) return;

    let finalOpId = selectedOperatorId;
    let finalOpName = 'Coach Operator';

    if (selectedOperatorId === 'create_new') {
      if (!newCoachName.trim()) return;
      const typeLabel =
        FLEET_TYPES.find((ft) => ft.value === newCoachType)?.label || 'Long Distance Coach';
      const createdFleet = store.registerTransporter({
        operatorName: newCoachName.trim(),
        contactPhone: newCoachPhone.trim() || '+263 77 000 0000',
        transportType: newCoachType,
        transportTypeLabel: typeLabel,
        currentRouteName: currentRoute?.name || 'Intercity Highway Corridor',
        currentRouteId: selectedRouteId,
        city: newCoachCity.trim() || currentRoute?.originCity || 'Harare',
        vehiclePlate: newCoachPlate.trim() || undefined,
        baseTerminus: departureTerminal.trim() || undefined,
        statusNote: `Intercity trip • Departs ${departureTime.trim() || 'Scheduled'}`,
      });
      finalOpId = createdFleet.id;
      finalOpName = createdFleet.operatorName;
    } else if (selectedOperatorId === 'custom') {
      finalOpName = customOperatorName.trim() || 'Independent Coach';
    } else if (currentFleet) {
      finalOpId = currentFleet.id;
      finalOpName = currentFleet.vehiclePlate
        ? `${currentFleet.operatorName} (${currentFleet.vehiclePlate})`
        : currentFleet.operatorName;
    } else if (currentOperator) {
      finalOpId = currentOperator.id;
      finalOpName = currentOperator.name;
    }

    const usdVal = convertCurrency(parsedFare, fareCurrency, 'USD');
    const zwgVal = convertCurrency(parsedFare, fareCurrency, 'ZWG');
    const zarVal = convertCurrency(parsedFare, fareCurrency, 'ZAR');

    store.addIntercityReport({
      routeId: selectedRouteId,
      operatorId: finalOpId,
      operatorName: finalOpName,
      farePaidUSD: usdVal,
      farePaidZiG: zwgVal,
      farePaidZAR: zarVal,
      departureTime: departureTime.trim(),
      departureTerminal: departureTerminal.trim(),
      seatAvailability,
      busConditionRating: busRating,
      roadStatusNote: roadNote.trim() || undefined,
    });

    if (shareToBuzz) {
      const routeTitle = currentRoute?.name || 'Intercity Highway';
      const seatLabel =
        seatAvailability === 'plenty'
          ? 'plenty of seats open'
          : seatAvailability === 'filling_fast'
          ? 'filling up fast'
          : 'bus packed';
      const summaryParts = [
        `${finalOpName} on ${routeTitle} from ${departureTerminal.trim()}`,
        `(${seatLabel})`,
        roadNote.trim() ? `Note: ${roadNote.trim()}` : '',
      ].filter(Boolean);

      store.addSocialInteraction({
        targetType: 'intercity',
        targetId: selectedRouteId,
        targetName: `${finalOpName} • ${routeTitle}`,
        postType: 'recommendation',
        comment: summaryParts.join(' — '),
        rating: busRating,
        confirmedFare: { amount: parsedFare, currency: fareCurrency },
        confirmedDepartureTime: departureTime.trim() || undefined,
        recommendedLocation: departureTerminal.trim() || undefined,
      });
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1100);
  };

  return (
    <>
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
                  Intercity Trips, Fares &amp; Registered Coaches
                </div>
                <h2 className="text-lg sm:text-xl font-black uppercase text-white tracking-tight">
                  Create Intercity Trip / Fare Report
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 bg-white text-[#141414] hover:bg-[#F27D26] hover:text-white border-2 border-[#141414] flex items-center justify-center transition font-black cursor-pointer shadow-[2px_2px_0px_0px_#F27D26]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isSuccess ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-14 h-14 bg-[#F27D26] text-white border-2 border-[#141414] flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_#141414]">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-[#141414] uppercase">
                Intercity Trip Published!
              </h3>
              <p className="text-xs font-bold text-stone-600 max-w-sm mx-auto">
                Saved to offline SQLite{shareToBuzz ? ', shared to Commuter Buzz,' : ''} and synced globally across all devices.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs font-bold">
              {/* Route Selector + Quick Create Route Button */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414]">
                    Intercity Route / Highway Corridor *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCreateRouteOpen(true)}
                    className="px-2 py-0.5 bg-[#141414] hover:bg-[#F27D26] text-white text-[10px] font-black uppercase tracking-wider border border-[#141414] transition cursor-pointer flex items-center gap-1"
                  >
                    <Layers className="w-3 h-3 text-[#F27D26]" />
                    <span>+ New Route / Corridor</span>
                  </button>
                </div>
                <select
                  id="intercity-route-select"
                  value={selectedRouteId}
                  onChange={(e) => {
                    setSelectedRouteId(e.target.value);
                    const rt = routes.find((r) => r.id === e.target.value);
                    if (rt?.departureHubs[0]) {
                      setDepartureTerminal(rt.departureHubs[0].terminal.split('/')[0].trim());
                    }
                    if (rt?.originCity) setNewCoachCity(rt.originCity);
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

              {/* Bus Operator / Registered Coach Selector */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414]">
                    Select Coach / Registered Fleet *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedOperatorId(
                        selectedOperatorId === 'create_new'
                          ? (operators[0]?.id || 'custom')
                          : 'create_new'
                      )
                    }
                    className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border border-[#141414] transition cursor-pointer flex items-center gap-1 ${
                      selectedOperatorId === 'create_new'
                        ? 'bg-[#F27D26] text-white'
                        : 'bg-[#141414] text-white hover:bg-[#F27D26]'
                    }`}
                  >
                    <Truck className="w-3 h-3" />
                    <span>
                      {selectedOperatorId === 'create_new'
                        ? 'Cancel New Coach'
                        : '+ Create New Coach / Transport'}
                    </span>
                  </button>
                </div>

                <select
                  id="intercity-operator-select"
                  value={selectedOperatorId}
                  onChange={(e) => setSelectedOperatorId(e.target.value)}
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F27D26] shadow-[2px_2px_0px_0px_#141414]"
                >
                  {sortedFleetCoaches.length > 0 && (
                    <optgroup label="Registered Coaches &amp; Fleets (from Transporters)">
                      {sortedFleetCoaches.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.operatorName}
                          {t.vehiclePlate ? ` [${t.vehiclePlate}]` : ''} • {t.transportTypeLabel} ({t.city})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Major Intercity Coach Companies">
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.name} ({op.tier.replace('_', ' ').toUpperCase()})
                      </option>
                    ))}
                  </optgroup>
                  <option value="create_new">+ Register &amp; Create New Coach in Fleets</option>
                  <option value="custom">+ Other Unlisted Bus Name</option>
                </select>

                {/* Inline Create New Coach / Transporter Sub-Form */}
                {selectedOperatorId === 'create_new' && (
                  <div className="mt-2.5 p-3 bg-amber-50 border-2 border-[#141414] shadow-[3px_3px_0px_0px_#141414] space-y-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#141414]">
                      <PlusCircle className="w-3.5 h-3.5 text-[#F27D26]" />
                      <span>Registers Coach Directly to Transporters &amp; Fleets</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-[#141414] mb-0.5">
                          Coach / Fleet Name *
                        </label>
                        <input
                          type="text"
                          value={newCoachName}
                          onChange={(e) => setNewCoachName(e.target.value)}
                          placeholder="e.g. Tamuka Express Coach"
                          required
                          className="w-full p-2 bg-white border-2 border-[#141414] text-xs font-black text-[#141414]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-[#141414] mb-0.5">
                          Fleet Vehicle Type *
                        </label>
                        <select
                          value={newCoachType}
                          onChange={(e) => setNewCoachType(e.target.value as TransporterVehicleType)}
                          className="w-full p-2 bg-white border-2 border-[#141414] text-xs font-black text-[#141414]"
                        >
                          {FLEET_TYPES.map((ft) => (
                            <option key={ft.value} value={ft.value}>
                              {ft.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-[#141414] mb-0.5">
                          Booking Phone / WhatsApp
                        </label>
                        <input
                          type="text"
                          value={newCoachPhone}
                          onChange={(e) => setNewCoachPhone(e.target.value)}
                          placeholder="+263 77..."
                          className="w-full p-2 bg-white border-2 border-[#141414] text-xs font-bold text-[#141414]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-[#141414] mb-0.5">
                          Number Plate
                        </label>
                        <input
                          type="text"
                          value={newCoachPlate}
                          onChange={(e) => setNewCoachPlate(e.target.value)}
                          placeholder="e.g. AGF 4821"
                          className="w-full p-2 bg-white border-2 border-[#141414] text-xs font-black uppercase text-[#141414]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-[#141414] mb-0.5">
                          Base City *
                        </label>
                        <input
                          type="text"
                          value={newCoachCity}
                          onChange={(e) => setNewCoachCity(e.target.value)}
                          placeholder="e.g. Harare"
                          required
                          className="w-full p-2 bg-white border-2 border-[#141414] text-xs font-bold text-[#141414]"
                        />
                      </div>
                    </div>
                  </div>
                )}

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

              {/* Fare Paid Section (3-Currency Switcher) */}
              <div className="space-y-2.5 p-3 bg-[#F5F5F0] border-2 border-[#141414]">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-[#141414]">
                    Currency Paid (USD • ZWG • ZAR)
                  </label>
                  <div className="inline-flex border-2 border-[#141414] bg-white">
                    {(['USD', 'ZWG', 'ZAR'] as DisplayCurrency[]).map((curr) => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => handleCurrencySelect(curr)}
                        className={`px-2.5 py-1 text-[10px] font-black uppercase cursor-pointer transition ${
                          fareCurrency === curr
                            ? 'bg-[#141414] text-[#F27D26]'
                            : 'bg-white text-[#141414] hover:bg-stone-100'
                        }`}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1">
                      Fare Paid ({fareCurrency}) *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-stone-600 font-black text-xs">
                        {fareCurrency === 'USD' ? '$' : fareCurrency === 'ZAR' ? 'R' : 'ZWG'}
                      </span>
                      <input
                        id="intercity-fare-input"
                        type="number"
                        step="0.5"
                        min="1"
                        max="10000"
                        value={fareAmount}
                        onChange={(e) => setFareAmount(e.target.value)}
                        className="w-full pl-11 pr-3 py-2 bg-white border-2 border-[#141414] text-[#141414] font-black text-sm focus:outline-none focus:ring-2 focus:ring-[#F27D26]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1">
                      Multi-Currency Equivalents
                    </label>
                    <div className="py-2 px-2.5 bg-white border-2 border-[#141414] font-black text-[11px] text-[#141414] flex flex-wrap gap-x-2">
                      <span>${convertCurrency(parseFloat(fareAmount) || 0, fareCurrency, 'USD')} USD</span>
                      <span>• ZWG {convertCurrency(parseFloat(fareAmount) || 0, fareCurrency, 'ZWG')}</span>
                      <span>• R{convertCurrency(parseFloat(fareAmount) || 0, fareCurrency, 'ZAR')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {(fareCurrency === 'USD'
                    ? ['10', '12', '15', '18', '20', '25', '30']
                    : fareCurrency === 'ZAR'
                    ? ['180', '250', '300', '360', '450', '550']
                    : ['280', '350', '420', '560', '700', '840']
                  ).map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setFareAmount(amt)}
                      className={`px-2.5 py-1 text-[11px] font-black border-2 border-[#141414] transition cursor-pointer ${
                        fareAmount === amt ? 'bg-[#141414] text-white' : 'bg-white text-[#141414] hover:bg-stone-100'
                      }`}
                    >
                      {fareCurrency === 'USD' ? `$${amt}` : fareCurrency === 'ZAR' ? `R${amt}` : `ZWG ${amt}`}
                    </button>
                  ))}
                </div>
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

              {/* Share to Commuter Buzz Option */}
              <label className="flex items-center gap-2.5 p-2.5 bg-[#F5F5F0] border-2 border-[#141414] cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareToBuzz}
                  onChange={(e) => setShareToBuzz(e.target.checked)}
                  className="w-4 h-4 accent-[#F27D26] cursor-pointer"
                />
                <Share2 className="w-4 h-4 text-[#F27D26] flex-shrink-0" />
                <span className="text-[11px] font-black uppercase text-[#141414]">
                  Also share this trip, fare &amp; departure to Commuter Buzz
                </span>
              </label>

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
                  Publish Intercity Trip &amp; Fare
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Nested Route Creator Modal */}
      <CreateIntercityRouteModal
        isOpen={isCreateRouteOpen}
        onClose={() => setIsCreateRouteOpen(false)}
        onCreated={handleRouteCreated}
      />
    </>
  );
};
