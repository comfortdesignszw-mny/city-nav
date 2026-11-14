import React, { useState } from 'react';
import { X, Truck, Check, Bus } from 'lucide-react';
import { useOfflineStore } from '../hooks/useOfflineStore';
import { TransporterProfile, TransporterVehicleType } from '../types';

interface CreateCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (transporter: TransporterProfile) => void;
}

const COACH_TYPES: { value: TransporterVehicleType; label: string }[] = [
  { value: 'long_distance_coach', label: 'Long Distance Coach' },
  { value: 'cross_border_quantum', label: 'Cross-Border Quantum' },
  { value: 'sprinter', label: 'Sprinter (22 Seater)' },
  { value: 'hiace_combi', label: 'HiAce (Combi)' },
];

export const CreateCoachModal: React.FC<CreateCoachModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const store = useOfflineStore();
  const intercityRoutes = store.getIntercityRoutes();

  const [operatorName, setOperatorName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [transportType, setTransportType] = useState<TransporterVehicleType>('long_distance_coach');
  const [routeId, setRouteId] = useState(intercityRoutes[0]?.id || '');
  const [customRouteName, setCustomRouteName] = useState('');
  const [city, setCity] = useState('Harare');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [baseTerminus, setBaseTerminus] = useState('Harare Roadport Terminal');
  const [statusNote, setStatusNote] = useState('');
  const [savedFleet, setSavedFleet] = useState<TransporterProfile | null>(null);

  if (!isOpen) return null;

  const selectedRoute = intercityRoutes.find((r) => r.id === routeId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorName.trim() || !contactPhone.trim()) return;

    const typeLabel = COACH_TYPES.find((t) => t.value === transportType)?.label || 'Long Distance Coach';
    const routeName = customRouteName.trim() || selectedRoute?.name || 'Intercity Highway Corridor';

    const created = store.registerTransporter({
      operatorName: operatorName.trim(),
      contactPhone: contactPhone.trim(),
      transportType,
      transportTypeLabel: typeLabel,
      currentRouteName: routeName,
      currentRouteId: routeId || undefined,
      city: city.trim() || 'Harare',
      vehiclePlate: vehiclePlate.trim() || undefined,
      baseTerminus: baseTerminus.trim() || undefined,
      statusNote: statusNote.trim() || undefined,
    });

    setSavedFleet(created);
    setTimeout(() => {
      setSavedFleet(null);
      setOperatorName('');
      setContactPhone('');
      setVehiclePlate('');
      setStatusNote('');
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
        <div className="bg-[#141414] text-white p-4 sm:p-5 flex items-start justify-between flex-shrink-0 border-b-2 border-[#141414]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#F27D26] text-white border-2 border-white flex items-center justify-center font-black shadow-[2px_2px_0px_0px_#ffffff]">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-[#F27D26]">
                Syncs with Transporters &amp; Vehicle Fleets
              </div>
              <h2 className="text-lg sm:text-xl font-black uppercase text-white tracking-tight">
                Register New Coach / Fleet
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

        {savedFleet ? (
          <div className="p-8 text-center space-y-3 bg-[#F5F5F0]">
            <div className="w-14 h-14 bg-[#141414] text-[#F27D26] border-2 border-[#141414] flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_#F27D26]">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-[#141414] uppercase">Coach Fleet Registered!</h3>
            <p className="text-xs font-bold text-stone-600 max-w-sm mx-auto">
              <strong>{savedFleet.operatorName}</strong> is now live in both Transporters &amp; Vehicle Fleets and the Intercity Trip Creator.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-3.5 text-xs font-bold">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Coach / Operator Name *
                </label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="e.g. Munorwa Luxury Coach"
                  required
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-black focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Fleet Vehicle Type *
                </label>
                <select
                  value={transportType}
                  onChange={(e) => setTransportType(e.target.value as TransporterVehicleType)}
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-black focus:bg-white focus:outline-none"
                >
                  {COACH_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Booking Phone / WhatsApp *
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. +263 77 123 4567"
                  required
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-black focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Number Plate (Optional)
                </label>
                <input
                  type="text"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  placeholder="e.g. AGF 4821"
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-black uppercase focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                Primary Intercity Corridor *
              </label>
              <select
                value={routeId}
                onChange={(e) => {
                  setRouteId(e.target.value);
                  const rt = intercityRoutes.find((r) => r.id === e.target.value);
                  if (rt) {
                    setCity(rt.originCity);
                    if (rt.departureHubs[0]) setBaseTerminus(rt.departureHubs[0].terminal);
                  }
                }}
                className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-black focus:bg-white focus:outline-none"
              >
                {intercityRoutes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} ({rt.highwayCode})
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={customRouteName}
                onChange={(e) => setCustomRouteName(e.target.value)}
                placeholder="Or enter custom route name (optional)..."
                className="w-full mt-2 p-2 bg-white border-2 border-[#141414] text-[#141414] font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Base City *
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                  Boarding Terminus / Bay
                </label>
                <input
                  type="text"
                  value={baseTerminus}
                  onChange={(e) => setBaseTerminus(e.target.value)}
                  placeholder="e.g. Roadport Bay 6"
                  className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#141414] mb-1">
                Schedule / Fleet Note (Optional)
              </label>
              <input
                type="text"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="e.g. Daily 06:30 AM & 14:00 PM luxury departures, USB & Wi-Fi"
                className="w-full p-2.5 bg-[#F5F5F0] border-2 border-[#141414] text-[#141414] font-bold"
              />
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
                <Bus className="w-4 h-4" />
                <span>Register Coach in Fleets</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
