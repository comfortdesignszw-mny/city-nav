import React, { useState } from 'react';
import { 
  X, 
  PlusCircle, 
  Bus, 
  MapPin, 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  Car, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import { Currency, RouteCategory, StatusType } from '../types';

interface AddRouteFareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRouteAdded?: (routeId: string) => void;
  initialCity?: string;
}

const VEHICLE_TYPES = [
  { id: 'kombi_15', label: 'Toyota HiAce Kombi (15-seater)', short: 'HiAce Kombi' },
  { id: 'coaster_minibus', label: 'Minibus / Coaster (18–24 seater)', short: 'Coaster Minibus' },
  { id: 'zupco_bus', label: 'ZUPCO Conventional Big Bus (65–75 seater)', short: 'ZUPCO Big Bus' },
  { id: 'mushikashika_sedan', label: 'Mushikashika (Toyota Wish / Sienta / Ipsum)', short: 'Mushikashika (Wish)' },
  { id: 'shared_sedan', label: 'Shared Station Wagon / Probox / Sedan', short: 'Shared Sedan' },
  { id: 'metered_taxi', label: 'Metered City Taxi / Cab', short: 'Metered Taxi' },
  { id: 'intercity_coach', label: 'Intercity Coach (CAG, Inter Africa, City Link)', short: 'Intercity Coach' },
];

const DEPARTURE_STATUSES = [
  'Loading right now (Filling fast)',
  'Departing in 5–10 mins',
  'Full & Leaving right now',
  'Continuous high-frequency loading',
  'Long queue / Slow loading at rank',
];

const CITIES = [
  'Harare',
  'Bulawayo',
  'Chitungwiza',
  'Gweru',
  'Mutare',
  'Kwekwe',
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

export const AddRouteFareModal: React.FC<AddRouteFareModalProps> = ({
  isOpen,
  onClose,
  onRouteAdded,
  initialCity = 'Harare',
}) => {
  const store = useOfflineStore();
  const existingRanks = store.getRanks();

  const [routeName, setRouteName] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [city, setCity] = useState(initialCity === 'All Cities' ? 'Harare' : initialCity);
  const [category, setCategory] = useState<RouteCategory>('cbd_location');
  const [selectedRankId, setSelectedRankId] = useState<string>('');
  const [customRankName, setCustomRankName] = useState('');
  const [distanceKm, setDistanceKm] = useState('');

  // Transport carrying passengers right now
  const [transportType, setTransportType] = useState(VEHICLE_TYPES[0].label);

  // Live Fare
  const [fareAmount, setFareAmount] = useState('1.00');
  const [currency, setCurrency] = useState<Currency>('USD');

  // Departure Time & Status
  const [departureStatus, setDepartureStatus] = useState(DEPARTURE_STATUSES[0]);
  const [statusType, setStatusType] = useState<StatusType>('running');
  const [commuterNote, setCommuterNote] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  // Filter ranks for the selected city
  const cityRanks = existingRanks.filter(
    (r) => (r.city || '').toLowerCase() === city.toLowerCase()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!origin.trim() || !destination.trim()) {
      alert('Please provide both an origin and a destination.');
      return;
    }

    const numFare = parseFloat(fareAmount);
    if (isNaN(numFare) || numFare <= 0) {
      alert('Please enter a valid fare amount.');
      return;
    }

    setIsSubmitting(true);

    const generatedName = routeName.trim() || `${origin.trim()} ⇄ ${destination.trim()}`;
    const rankIdsToAssign: string[] = [];
    if (selectedRankId && selectedRankId !== 'custom') {
      rankIdsToAssign.push(selectedRankId);
    }

    const result = store.addRouteWithFare({
      name: generatedName,
      origin: origin.trim(),
      destination: destination.trim(),
      city,
      category,
      distanceKm: distanceKm ? parseFloat(distanceKm) : undefined,
      rankIds: rankIdsToAssign,
      transportType,
      fareAmount: numFare,
      currency,
      departureStatus,
      statusType,
      note: commuterNote.trim() || undefined,
    });

    setSuccessMessage(`Route "${generatedName}" and live fare added successfully!`);
    setIsSubmitting(false);

    setTimeout(() => {
      onRouteAdded?.(result.route.id);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border-4 border-[#141414] shadow-[8px_8px_0px_0px_#F27D26] max-w-xl w-full p-4 sm:p-6 text-[#141414] space-y-4 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-[#141414] pb-3">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-black uppercase tracking-widest bg-[#141414] text-white px-2 py-0.5">
                Crowdsource Dispatch
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#F27D26]">
                Offline-First Queue
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#141414] flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#F27D26]" />
              Add Route &amp; Live Passenger Fare
            </h3>
            <p className="text-xs font-medium text-stone-600">
              Report the route, current transport type loading right now, and live commuter fare.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-[#141414] p-1 border border-stone-300 hover:border-[#141414] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMessage ? (
          <div className="p-6 bg-emerald-50 border-2 border-[#141414] text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="text-base font-black uppercase text-[#141414]">
              Entry Published
            </h4>
            <p className="text-xs font-bold text-stone-600">{successMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold">
            {/* City & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  City / Town *
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] font-black text-xs uppercase focus:bg-white focus:outline-none"
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Route Corridor Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as RouteCategory)}
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] font-black text-xs uppercase focus:bg-white focus:outline-none"
                >
                  <option value="cbd_location">CBD ⇄ Location / Suburb</option>
                  <option value="near_town">Near-Town Commuter Corridor</option>
                  <option value="inter_city">Intercity Highway</option>
                </select>
              </div>
            </div>

            {/* Origin & Destination */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Origin / Departure Point *
                </label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="e.g. Kuwadzana 4 / Makoni"
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] font-bold text-xs focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Destination / Drop-off *
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Copacabana Rank / Egodini"
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] font-bold text-xs focus:bg-white focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Custom Route Display Name (Optional) */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1">
                Route Display Name (Optional)
              </label>
              <input
                type="text"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder={origin && destination ? `${origin} ⇄ ${destination}` : 'e.g. Kuwadzana–Copacabana Express'}
                className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] font-bold text-xs focus:bg-white focus:outline-none"
              />
            </div>

            {/* Boarding Rank / Terminus */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Primary Boarding Rank
                </label>
                <select
                  value={selectedRankId}
                  onChange={(e) => setSelectedRankId(e.target.value)}
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] font-bold text-xs focus:bg-white focus:outline-none"
                >
                  <option value="">-- Choose Boarding Terminus --</option>
                  {cityRanks.map((rnk) => (
                    <option key={rnk.id} value={rnk.id}>{rnk.name}</option>
                  ))}
                  <option value="custom">+ Other / Custom Spot</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Approx. Distance (km)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  placeholder="e.g. 14.5"
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] font-bold text-xs focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Transport Type Carrying Passengers RIGHT NOW */}
            <div className="p-3 bg-stone-100 border-2 border-[#141414]">
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1.5 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>Transport Type Carrying Passengers on Current Time *</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VEHICLE_TYPES.map((v) => {
                  const isSelected = transportType === v.label;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setTransportType(v.label)}
                      className={`p-2 text-left border-2 transition cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? 'bg-[#141414] text-white border-[#141414] shadow-[2px_2px_0px_0px_#F27D26]' 
                          : 'bg-white text-[#141414] border-stone-300 hover:border-[#141414]'
                      }`}
                    >
                      <span className="text-[11px] font-black uppercase truncate">{v.short}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#F27D26] flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Fare & Currency */}
            <div className="p-3 bg-[#F5F5F0] border-2 border-[#141414]">
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>Current Fare Charged *</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrency('USD')}
                    className={`flex-1 py-2 text-xs font-black uppercase border-2 border-[#141414] transition cursor-pointer ${
                      currency === 'USD' ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]' : 'bg-white text-[#141414]'
                    }`}
                  >
                    USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('ZWL')}
                    className={`flex-1 py-2 text-xs font-black uppercase border-2 border-[#141414] transition cursor-pointer ${
                      currency === 'ZWL' ? 'bg-[#141414] text-white shadow-[2px_2px_0px_0px_#F27D26]' : 'bg-white text-[#141414]'
                    }`}
                  >
                    ZiG (ZWL)
                  </button>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-black text-xs">
                    {currency === 'USD' ? '$' : 'ZiG'}
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={fareAmount}
                    onChange={(e) => setFareAmount(e.target.value)}
                    placeholder="1.00"
                    className="w-full pl-10 pr-3 py-2 bg-white border-2 border-[#141414] font-black text-sm focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex gap-1.5 mt-2 overflow-x-auto">
                {(currency === 'USD' ? ['0.50', '0.75', '1.00', '1.50', '2.00'] : ['14', '20', '28', '42', '55']).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFareAmount(val)}
                    className="px-2.5 py-1 bg-white border border-[#141414] text-[10px] font-black hover:bg-[#F27D26] hover:text-white transition cursor-pointer"
                  >
                    {currency === 'USD' ? `$${val}` : `${val} ZiG`}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Departure / Loading Time Status */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>Current Departure &amp; Loading Status *</span>
              </label>
              <select
                value={departureStatus}
                onChange={(e) => setDepartureStatus(e.target.value)}
                className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] font-black text-xs focus:bg-white focus:outline-none"
              >
                {DEPARTURE_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Road Alert / Conditions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Roadway Flow
                </label>
                <select
                  value={statusType}
                  onChange={(e) => setStatusType(e.target.value as StatusType)}
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] font-black text-xs focus:bg-white focus:outline-none"
                >
                  <option value="running">Smooth / Running Normally</option>
                  <option value="police_blitz">Police Blitz / Roadblock</option>
                  <option value="delayed">Heavy Rank Queues</option>
                  <option value="fuel_shortage">Fuel Shortage / Low Vehicles</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Commuter Note (Optional)
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={commuterNote}
                  onChange={(e) => setCommuterNote(e.target.value)}
                  placeholder="e.g. Loading at bay 3, smooth flow"
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] font-bold text-xs focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="border-t-2 border-[#141414] pt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#F5F5F0] hover:bg-stone-200 text-[#141414] text-xs font-black uppercase tracking-wider border-2 border-[#141414] transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#141414] hover:bg-[#F27D26] text-white text-xs font-black uppercase tracking-wider border-2 border-[#141414] shadow-[3px_3px_0px_0px_#F27D26] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4 text-[#F27D26]" />
                <span>{isSubmitting ? 'Publishing...' : 'Publish Live Route & Fare'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
