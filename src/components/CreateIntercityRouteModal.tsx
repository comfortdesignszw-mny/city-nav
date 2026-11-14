import React, { useState } from 'react';
import { X, Layers, MapPin, Navigation, Check, PlusCircle } from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import { DisplayCurrency, IntercityRoute } from '../types';
import { convertCurrency } from '../utils/formatters';

interface CreateIntercityRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (route: IntercityRoute) => void;
}

const HIGHWAY_PRESETS = [
  'A1 (Harare – Chirundu)',
  'A2 (Harare – Nyamapanda)',
  'A3 (Harare – Mutare)',
  'A4 (Harare – Beitbridge)',
  'A5 (Harare – Bulawayo)',
  'A8 (Bulawayo – Victoria Falls)',
  'A7 (Bulawayo – Plumtree)',
  'Regional / Provincial Highway',
];

const HUB_SUGGESTIONS = [
  'Harare',
  'Bulawayo',
  'Mutare',
  'Gweru',
  'Masvingo',
  'Kwekwe',
  'Kadoma',
  'Chinhoyi',
  'Beitbridge',
  'Victoria Falls',
  'Hwange',
  'Kariba',
  'Bindura',
  'Marondera',
  'Rusape',
  'Chipinge',
  'Chiredzi',
  'Zvishavane',
  'Plumtree',
  'Nyanga',
];

export const CreateIntercityRouteModal: React.FC<CreateIntercityRouteModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const store = useOfflineStore();

  const [originCity, setOriginCity] = useState<string>('Harare');
  const [destinationCity, setDestinationCity] = useState<string>('Gweru');
  const [customName, setCustomName] = useState<string>('');
  const [highwayCode, setHighwayCode] = useState<string>('A5 (Harare – Bulawayo)');
  const [distanceKm, setDistanceKm] = useState<string>('275');
  const [estimatedHours, setEstimatedHours] = useState<string>('4');
  const [keyStopsText, setKeyStopsText] = useState<string>('Norton, Chegutu, Kadoma, Kwekwe');
  const [originTerminal, setOriginTerminal] = useState<string>('Harare Roadport / Mbare Musika');
  const [destTerminal, setDestTerminal] = useState<string>('Gweru Main Terminus');
  const [fareCurrency, setFareCurrency] = useState<DisplayCurrency>('USD');
  const [fareMin, setFareMin] = useState<string>('10');
  const [fareMax, setFareMax] = useState<string>('15');
  const [savedRoute, setSavedRoute] = useState<IntercityRoute | null>(null);

  if (!isOpen) return null;

  const effectiveName = customName.trim() || `${originCity.trim()} to ${destinationCity.trim()}`;

  const handleCurrencyChange = (next: DisplayCurrency) => {
    const minNum = parseFloat(fareMin) || 10;
    const maxNum = parseFloat(fareMax) || 15;
    setFareMin(String(convertCurrency(minNum, fareCurrency, next)));
    setFareMax(String(convertCurrency(maxNum, fareCurrency, next)));
    setFareCurrency(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!originCity.trim() || !destinationCity.trim()) return;

    const minUsd = Math.max(1, convertCurrency(parseFloat(fareMin) || 10, fareCurrency, 'USD'));
    const maxUsd = Math.max(minUsd, convertCurrency(parseFloat(fareMax) || minUsd, fareCurrency, 'USD'));
    const stops = keyStopsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const hubs: { city: string; terminal: string }[] = [];
    if (originTerminal.trim()) {
      hubs.push({ city: originCity.trim(), terminal: originTerminal.trim() });
    }
    if (destTerminal.trim()) {
      hubs.push({ city: destinationCity.trim(), terminal: destTerminal.trim() });
    }

    const created = store.addIntercityRoute({
      name: effectiveName,
      originCity: originCity.trim(),
      destinationCity: destinationCity.trim(),
      highwayCode: highwayCode.trim() || 'Highway Corridor',
      distanceKm: Math.max(1, parseFloat(distanceKm) || 100),
      estimatedDurationHours: Math.max(0.5, parseFloat(estimatedHours) || 2),
      keyStops: stops.length > 0 ? stops : [originCity.trim(), destinationCity.trim()],
      departureHubs: hubs,
      fareMinUSD: minUsd,
      fareMaxUSD: maxUsd,
    });

    setSavedRoute(created);
    setTimeout(() => {
      setSavedRoute(null);
      if (onCreated) onCreated(created);
      onClose();
    }, 900);
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
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-[#F27D26]">
                Expand Zimbabwe Transit Map
              </div>
              <h2 className="text-lg sm:text-xl font-black uppercase text-white tracking-tight">
                Create Intercity Route / Corridor
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

        {savedRoute ? (
          <div className="p-8 text-center space-y-3 bg-[#F5F5F0]">
            <div className="w-14 h-14 bg-[#141414] text-[#F27D26] border-2 border-[#141414] flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_#F27D26]">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-[#141414] uppercase">
              Corridor Added!
            </h3>
            <p className="text-xs font-bold text-stone-600 max-w-sm mx-auto">
              <strong>{savedRoute.name}</strong> ({savedRoute.highwayCode}) is now saved offline and queued to sync globally across all devices.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs font-bold">
            {/* Origin & Destination */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Origin City / Town *
                </label>
                <input
                  type="text"
                  list="ic-city-suggestions"
                  value={originCity}
                  onChange={(e) => setOriginCity(e.target.value)}
                  placeholder="e.g. Harare"
                  required
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-black focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_#141414]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Destination City / Town *
                </label>
                <input
                  type="text"
                  list="ic-city-suggestions"
                  value={destinationCity}
                  onChange={(e) => setDestinationCity(e.target.value)}
                  placeholder="e.g. Kariba, Chiredzi, Mutare"
                  required
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-black focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_#141414]"
                />
              </div>
              <datalist id="ic-city-suggestions">
                {HUB_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            {/* Route Name */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                Corridor / Route Display Name
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={`${originCity || 'Origin'} to ${destinationCity || 'Destination'}`}
                className="w-full p-2.5 bg-white border-2 border-[#141414] text-[#141414] font-black focus:outline-none shadow-[2px_2px_0px_0px_#141414]"
              />
            </div>

            {/* Highway Code, Distance & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Highway Code *
                </label>
                <input
                  type="text"
                  list="ic-highway-presets"
                  value={highwayCode}
                  onChange={(e) => setHighwayCode(e.target.value)}
                  placeholder="e.g. A5 Highway"
                  required
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-black focus:bg-white focus:outline-none"
                />
                <datalist id="ic-highway-presets">
                  {HIGHWAY_PRESETS.map((h) => (
                    <option key={h} value={h} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Distance (km) *
                </label>
                <input
                  type="number"
                  min="5"
                  max="5000"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  required
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-black focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Est. Transit (hrs) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="100"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  required
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-black focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Key Stops */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                Key Highway Stops (comma separated)
              </label>
              <input
                type="text"
                value={keyStopsText}
                onChange={(e) => setKeyStopsText(e.target.value)}
                placeholder="e.g. Norton, Chegutu, Kadoma, Kwekwe"
                className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-bold focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_#141414]"
              />
            </div>

            {/* Departure Hubs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  {originCity || 'Origin'} Boarding Terminus *
                </label>
                <input
                  type="text"
                  value={originTerminal}
                  onChange={(e) => setOriginTerminal(e.target.value)}
                  placeholder="e.g. Roadport / Mbare Musika"
                  required
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-bold focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  {destinationCity || 'Destination'} Terminus
                </label>
                <input
                  type="text"
                  value={destTerminal}
                  onChange={(e) => setDestTerminal(e.target.value)}
                  placeholder="e.g. Main Terminus / Rank"
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-bold focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Typical Fare Range */}
            <div className="p-3 bg-[#F5F5F0] border-2 border-[#141414] space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-[#141414]">
                  Typical Corridor Fare Range ({fareCurrency})
                </label>
                <div className="inline-flex border-2 border-[#141414] bg-white">
                  {(['USD', 'ZWG', 'ZAR'] as DisplayCurrency[]).map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => handleCurrencyChange(curr)}
                      className={`px-2 py-0.5 text-[10px] font-black uppercase cursor-pointer transition ${
                        fareCurrency === curr ? 'bg-[#141414] text-[#F27D26]' : 'bg-white text-[#141414]'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-stone-600 mb-1">
                    Min Fare ({fareCurrency})
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={fareMin}
                    onChange={(e) => setFareMin(e.target.value)}
                    required
                    className="w-full p-2 bg-white border-2 border-[#141414] font-black text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-stone-600 mb-1">
                    Max Fare ({fareCurrency})
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={fareMax}
                    onChange={(e) => setFareMax(e.target.value)}
                    required
                    className="w-full p-2 bg-white border-2 border-[#141414] font-black text-[#141414]"
                  />
                </div>
              </div>
            </div>

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
                className="flex-2 py-3 bg-[#141414] hover:bg-[#F27D26] text-white border-2 border-[#141414] text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-[3px_3px_0px_0px_#F27D26] flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Save Corridor to List</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
